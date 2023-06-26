"""Installation/update of template"""

import os, codecs
from datetime import datetime
from aqt import mw, QPushButton, QMessageBox, gui_hooks
from aqt.utils import *
from aqt.qt import *
from .ankiutils import *

FC2_NAME = "Flexible Cloze 2"
FNAME_FRONT = "fc2-front.html"
FNAME_BACK = "fc2-back.html"
FNAME_CSS = "fc2.css"
FC2_MIN_NAME = "Flexible Cloze 2 (min)"
FNAME_MIN_FRONT = "fc2m-front.html"
FNAME_MIN_BACK = "fc2m-back.html"
FNAME_MIN_CSS = "fc2m.css"
ADDON_PATH = os.path.dirname(__file__)
TAG_CFG = ('<!-- CONFIGURATION BEGIN -->', '<!-- CONFIGURATION END -->')
TAG_FUNC = "<!-- FC2 FUNCTIONALITY - DO NOT EDIT BELOW THIS POINT -->"
TAG_CSS_FUNC = "/*-- FC2 FUNCTIONALITY END --*/"

CVER = get_version()
NVER = "1.2.6"

#######################################################################
# Current code base
def load_files(files: tuple[str, ...]):
    out = []
    for file in files:
        with codecs.open(os.path.join(ADDON_PATH, file), encoding='utf-8') as fh:
            tmp = fh.read()
            out.append(tmp)
    return out

def backup_files(files: tuple[str, ...]):
    path = os.path.join(ADDON_PATH, 'user_files')
    os.makedirs(path, exist_ok=True)
    for file in files:
        with codecs.open(os.path.join(path, f"{file[0]}-{datetime.fromtimestamp(datetime.now().timestamp()).strftime('%Y.%m.%d-%H.%M.%S')}.bak"), mode="w", encoding='utf-8') as fh:
            fh.write(file[1])

def update_model(model, col, nfront, nback, ncss):
    msgs = []

    nfront = nfront.split(TAG_FUNC)[1].strip()
    ofront = model["tmpls"][0]["qfmt"].split(TAG_FUNC)[0].strip()
    model["tmpls"][0]["qfmt"] = fr"""{ofront}

    {TAG_FUNC}
    {nfront}
    """

    nback = nback.split(TAG_FUNC)[1].strip()
    oback = model["tmpls"][0]["afmt"].split(TAG_FUNC)[0]
    model["tmpls"][0]["afmt"] = fr"""{oback}

    {TAG_FUNC}
    {nback}
    """

    ncss = ncss.split(TAG_CSS_FUNC)[0].strip()
    ocss = model['css'].split(TAG_CSS_FUNC)[1]
    model["css"] = fr"""{ncss}
    {TAG_CSS_FUNC}

    {ocss}
    """

    col.models.update(model)
    return msgs

def create_model(col, name, front, back, css):
    """Add regular model from parameters"""
    col.models.add_dict({"vers": [], "name": name, "tags": [], "did": 1, "usn": -1, "flds": [
            {"name": "Title", "media": [], "sticky": False, "rtl": False, "ord": 0,  "font": "Arial", "size": 20},
            {"name": "Text", "media": [], "sticky": False, "rtl": False, "ord": 1,  "font": "Arial", "size": 20},
            {"name": "Note", "media": [], "sticky": False, "rtl": False, "ord": 2,  "font": "Arial", "size": 20},
            {"name": "Mnemonics", "media": [], "sticky": False, "rtl": False, "ord": 3,  "font": "Arial", "size": 20},
            {"name": "Extra", "media": [], "sticky": False, "rtl": False, "ord": 4,  "font": "Arial", "size": 20}
        ], "sortf":0, "tmpls": [
            {"name": name, "qfmt": front, "did": None, "bafmt": "", "afmt": back, "ord": 0, "bqfmt": ""}
        ],
        "mod": 0, "latexPre": r"""\documentclass[12pt]{article}
        \special{papersize=3in,5in}
        \usepackage[utf8]{inputenc}
        \usepackage{amssymb,amsmath}
        \pagestyle{empty}
        \setlength{\parindent}{0in}
        \begin{document}
        """, "latexPost": r"\end{document}", "type": 1, "id": 0, "css": css})

