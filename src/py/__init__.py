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
FC2_MIN_NAME = "Flexible Cloze 2 (min)"
FNAME_MIN_FRONT = "fc2m-front.html"
FNAME_MIN_BACK = "fc2m-back.html"
FNAME_MIN_CSS = "fc2m.css"
ADDON_PATH = os.path.dirname(__file__)
TAG_CFG = ('<!-- CONFIGURATION BEGIN -->', '<!-- CONFIGURATION END -->')
TAG_FUNC = "<!-- FC2 FUNCTIONALITY - DO NOT EDIT BELOW THIS POINT -->"

CVER = get_version()
NVER = "1.2.0"

#######################################################################
# Legacy code
def parse_legacy_template(text: str) -> dict:
    """`return`: dict[pre: str, mid: str, post: str, cfg: str, func: str]"""
    TAG_CFG = ('/*-- CONFIGURATION BEGIN --*/', '/*-- CONFIGURATION END --*/')
    TAG_FUNC = ('/*-- FUNCTIONALITY BEGIN --*/', '/*-- FUNCTIONALITY END --*/')

    if m := re.match(rf'^(.*?)\s*({re.escape(TAG_CFG[0])}|{re.escape(TAG_FUNC[0])})\s*(.*?)\s*({re.escape(TAG_CFG[1])}|{re.escape(TAG_FUNC[1])})\s*(.*?)\s*({re.escape(TAG_CFG[0])}|{re.escape(TAG_FUNC[0])})\s*(.*?)\s*({re.escape(TAG_CFG[1])}|{re.escape(TAG_FUNC[1])})\s*(.*)$', text, flags=re.DOTALL):
        return {
            'pre': m.group(1),
            'mid': m.group(5),
            'post': m.group (9),
            'cfg': m.group(3) if m.group(2) == TAG_CFG[0] else m.group(7),
            'func': m.group(3) if m.group(2) == TAG_FUNC[0] else m.group(7)
        }
    return None

def legacy_update_template():
    """Convert legacy templates to new format"""


    def render_template(template: dict, first: Literal['cfg', 'func']):
        """`template`: dict['pre': str, 'mid': str, 'post': str, 'cfg': str, 'func': str]"""
        return fr"""<!-- CONFIGURATION BEGIN -->
        <script type="application/javascript">
        {template['cfg']}
        </script>"""


        return template['pre'] + ONE + template['mid'] + TWO + template['post']

    def update_model(col, name, files, create_model):
        msgs = []

        (nfront, nback, ncss) = read_files(files)
        model = col.models.by_name(name)

        # No existing model, create
        if not model:
            model = create_model(col, name, nfront, nback, ncss)

        # Existing model, update
        else:
            # Backup previous version
            write_files((
                (files[0] + ".bak", model["tmpls"][0]["qfmt"]),
                (files[1] + ".bak", model["tmpls"][0]["afmt"]),
                (files[2] + ".bak", model["css"])
            ))

            ofront = model["tmpls"][0]["qfmt"]
            oback = model["tmpls"][0]["afmt"]
            ocss = model['css']

            if strvercmp(CVER, '1.1.0') < 0:
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
            col.models.update(model)

        return msgs

    TAG_CFG = ('/*-- CONFIGURATION BEGIN --*/', '/*-- CONFIGURATION END --*/')
    TAG_FUNC = ('/*-- FUNCTIONALITY BEGIN --*/', '/*-- FUNCTIONALITY END --*/')
    return update_model(
        mw.col,
        FC2_NAME,
        (FNAME_FRONT, FNAME_BACK, FNAME_CSS),
        create_model
    )

#######################################################################
# Current code base
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

def read_model(col, name):
    if model := col.models.by_name(name):
        return (model["tmpls"][0]["qfmt"], model["tmpls"][0]["afmt"], model['css'])
    return None


def update_model(model, col, files):
    msgs = []

    (nfront, nback, ncss) = read_files(files)
    model = col.models.by_name(name)

    # Backup previous version
    write_files((
        (files[0] + ".bak", model["tmpls"][0]["qfmt"]),
        (files[1] + ".bak", model["tmpls"][0]["afmt"]),
        (files[2] + ".bak", model["css"])
    ))

    ofront = model["tmpls"][0]["qfmt"]
    oback = model["tmpls"][0]["afmt"]
    ocss = model['css']

    if strvercmp(CVER, '1.1.0') < 0:
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
        col.models.update(model)

    return msgs


