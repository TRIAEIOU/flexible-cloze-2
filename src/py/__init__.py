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
TAGS = {
    'htm': {
        'fc2': ('<!-- FC2 BEGIN -->', '<!-- FC2 END -->'),
        'cfg': ('<!-- CONFIGURATION BEGIN -->', '<!-- CONFIGURATION END -->'),
        'func': ('<!-- FUNCTIONALITY BEGIN -->', '<!-- FUNCTIONALITY END -->')
    },
    'css': {
        'fc2': ('/*-- FC2 BEGIN --*/', '/*-- FC2 END --*/'),
        'cfg': ('/*-- CONFIGURATION BEGIN --*/', '/*-- CONFIGURATION END --*/'),
        'func': ('/*-- FUNCTIONALITY BEGIN --*/', '/*-- FUNCTIONALITY END --*/')
    }
}

CVER = get_version()
NVER = "1.0.1"

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

def parse_template(text: str, type: Literal['htm', 'css']) \
-> dict['pre': str, 'cfg': str, 'func': str, 'post': str]:
    """`return`: dict['pre': str, 'cfg': str, 'func': str, 'post': str]"""

    def parse_tag(txt: str, tag: tuple):
        p = re.split(rf"\s*(?:{re.escape(tag[0])}|{re.escape(tag[1])})\s*", txt)
        return p if len(p) == 3 else None

    fc2 = parse_tag(text, TAGS[type]['fc2'])
    if fc2:
        cfg = parse_tag(fc2[1], TAGS[type]['cfg'])
        func = parse_tag(fc2[1], TAGS[type]['func'])
        return {'pre': fc2[0], 'cfg': cfg[1], 'func': func[1], 'post': fc2[2]} if cfg and func else None
    return None

def render_template(template: dict['pre': str, 'cfg': str, 'func': str, 'post': str],
type: Literal['htm', 'css'], order: tuple[Literal['cfg', 'func'], ...]):
    """`template`: dict['pre': str, 'cfg': str, 'func': str, 'post': str]"""

    if len(template['pre']):
        template['pre'] += '\n\n'
    if len(template['post']):
        template['post'] = '\n\n' + template['post']

    return template['pre'] + \
        f"{TAGS[type]['fc2'][0]}\n\n"\
        f"{TAGS[type][order[0]][0]}\n{template[order[0]]}\n{TAGS[type][order[0]][1]}\n\n"\
        f"{TAGS[type][order[1]][0]}\n{template[order[1]]}\n{TAGS[type][order[1]][1]}\n\n"\
        f"{TAGS[type]['fc2'][1]}" + \
        template['post']


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

        old = parse_template(model["tmpls"][0]["qfmt"], 'htm')
        new =  parse_template(nfront, 'htm')
        if old and new:
            old['func'] = new['func']
            model["tmpls"][0]["qfmt"] = render_template(old, 'htm', ('cfg', 'func'))
        else:
            msgs.append('Failed to parse front template, manually insert template from addon directory.')

        old = parse_template(model["tmpls"][0]["afmt"], 'htm')
        new =  parse_template(nback, 'htm')
        if old and new:
            old['func'] = new['func']
            model["tmpls"][0]["afmt"] = render_template(old, 'htm', ('cfg', 'func'))
        else:
            msgs.append('Failed to parse back template, manually insert template from addon directory.')

        old = parse_template(model['css'], 'css')
        new =  parse_template(ncss, 'css')
        if old and new:
            old['func'] = new['func']
            model['css'] = render_template(old, 'css', ('func', 'cfg'))
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
