import os, re

PATH = os.path.join(os.path.dirname(__file__), "version")

def strvercmp(left: str, right: str) -> int:
    """Compares semantic version strings.\n
    Returns:    left version is larger: > 0
                right version is larger: < 0
                versions are equal: 0"""

    pat = re.compile('^([0-9]+)\.?([0-9]+)?\.?([0-9]+)?([a-z]+)?([0-9]+)?$')
    l = pat.match(left).groups()
    r = pat.match(right).groups()
    for i in range(5):
        if l[i] != r[i]:
            if i == 3:
                return 1 if l[3] == None or (r[3] != None and l > r) else -1
            else:
                return 1 if r[i] == None or (l[i] != None and int(l[i]) > int(r[i])) else -1
    return 0

def get_version() -> str:
    """Get current version string (from file)."""
    try:
        with open(PATH) as fh:
            ver = fh.read()
            if m := re.match(r"^\s*((?:\d+\.){0,2}\d+\s*[a-z1-9]+)", ver):
                ver = m.group(1)
            else:
                ver = "0.0.0"
    except OSError:
        ver = "0.0.0"
    return ver

def set_version(version: str):
    """Set version (and write to file)."""
    with open(PATH, "w") as fh:
        fh.write(version)