def parse_template(txt: str) -> dict:
    """`return`: dict[pre: str, mid: str, post: str, cfg: str, func: str]"""

    parts = txt.split(TAG_FUNC)

    parts = re.match(
        rf'^(.*?)\s*({re.escape(TAG_CFG[0])}.*?{re.escape(TAG_CFG[1])})\s*'
    )

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
        {"name": "Extra", "media": [], "sticky": False, "rtl": False, "ord": 1,  "font": "Arial", "size": 20}
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
    # Front
    prv = parse_legacy_template(model["tmpls"][0]["qfmt"])
    nxt = front.split(TAG_CFG[1], 1)
    model["tmpls"][0]["qfmt"] = fr"""<!-- CONFIGURATION BEGIN -->
    <script type="application/javascript">
    {prv['cfg'].strip()}
    </script>
    <!-- CONFIGURATION END -->

    {nxt[1].strip()}
    """
    # Back
    prv = parse_legacy_template(model["tmpls"][0]["afmt"])
    nxt = front.split(TAG_CFG[1], 1)
    model["tmpls"][0]["afmt"] = fr"""<!-- CONFIGURATION BEGIN -->
    <script type="application/javascript">
    {prv['cfg'].strip()}
    </script>
    <!-- CONFIGURATION END -->

    {nxt[1].strip()}
    """
    # CSS
    prv = parse_legacy_template(model["tmpls"][0]["afmt"])
    nxt = front.split(TAG_CFG[1], 1)
    model["tmpls"][0]["afmt"] = fr"""<!-- CONFIGURATION BEGIN -->
    <script type="application/javascript">
    {prv['cfg'].strip()}
    </script>
    <!-- CONFIGURATION END -->

    {nxt[1].strip()}
    """

    oback = parse_legacy_template(model["tmpls"][0]["afmt"])
    ocss = parse_legacy_template(model["css"])

def update():
    msgs = []
    (nfront, nback, ncss) = read_files((FNAME_FRONT, FNAME_BACK, FNAME_CSS))
    (nmfront, nmback, nmcss) = read_files((FNAME_MIN_FRONT, FNAME_MIN_BACK, FNAME_MIN_CSS))

    if strvercmp(CVER, '0.0.0') > 0: # Model(s) exist
        if strvercmp(CVER, '1.2.0') >= 0: # New template format
            # read old template
                # split
                # join
            # or new
            pass
        elif model := mw.col.models.by_name(FC2_NAME): # Old template format
            upgrade_one(model)

            # read old template
            # get old config
            # write new normal model
            create_min_model(mw.col, FC2_MIN_NAME, nmfront, nmback, nmcss)
            re.match(rf'^(.*?)\s*({re.escape(TAG_CFG[0])}|{re.escape(TAG_FUNC[0])})\s*(.*?)\s*({re.escape(TAG_CFG[1])}|{re.escape(TAG_FUNC[1])})\s*(.*?)\s*({re.escape(TAG_CFG[0])}|{re.escape(TAG_FUNC[0])})\s*(.*?)\s*({re.escape(TAG_CFG[1])}|{re.escape(TAG_FUNC[1])})\s*(.*)$', text, flags=re.DOTALL):
            msgs.extend(legacy_update_template())
            # manual add of new min template
    else: # First install
        # create both new models



    if CVER != '0.0.0':
        if strvercmp(CVER, '1.1.3') < 0:
            msgs.append(f'New minimal note type included,  `{FC2_MIN_NAME}`, which only has two fields (corresponding to the core Anki cloze note).')

        if strvercmp(CVER, '1.1.2') < 0:
            msgs.append('The default `scroll` configuration shipped in earlier versions was errounously set to `section-context` in certain cases, that is an invalid setting, manually set to `context` instead.')

        if strvercmp(CVER, '1.1.1') < 0:
            msgs.append('The Anki 2.15.56+ back end is now supported on AnkiDroid 2.16alpha93+ with `Use new backend` enabled and AnkiMobile 2.0.88+.')

        if strvercmp(CVER, '1.1.0') < 0:
            msgs.append('Configuration parameter <code>expose.chars</code> renamed <code>expose.char</code> as it now accepts only single char.')

    if len(msgs) > 0:
        msg_box = QMessageBox(mw)
        msg_box.setWindowTitle('Addon "Flexible cloze 2" updated')
        msg_box.setText("""<div style="text-align: left;">"Flexible cloze 2" addon has been updated:<ul><li>""" + '</li><li>'.join(msgs) + """</li></ul>Please see the addon page (https://ankiweb.net/shared/info/1889069832) for more details.</div>""")
        msg_box.addButton(QPushButton('Ok'), QMessageBox.ButtonRole.YesRole)
        msg_box.exec()

if strvercmp(CVER, NVER) < 0:
    set_version(NVER)
    gui_hooks.profile_did_open.append(update)
