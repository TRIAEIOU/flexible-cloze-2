import re
import os
from typing import Dict, Tuple
from aqt import mw, QPushButton, QMessageBox
from aqt.qt import *
from anki.models import NotetypeDict
from anki.hooks import addHook

FCZ_NAME = "Flexible Cloze"
FCZ_BTAG = "FCZ2 BEGIN"
FCZ_ETAG = "FCZ2 END"
FUNC_BTAG = "FUNCTIONALITY BEGIN"
FUNC_ETAG = "FUNCTIONALITY END"
STYLE_BTAG = "STYLE BEGIN"
STYLE_ETAG = "STYLE END"
FNAME_FRONT = "fcz-front.html"
FNAME_BACK = "fcz-back.html"
FNAME_CSS = "fcz.css"
ADDON_PATH = os.path.dirname(__file__)


def load_file() -> Tuple:
    with open(os.path.join(ADDON_PATH, FNAME_FRONT)) as fh:
        front = fh.read()
    with open(os.path.join(ADDON_PATH, FNAME_BACK)) as fh:
        back = fh.read()
    with open(os.path.join(ADDON_PATH, FNAME_CSS)) as fh:
        css = fh.read()
    return (front, back, css)


def backup_file(front:str, back:str, css:str):
    with open(os.path.join(ADDON_PATH, f"{FNAME_FRONT}.bak"), "w") as fh:
        fh.write(front)
    with open(os.path.join(ADDON_PATH, f"{FNAME_BACK}.bak"), "w") as fh:
        fh.write(back)
    with open(os.path.join(ADDON_PATH, f"{FNAME_CSS}.bak"), "w") as fh:
        fh.write(css)


def clear_update():
    os.remove(os.path.join(ADDON_PATH, "update"))


def parse_tag(text:str, btag:str, etag:str) -> Dict:
    pattern = fr"(.*?)(((<!--|\/\*--)\s+{btag}(\s+\[(.*?)\])?\s+(-->|--\*\/))(.*?)((<!--|\/\*--)\s+{etag}\s+(-->|--\*\/)))(.*)"
    match = re.match(pattern, text, flags = re.S)
    if not match:
        return None
    return {"pre": match.group(1), "tag": match.group(2), "post": match.group(12),
        "btag": match.group(3), "ver": match.group(6), "content": match.group(8), "etag": match.group(9)}


def build_mix_page(pre: str, ctag: str, ntag: str, post: str) -> str:
    def parse_parts(tag: str) -> Dict:
        outer = parse_tag(tag, FCZ_BTAG, FCZ_ETAG)
        func = parse_tag(outer['content'], FUNC_BTAG, FUNC_ETAG)
        if not func:
            func = {"tag": ""}
        style = parse_tag(outer['content'], STYLE_BTAG, STYLE_ETAG)
        if not style:
            style = {"tag": ""}
        return {"btag": outer['btag'], "func": func['tag'], "style": style['tag'], "etag": outer['etag']}

    cparts = parse_parts(ctag)
    nparts = parse_parts(ntag)
    return f"{pre}{nparts['btag']}\n{nparts['func']}\n{cparts['style']}\n{nparts['etag']}{post}"


