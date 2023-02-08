"""Installation/update of template"""

import re, os
from aqt import mw, QPushButton, QMessageBox, gui_hooks
from aqt.utils import *
from aqt.qt import *
from .version import *

FC2_NAME = "Flexible Cloze 2"
FNAME_FRONT = "fc2-front.html"
FNAME_BACK = "fc2-back.html"
FNAME_CSS = "fc2.css"
ADDON_PATH = os.path.dirname(__file__)
TAG_CFG = ('/*-- CONFIGURATION BEGIN --*/', '/*-- CONFIGURATION END --*/')
TAG_FUNC = ('/*-- FUNCTIONALITY BEGIN --*/', '/*-- FUNCTIONALITY END --*/')

CVER = get_version()
NVER = "1.1.1"

def read_files(files: tuple[str, ...]):
    out = []
    for file in files:
        with open(os.path.join(ADDON_PATH, file)) as fh:
            tmp = fh.read()
            out.append(tmp)
    return out

def write_files(files: tuple[str, ...]):
    for file in files:
        with open(os.path.join(ADDON_PATH, file[0]), "w") as fh:
            fh.write(file[1])

def parse_template(text: str) -> dict:
    """`return`: dict[pre: str, mid: str, post: str, cfg: str, func: str]"""

    if m := re.match(rf'^(.*?)\s*({re.escape(TAG_CFG[0])}|{re.escape(TAG_FUNC[0])})\s*(.*?)\s*({re.escape(TAG_CFG[1])}|{re.escape(TAG_FUNC[1])})\s*(.*?)\s*({re.escape(TAG_CFG[0])}|{re.escape(TAG_FUNC[0])})\s*(.*?)\s*({re.escape(TAG_CFG[1])}|{re.escape(TAG_FUNC[1])})\s*(.*)$', text, flags=re.DOTALL):
        return {
            'pre': m.group(1),
            'mid': m.group(5),
            'post': m.group (9),
            'cfg': m.group(3) if m.group(2) == TAG_CFG[0] else m.group(7),
            'func': m.group(3) if m.group(2) == TAG_FUNC[0] else m.group(7)
        }
    return None


def render_template(template: dict, first: Literal['cfg', 'func']):
    """`template`: dict['pre': str, 'mid': str, 'post': str, 'cfg': str, 'func': str]"""
    if template['pre']:
        template['pre'] += '\n\n'
    template['mid'] = f'\n\n{template["mid"]}\n\n' if template['mid'] else '\n\n'
    if template['post']:
        template['post'] = f'\n\n{template["post"]}'

    if first == 'cfg':
        ONE = f'{TAG_CFG[0]}\n{template["cfg"]}\n{TAG_CFG[1]}'
        TWO = f'{TAG_FUNC[0]}\n{template["func"]}\n{TAG_FUNC[1]}'
    else:
        ONE = f'{TAG_FUNC[0]}\n{template["func"]}\n{TAG_FUNC[1]}'
        TWO = f'{TAG_CFG[0]}\n{template["cfg"]}\n{TAG_CFG[1]}'

    return template['pre'] + ONE + template['mid'] + TWO + template['post']