def create_min_model(col, name, front, back, css):
    """Add minimal model from parameters"""
    col.models.add_dict({"vers": [], "name": name, "tags": [], "did": 1, "usn": -1, "flds": [
        {"name": "Text", "media": [], "sticky": False, "rtl": False, "ord": 0,  "font": "Arial", "size": 20},
        {"name": "Back Extra", "media": [], "sticky": False, "rtl": False, "ord": 1,  "font": "Arial", "size": 20}
    ], "sortf":0, "tmpls": [
        {"name": FC2_MIN_NAME, "qfmt": front, "did": None, "bafmt": "", "afmt": back, "ord": 0, "bqfmt": ""}
    ],
    "mod": 0, "latexPre": r"""\documentclass[12pt]{article}
    \special{papersize=3in,5in}
    \usepackage[utf8]{inputenc}
    \usepackage{amssymb,amsmath}
    \pagestyle{empty}
    \setlength{\parindent}{0in}
    \begin{document}
    """, "latexPost": r"\end{document}", "type": 1, "id": 0, "css": css})

def upgrade_one(model, front, back, css):
    msgs = []
    msgs.append('The template and CSS has been refactored making automatic upgrade difficult. The new template has overwritten the old version, if you had made any customizations to the template you can find your old template (*-<timestamp>.bak) in the addon folder/user_files (Tools → Add-ons → Flexible cloze 2 → View Files) to make a manual integration of your changes/configuration to the new template. An additional template, with the same functionality but fewer fields (the same as core Anki cloze notes, `Text` and `Back Extra`) has also been added.')
    model["tmpls"][0]["qfmt"] = front
    model["tmpls"][0]["afmt"] = back
    model['css'] = css
    mw.col.models.update(model)
    return msgs

def update():
    msgs = []
    (nfront, nback, ncss) = load_files((FNAME_FRONT, FNAME_BACK, FNAME_CSS))
    (nmfront, nmback, nmcss) = load_files((FNAME_MIN_FRONT, FNAME_MIN_BACK, FNAME_MIN_CSS))
    model = mw.col.models.by_name(FC2_NAME)
    mmodel = mw.col.models.by_name(FC2_MIN_NAME)

    if strvercmp(CVER, '1.2.4') < 0: # Possibly old erronous update, remove erronous files
        if p := os.path.isfile(os.path.join(ADDON_PATH, 'defaults.json')):
            os.remove(p)
        if p := os.path.isfile(os.path.join(ADDON_PATH, 'config.md')):
            os.remove(p)

    if model and strvercmp(CVER, '1.2.0') < 0: # Old existing model
        backup_files((
            (FNAME_FRONT, model["tmpls"][0]["qfmt"]),
            (FNAME_BACK, model["tmpls"][0]["afmt"]),
            (FNAME_CSS, model["css"])
        ))
        msgs += upgrade_one(model, nfront, nback, ncss)

    elif not model:
        create_model(mw.col, FC2_NAME, nfront, nback, ncss)
    else:
        backup_files((
            (FNAME_FRONT, model["tmpls"][0]["qfmt"]),
            (FNAME_BACK, model["tmpls"][0]["afmt"]),
            (FNAME_CSS, model["css"])
        ))
        msgs += update_model(model, mw.col, nfront, nback, ncss)

    if not mmodel:
        create_min_model(mw.col, FC2_MIN_NAME, nmfront, nmback, nmcss)
    else:
        backup_files((
            (FNAME_MIN_FRONT, mmodel["tmpls"][0]["qfmt"]),
            (FNAME_MIN_BACK, mmodel["tmpls"][0]["afmt"]),
            (FNAME_MIN_CSS, mmodel["css"])
        ))
        msgs += update_model(mmodel, mw.col, nmfront, nmback, nmcss)

    if len(msgs) > 0:
        msg_box = QMessageBox(mw)
        msg_box.setWindowTitle('Addon "Flexible cloze 2" updated')
        msg_box.setText("""<div style="text-align: left;">"Flexible cloze 2" addon has been updated:<ul><li>""" + '</li><li>'.join(msgs) + """</li></ul>Please see the addon page (https://ankiweb.net/shared/info/1889069832) for more details.</div>""")
        msg_box.addButton(QPushButton('Ok'), QMessageBox.ButtonRole.YesRole)
        msg_box.exec()

if strvercmp(CVER, NVER) < 0:
    set_version(NVER)
    gui_hooks.profile_did_open.append(update)