def update():
    (nfront, nback, ncss) = load_file()
    model = mw.col.models.by_name(FCZ_NAME)

    ###################################################################
    # Initial install, not updgrade
    if not model:
        mw.col.models.add_dict({"vers": [], "name": FCZ_NAME, "tags": [], "did": 1, "usn": -1, "flds": [
                {"name": "Title", "media": [], "sticky": False, "rtl": False, "ord": 0,  "font": "Arial", "size": 20},
                {"name": "Text", "media": [], "sticky": False, "rtl": False, "ord": 1,  "font": "Arial", "size": 20},
                {"name": "Note", "media": [], "sticky": False, "rtl": False, "ord": 2,  "font": "Arial", "size": 20},
                {"name": "Mnemonics", "media": [], "sticky": False, "rtl": False, "ord": 3,  "font": "Arial", "size": 20},
                {"name": "Extra", "media": [], "sticky": False, "rtl": False, "ord": 4,  "font": "Arial", "size": 20}
            ], "sortf":0, "tmpls": [
                {"name": FCZ_NAME, "qfmt": nfront, "did": None, "bafmt": "", "afmt": nback, "ord": 0, "bqfmt": ""}
            ],
            "mod": 0, "latexPre": r"""\documentclass[12pt]{article}
            \special{papersize=3in,5in}
            \usepackage[utf8]{inputenc}
            \usepackage{amssymb,amsmath}
            \pagestyle{empty}
            \setlength{\parindent}{0in}
            \begin{document}
            """, "latexPost": r"\end{document}", "type": 1, "id": 0, "css": ncss})
        clear_update()

    ###################################################################
    # Existing install - upgrade
    else:
        # Parse existing install
        cfront = model["tmpls"][0]["qfmt"]
        cback = model["tmpls"][0]["afmt"]
        ccss = model["css"]

        cfront_parts = parse_tag(cfront, FCZ_BTAG, FCZ_ETAG)
        cback_parts = parse_tag(cback, FCZ_BTAG, FCZ_ETAG)
        ccss_parts = parse_tag(ccss, FCZ_BTAG, FCZ_ETAG)

        # Failed to parse existing install
        if not (cfront_parts and cback_parts and ccss_parts):
            ans = QMessageBox.critical(mw, 'FCZ update error - overwrite current template?', f'''<div style="text-align: left">Current "Flexible cloze" card template corrupt.
            <ul><li>Press "Yes" to completely overwrite current template (temporary backups created in add-on folder).</li>
            <li>Press "No" to manually correct template from add-on folder.</li>
            <li>Press "Cancel" to delay update attempt (the update dialog will resume next Anki restart).</li></ul></div>''', QMessageBox.Yes | QMessageBox.No | QMessageBox.Cancel)
            if ans == QMessageBox.Yes:
                model["tmpls"][0]["qfmt"] = nfront
                model["tmpls"][0]["afmt"] = nback
                model["css"] = ncss
                mw.col.models.update(model)
                backup_file(cfront, cback, ccss)
                clear_update()
            elif ans == QMessageBox.No:
                clear_update()

        # Existing install valid
        else:
            nfront_parts = parse_tag(nfront, FCZ_BTAG, FCZ_ETAG)
            nback_parts = parse_tag(nback, FCZ_BTAG, FCZ_ETAG)
            ncss_parts = parse_tag(ncss, FCZ_BTAG, FCZ_ETAG)

            update_msg = f"""Flexible Cloze update may include both changes in functionality and styling.
            <ul><li>Select "All" to completely overwrite the Flexible Cloze template, erasing all personal modifications (temporary backups created in add-on folder).</li>
            <li>Select "Functionality & styling" to update both functionality and styling, overwriting any personal changes inside "FCZ 1632356464 BEGIN/END" tags (temporary backups created in add-on folder).</li>
            <li>Select "Functionality only" to only install functionality updates, overwriting any personal changes inside "FUNCTIONALITY BEGIN/END" tags but leaving content inside "STYLE BEGIN/END" tags intact (temporary backups created in add-on folder).</li>
            <li>Select "None" to manually implement updates from the source files in the add-on directory (fcz-front.html, fcz-back.html, fcz.css).</li>
            <li>Select "Cancel" to delay update until next Anki start (for instance, to copy a personalized template to another name).</li></ul>"""

            #####################################################################
            # Version specific updates
            ver_msg = "" # Version specific message(s) as <li>'s

            # On back strip out {{FrontSide}} from outside tags from < 1.7 versions
            if float(cback_parts['ver']) < 1.7:
                cback_parts['pre'] = cback_parts['pre'].replace('{{FrontSide}}', '')
                cback_parts['post'] = cback_parts['post'].replace('{{FrontSide}}', '')

            if ver_msg:
                update_msg = f'''{update_msg}<br><b>IMPORTANT - VERSION SPECIFIC UPDATES</b><ul>{ver_msg}</ul>'''


            # Update dialog
            msg_box = QMessageBox(mw)
            msg_box.setWindowTitle("Flexible Cloze update")
            msg_box.setText(f'<div style="text-align: left;">{update_msg}</div>')

            ALL = 0
            msg_box.addButton(QPushButton('All'), QMessageBox.YesRole)
            FUNC_STYLE = 1
            msg_box.addButton(QPushButton('Functionality && Styling'), QMessageBox.YesRole)
            FUNC = 2
            msg_box.addButton(QPushButton('Functionality only'), QMessageBox.YesRole)
            NONE = 3
            msg_box.addButton(QPushButton('None'), QMessageBox.NoRole)
            CANCEL = 4
            msg_box.addButton(QPushButton('Cancel'), QMessageBox.RejectRole)
            scope = msg_box.exec()

            if scope == CANCEL:
                return

            if scope == NONE:
                clear_update()
                return

            if scope == FUNC:
                nfront = build_mix_page(cfront_parts['pre'], cfront_parts['tag'], nfront_parts['tag'], cfront_parts['post'])
                nback = build_mix_page(cback_parts['pre'], cback_parts['tag'], nback_parts['tag'], cback_parts['post'])
                ncss = build_mix_page(ccss_parts['pre'], ccss_parts['tag'], ncss_parts['tag'], ccss_parts['post'])
            elif scope == FUNC_STYLE:
                nfront = f"{cfront_parts['pre']}{nfront_parts['tag']}{cfront_parts['post']}"
                nback = f"{cback_parts['pre']}{nback_parts['tag']}{cback_parts['post']}"
                ncss = f"{ccss_parts['pre']}{ncss_parts['tag']}{ccss_parts['post']}"

            model["tmpls"][0]["qfmt"] = nfront
            model["tmpls"][0]["afmt"] = nback
            model["css"] = ncss
            mw.col.models.update(model)
            backup_file(cfront, cback, ccss)
            clear_update()


if os.path.isfile(os.path.join(os.path.dirname(__file__), "update")):
    addHook("profileLoaded", update)