def update():
    msgs = []
    if strvercmp(CVER, '1.0.0') < 0:
        msgs.append('<b>!!! IMPORTANT !!!</b> At the time of writing the functionality required for this note type to work is not available in neither AnkiMobile, nor AnkiDroid.')

    (nfront, nback, ncss) = read_files((FNAME_FRONT, FNAME_BACK, FNAME_CSS))
    model = mw.col.models.by_name(FC2_NAME)

    # Initial install, not updgrade ######################################
    if not model:
        mw.col.models.add_dict({"vers": [], "name": FC2_NAME, "tags": [], "did": 1, "usn": -1, "flds": [
                {"name": "Title", "media": [], "sticky": False, "rtl": False, "ord": 0,  "font": "Arial", "size": 20},
                {"name": "Text", "media": [], "sticky": False, "rtl": False, "ord": 1,  "font": "Arial", "size": 20},
                {"name": "Note", "media": [], "sticky": False, "rtl": False, "ord": 2,  "font": "Arial", "size": 20},
                {"name": "Mnemonics", "media": [], "sticky": False, "rtl": False, "ord": 3,  "font": "Arial", "size": 20},
                {"name": "Extra", "media": [], "sticky": False, "rtl": False, "ord": 4,  "font": "Arial", "size": 20}
            ], "sortf":0, "tmpls": [
                {"name": FC2_NAME, "qfmt": nfront, "did": None, "bafmt": "", "afmt": nback, "ord": 0, "bqfmt": ""}
            ],
            "mod": 0, "latexPre": r"""\documentclass[12pt]{article}
            \special{papersize=3in,5in}
            \usepackage[utf8]{inputenc}
            \usepackage{amssymb,amsmath}
            \pagestyle{empty}
            \setlength{\parindent}{0in}
            \begin{document}
            """, "latexPost": r"\end{document}", "type": 1, "id": 0, "css": ncss})

    # Existing install - upgrade ######################################
    else:
        # Backup previous version
        write_files((
            (FNAME_FRONT + ".bak", model["tmpls"][0]["qfmt"]),
            (FNAME_BACK + ".bak", model["tmpls"][0]["afmt"]),
            (FNAME_CSS + ".bak", model["css"])
        ))

        ofront = model["tmpls"][0]["qfmt"]
        oback = model["tmpls"][0]["afmt"]
        ocss = model['css']

        if strvercmp(CVER, '1.1.0') < 0:
            msgs.append('Configuration parameter <code>expose.chars</code> renamed <code>expose.char</code> as it now accepts only single char.')

            # Fix document structure change
            RE1 = re.compile(r'\s*<!-- FC2 BEGIN -->\s*<!-- CONFIGURATION BEGIN -->\s*<script type="application/javascript">\s*')
            RE2 = re.compile(r'\s*</script>\s*<!-- CONFIGURATION END -->\s*<!-- FUNCTIONALITY BEGIN -->\s*<script type="application/javascript">\s*')
            RE3 = re.compile(r'\s*</script>\s*<!-- FUNCTIONALITY END -->\s*<!-- FC2 END -->\s*')
            def strip_htm(txt):
                txt = RE1.sub(f'\n\n<script type="application/javascript">\n{TAG_CFG[0]}\n', txt)
                txt = RE2.sub(f'\n{TAG_CFG[1]}\n\n{TAG_FUNC[0]}\n', txt)
                txt = RE3.sub(f'\n{TAG_FUNC[1]}\n</script>', txt)
                return txt.replace('chars:', 'char:')

            ofront = strip_htm(ofront)
            oback = strip_htm(oback)
            ocss = re.sub(r'\s*\/\*-- FC2 (?:BEGIN|END) --\*\/\s*', '\n\n', ocss)

        old = parse_template(ofront)
        new =  parse_template(nfront)
        if old and new:
            old['func'] = new['func']
            model["tmpls"][0]["qfmt"] = render_template(old, 'cfg')
        else:
            msgs.append('Failed to parse front template, manually insert template from addon directory.')

        old = parse_template(oback)
        new =  parse_template(nback)
        if old and new:
            old['func'] = new['func']
            model["tmpls"][0]["afmt"] = render_template(old, 'cfg')
        else:
            msgs.append('Failed to parse back template, manually insert template from addon directory.')

        old = parse_template(ocss)
        new =  parse_template(ncss)
        if old and new:
            old['func'] = new['func']
            model['css'] = render_template(old, 'func')
        else:
            msgs.append('Failed to parse styling template, manually insert template from addon directory.')

        # Write
        mw.col.models.update(model)

    if len(msgs) > 0:
        msg_box = QMessageBox(mw)
        msg_box.setWindowTitle('Addon "Flexible cloze 2" updated')
        msg_box.setText("""<div style="text-align: left;">"Flexible cloze 2" addon has been updated:<ul><li>""" + '</li><li>'.join(msgs) + """</li></ul>Please see the addon page (https://ankiweb.net/shared/info/) for more details.</div>""")
        msg_box.addButton(QPushButton('Ok'), QMessageBox.ButtonRole.YesRole)
        msg_box.exec()

if strvercmp(CVER, NVER) < 0:
    set_version(NVER)
    gui_hooks.profile_did_open.append(update)
