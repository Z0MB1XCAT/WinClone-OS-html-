
import winclone
import wcgame as g
import time

W = 720
H = 540
FPS = 20
RT_INTERVAL = 1.5
SCAN_BATCH  = 18
SPAM_FLOOD  = 15
MAX_FLOOD   = 400
MAX_HISTORY = 300
MAX_VAULT_FILES = 400
MAX_FILE_CHARS  = 20000
SCRIPT_SCORE = 5

WATCH = ["C:\\Users\\User"]

DOCS = "C:\\Users\\User\\Documents\\"
Q_FILE     = DOCS + "EdgyDefender.quarantine"
H_FILE     = DOCS + "EdgyDefender.history"
CFG_FILE   = DOCS + "EdgyDefender.cfg"
VAULT_FILE = DOCS + "EdgyDefender.vault"

SYS_DIR   = "C:\\Windows\\System"
KNOWN_SYS = ["systemwinclone.sys", "SysWIW48.dll", "winclone_kernel.dll",
             "wclogon.exe", "bootmgr.wc"]
KNOWN_SYS_LOWER = []
for _n in KNOWN_SYS:
    KNOWN_SYS_LOWER.append(_n.lower())

WHITELIST = ["edgydefender.py", "edgydefender.quarantine",
             "edgydefender.history", "edgydefender.cfg",
             "edgydefender.vault", "edgyrestore.py"]
ALLOW_MARK = "EDGY-DEFENDER-ALLOW"

CONTENT_SIGS = [
    ("edgy-defender-test-file",              "EICAR-Test"),
    ("eicar-standard-antivirus-test-file",   "EICAR-Test"),
    ("your files have been encrypted",       "Ransom.Note"),
    ("your files are being encrypted",       "Ransom.Note"),
    ("send cork coins",                      "Ransom.Note"),
    ("bitcork",                              "Ransom.BitCork"),
]
RANSOM_NAMES = ["how_to_decrypt", "howtodecrypt", "decrypt_", "read_me",
                "readme_ransom", "restore_files", "recover_files"]
BAD_EXT = [".txt.exe", ".jpg.exe", ".png.exe", ".pdf.exe", ".doc.exe",
           ".jpg.scr", ".png.scr", ".mp3.exe", ".mp4.exe", ".zip.exe"]
RISKY_DL_EXT = [".exe", ".scr", ".bat", ".com", ".cmd"]
BAD_WORDS = ["virus", "trojan", "malware", "keylog", "spyware", "ransom",
             "backdoor", "coinminer", "payload", "rootkit", "hacktool"]
MEDIA_EXT = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".ico",
             ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".mov"]

BG      = "#0d1424"
PANEL   = "#151f38"
PANEL2  = "#1c2947"
LINE    = "#26355c"
TXT     = "#e8edf6"
SUB     = "#93a4c4"
ACCENT  = "#2f6bff"
GREEN   = "#31c46a"
RED     = "#ff5c5c"
ORANGE  = "#ffab3d"
KNOB    = "#f4f7ff"

S = {
    "tab": "dash",
    "protect": True,
    "sound": True,
    "quarantine": [],
    "history": [],
    "vault": {},
    "qid": 1,
    "scanned": 0,
    "last_scan": "never",
    "scanning": False,
    "scan_queue": [],
    "scan_total": 0,
    "scan_done": 0,
    "scan_hits": 0,
    "known": [],
    "rt_last": 0.0,
    "scroll_q": 0,
    "scroll_h": 0,
    "toast": "",
    "toast_t": 0.0,
}

def base(path):
    i = path.rfind("\\")
    if i < 0:
        return path
    return path[i + 1:]

def parent_of(path):
    i = path.rfind("\\")
    if i < 0:
        return ""
    return path[:i]

def is_windows_path(path):
    return path.lower().startswith("c:\\windows")

def has_media_ext(low):
    for ext in MEDIA_EXT:
        if low.endswith(ext):
            return True
    return False

def contains_any(text, needles):
    for n in needles:
        if n in text:
            return True
    return False

def clockstr():
    t = int(time.time())
    secs = t % 86400
    hh = secs // 3600
    mm = (secs % 3600) // 60
    ss = secs % 60
    return two(hh) + ":" + two(mm) + ":" + two(ss)

def two(n):
    s = str(n)
    if len(s) < 2:
        return "0" + s
    return s

def is_folder(path):
    try:
        winclone.ls(path)
        return True
    except Exception:
        return False

def gather():
    found = []
    stack = []
    for root in WATCH:
        stack.append(root)
    while stack:
        folder = stack.pop()
        try:
            names = winclone.ls(folder)
        except Exception:
            continue
        for name in names:
            p = folder + "\\" + name
            if is_folder(p):
                stack.append(p)
            else:
                found.append(p)
    return found

def esc(s):
    s = s.replace("\\", "\\\\")
    s = s.replace("\n", "\\n")
    s = s.replace("\r", "\\r")
    s = s.replace("\t", "\\t")
    return s

def unesc(s):
    out = ""
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if ch == "\\" and i + 1 < n:
            nx = s[i + 1]
            if nx == "n":
                out += "\n"
            elif nx == "r":
                out += "\r"
            elif nx == "t":
                out += "\t"
            else:
                out += nx
            i += 2
        else:
            out += ch
            i += 1
    return out

def save_quarantine():
    lines = ["QSTORE1"]
    for r in S["quarantine"]:
        lines.append(str(r["id"]) + "\t" + r["time"] + "\t" + esc(r["threat"]) +
                     "\t" + esc(r["path"]) + "\t" + esc(r["name"]) +
                     "\t" + esc(r["content"]))
    try:
        winclone.write(Q_FILE, "\n".join(lines), overwrite=True)
    except Exception:
        pass

def load_quarantine():
    S["quarantine"] = []
    try:
        if not winclone.exists(Q_FILE):
            return
        text = winclone.read(Q_FILE)
    except Exception:
        return
    lines = text.split("\n")
    if len(lines) == 0 or lines[0] != "QSTORE1":
        return
    idx = 1
    top = 0
    while idx < len(lines):
        line = lines[idx]
        idx += 1
        if line == "":
            continue
        bits = line.split("\t", 5)
        if len(bits) < 6:
            continue
        rid = int(bits[0])
        if rid > top:
            top = rid
        S["quarantine"].append({
            "id": rid, "time": bits[1], "threat": unesc(bits[2]),
            "path": unesc(bits[3]), "name": unesc(bits[4]),
            "content": unesc(bits[5])})
    S["qid"] = top + 1

def save_history():
    hist = S["history"]
    if len(hist) > MAX_HISTORY:
        hist = hist[len(hist) - MAX_HISTORY:]
        S["history"] = hist
    lines = ["HIST1"]
    for r in hist:
        lines.append(r["time"] + "\t" + esc(r["action"]) + "\t" +
                     esc(r["threat"]) + "\t" + esc(r["name"]) + "\t" +
                     esc(r["path"]))
    try:
        winclone.write(H_FILE, "\n".join(lines), overwrite=True)
    except Exception:
        pass

def load_history():
    S["history"] = []
    try:
        if not winclone.exists(H_FILE):
            return
        text = winclone.read(H_FILE)
    except Exception:
        return
    lines = text.split("\n")
    if len(lines) == 0 or lines[0] != "HIST1":
        return
    idx = 1
    while idx < len(lines):
        line = lines[idx]
        idx += 1
        if line == "":
            continue
        bits = line.split("\t", 4)
        if len(bits) < 5:
            continue
        S["history"].append({
            "time": bits[0], "action": unesc(bits[1]),
            "threat": unesc(bits[2]), "name": unesc(bits[3]),
            "path": unesc(bits[4])})

def save_cfg():
    txt = ("protect=" + ("1" if S["protect"] else "0") + "\n" +
           "sound=" + ("1" if S["sound"] else "0"))
    try:
        winclone.write(CFG_FILE, txt, overwrite=True)
    except Exception:
        pass

def load_cfg():
    try:
        if not winclone.exists(CFG_FILE):
            return
        for line in winclone.read(CFG_FILE).split("\n"):
            if line.startswith("protect="):
                S["protect"] = line.strip().endswith("1")
            elif line.startswith("sound="):
                S["sound"] = line.strip().endswith("1")
    except Exception:
        pass

def load_vault():
    S["vault"] = {}
    try:
        if not winclone.exists(VAULT_FILE):
            return
        lines = winclone.read(VAULT_FILE).split("\n")
    except Exception:
        return
    if len(lines) == 0 or lines[0] != "EDGYVAULT2":
        return
    idx = 1
    while idx < len(lines):
        line = lines[idx]
        idx += 1
        if line == "":
            continue
        bits = line.split("\t", 1)
        if len(bits) == 2:
            S["vault"][unesc(bits[0])] = unesc(bits[1])

def save_vault():
    lines = ["EDGYVAULT2"]
    for p in S["vault"].keys():
        lines.append(esc(p) + "\t" + esc(S["vault"][p]))
    try:
        winclone.write(VAULT_FILE, "\n".join(lines), overwrite=True)
    except Exception:
        pass

def classify(path):
    name = base(path)
    low = name.lower()
    if low in WHITELIST:
        return None
    try:
        content = winclone.read(path)
    except Exception as e:
        msg = str(e).lower()
        if "encrypt" in msg or "ransom" in msg:
            return ("Ransom.Locked", "victim")
        return None
    if ALLOW_MARK in content:
        return None
    cl = content.lower()

    if low.startswith("wcworm_"):
        return ("Worm.Replika", "quarantine")
    if contains_any(low, RANSOM_NAMES):
        return ("Ransom.Note", "quarantine")
    for ext in BAD_EXT:
        if low.endswith(ext):
            return ("Trojan.Dropper", "quarantine")
    if contains_any(low, BAD_WORDS):
        return ("Suspicious.Name", "quarantine")
    if "\\downloads\\" in path.lower():
        for ext in RISKY_DL_EXT:
            if low.endswith(ext):
                return ("Suspicious.Download", "quarantine")
    for pair in CONTENT_SIGS:
        if pair[0] in cl:
            return (pair[1], "quarantine")

    if low.endswith(".py") and ("winclone" in cl or "wcgame" in cl):
        squash = cl.replace(" ", "")
        deletes = "del_file(" in squash
        hits_system = (contains_any(cl, KNOWN_SYS_LOWER) or
                       ("windows" in cl and "system" in cl))
        if deletes and hits_system:
            return ("Trojan.SystemWipe", "quarantine")
        writes = cl.count("new_file(") + cl.count(".write(")
        if writes >= 20:
            return ("Trojan.Spammer", "quarantine")
        if "show_py_window(false" in squash and ".effect(" in cl:
            return ("Heuristic.ScreenHijack", "quarantine")
        score = 0
        if deletes:
            score += 2
        if "permanent=true" in squash:
            score += 1
        if "reboot(" in squash:
            score += 3
        if "show_py_window(false" in squash:
            score += 2
        if "set_user_name(" in cl:
            score += 2
        if ".effect(" in cl:
            score += 1
        if writes >= 8:
            score += 2
        if cl.count("open_app(") >= 5:
            score += 2
        if score >= SCRIPT_SCORE:
            return ("Heuristic.Malware", "quarantine")
    return None

def add_history(action, threat, name, path):
    S["history"].append({"time": clockstr(), "action": action,
                         "threat": threat, "name": name, "path": path})
    save_history()

def do_quarantine(path, threat):
    """Copy the threat into the quarantine store, then remove the original."""
    if is_windows_path(path):
        return False
    name = base(path)
    try:
        content = winclone.read(path)
    except Exception:
        content = ""
    try:
        winclone.del_file(path, permanent=True, missing_ok=True)
    except Exception:
        return False
    S["quarantine"].append({"id": S["qid"], "time": clockstr(),
                            "threat": threat, "path": path, "name": name,
                            "content": content})
    S["qid"] += 1
    save_quarantine()
    add_history("quarantined", threat, name, path)
    notify("Threat quarantined", threat + ": " + name)
    if S["sound"]:
        try:
            g.tone(180, 0.12)
        except Exception:
            pass
    return True

def unquarantine(rec):
    ok = False
    try:
        winclone.write(rec["path"], rec["content"], overwrite=True)
        ok = True
    except Exception:
        ok = False
    remove_q(rec["id"])
    add_history("restored" if ok else "restore-failed",
                rec["threat"], rec["name"], rec["path"])
    if ok:
        notify("Restored from quarantine", rec["name"])
    else:
        notify("Restore failed", rec["name"] + " - its folder may be gone")
    return ok

def delete_q(rec):
    remove_q(rec["id"])
    add_history("deleted", rec["threat"], rec["name"], rec["path"])

def remove_q(rid):
    keep = []
    for r in S["quarantine"]:
        if r["id"] != rid:
            keep.append(r)
    S["quarantine"] = keep
    save_quarantine()

def notify(title, body):
    try:
        winclone.notify(title, body)
    except Exception:
        pass

def maybe_backup(path):
    low = base(path).lower()
    if low in WHITELIST or is_windows_path(path) or has_media_ext(low):
        return
    try:
        content = winclone.read(path)
    except Exception:
        return
    if len(content) > MAX_FILE_CHARS:
        return
    old = S["vault"].get(path, None)
    if old == content:
        return
    if old is None and len(S["vault"]) >= MAX_VAULT_FILES:
        return
    S["vault"][path] = content

def restore_personal():
    restored = 0
    failed = 0
    for path in S["vault"].keys():
        if is_windows_path(path):
            continue
        want = S["vault"][path]
        try:
            if winclone.exists(path) and winclone.read(path) == want:
                continue
        except Exception:
            pass
        try:
            winclone.write(path, want, overwrite=True)
            restored += 1
        except Exception:
            failed += 1
    notify("Edgy Defender", str(restored) + " personal file(s) restored")
    toast(str(restored) + " file(s) restored, " + str(failed) + " failed")

def strip_dupe(name):
    dot = name.rfind(".")
    if dot > 0:
        stem = name[:dot]
        ext = name[dot:]
    else:
        stem = name
        ext = ""
    if stem.endswith(")"):
        op = stem.rfind(" (")
        if op >= 0:
            inner = stem[op + 2:len(stem) - 1]
            if inner.isdigit():
                stem = stem[:op]
    return stem + ext

def sweep_floods(files):
    groups = {}
    for path in files:
        name = base(path)
        low = name.lower()
        if low in WHITELIST or has_media_ext(low) or is_windows_path(path):
            continue
        key = parent_of(path) + "||" + strip_dupe(name)
        arr = groups.get(key, None)
        if arr is None:
            arr = []
            groups[key] = arr
        arr.append(path)
    removed = 0
    for key in groups.keys():
        members = groups[key]
        if len(members) < SPAM_FLOOD:
            continue
        fam = strip_dupe(base(members[0]))
        n = 0
        for path in members:
            if removed >= MAX_FLOOD:
                break
            try:
                winclone.del_file(path, permanent=False, missing_ok=True)
                removed += 1
                n += 1
            except Exception:
                pass
        if n:
            add_history("cleaned", "Spam.Flood", str(n) + " x " + fam, "")
            notify("Cleaned junk flood", str(n) + " x '" + fam + "'")
    return removed

def check_system():
    missing = []
    for nm in KNOWN_SYS:
        if not winclone.exists(SYS_DIR + "\\" + nm):
            missing.append(nm)
    return missing

def start_scan():
    if S["scanning"]:
        return
    S["scanning"] = True
    S["scan_queue"] = gather()
    S["scan_total"] = len(S["scan_queue"])
    S["scan_done"] = 0
    S["scan_hits"] = 0
    S["scanned"] = 0

def step_scan():
    q = S["scan_queue"]
    n = 0
    while q and n < SCAN_BATCH:
        path = q.pop()
        n += 1
        S["scan_done"] += 1
        S["scanned"] += 1
        res = classify(path)
        if res is None:
            maybe_backup(path)
            continue
        if res[1] == "victim":
            add_history("alert", res[0], base(path), path)
            continue
        if do_quarantine(path, res[0]):
            S["scan_hits"] += 1
    if not q:
        finish_scan()

def finish_scan():
    S["scanning"] = False
    sweep_floods(gather())
    save_vault()
    S["last_scan"] = clockstr()
    S["known"] = gather()
    toast("Scan complete - " + str(S["scan_hits"]) + " threat(s) caught")

def realtime_tick():
    files = gather()
    newf = []
    known = S["known"]
    for p in files:
        if p not in known:
            newf.append(p)
    for path in newf:
        res = classify(path)
        if res is None:
            continue
        if res[1] == "victim":
            add_history("alert", res[0], base(path), path)
            continue
        do_quarantine(path, res[0])
    sweep_floods(files)
    S["known"] = gather()

def toast(msg):
    S["toast"] = msg
    S["toast_t"] = g.clock()

def point_in(px, py, x, y, w, h):
    return px >= x and px <= x + w and py >= y and py <= y + h

def button(mx, my, click, x, y, w, h, label, col):
    hot = point_in(mx, my, x, y, w, h)
    g.rect(x, y, w, h, col)
    if hot:
        g.rect(x, y, w, h, "#ffffff", fill=False, width=2)
    g.text(label, x + w / 2, y + h / 2 - 7, "#ffffff", size=13, align="center")
    return click and hot

def toggle(mx, my, click, x, y, on):
    w = 52
    hgt = 26
    col = GREEN if on else "#4a5675"
    g.rect(x, y, w, hgt, col)
    kx = x + w - 22 if on else x + 2
    g.rect(kx, y + 2, 20, hgt - 4, KNOB)
    if click and point_in(mx, my, x, y, w, hgt):
        return True
    return False

def draw_shield(cx, cy, size, col, ok):
    hw = size / 2
    hh = size / 2
    pts = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy],
           [cx, cy + hh], [cx - hw, cy]]
    g.poly(pts, col, fill=True)
    if ok:
        g.line(cx - size * 0.22, cy, cx - size * 0.04, cy + size * 0.2,
               "#ffffff", width=5)
        g.line(cx - size * 0.04, cy + size * 0.2, cx + size * 0.28,
               cy - size * 0.22, "#ffffff", width=5)
    else:
        g.rect(cx - 3, cy - size * 0.28, 6, size * 0.34, "#ffffff")
        g.rect(cx - 3, cy + size * 0.16, 6, 6, "#ffffff")

def draw_tabs(mx, my, click):
    tabs = [["dash", "Dashboard"], ["quar", "Quarantine"],
            ["hist", "History"], ["set", "Settings"]]
    x = 0
    tw = 150
    for t in tabs:
        active = S["tab"] == t[0]
        g.rect(x, 0, tw, 46, PANEL2 if active else PANEL)
        if active:
            g.rect(x, 43, tw, 3, ACCENT)
        g.text(t[1], x + tw / 2, 16, TXT if active else SUB, size=13,
               align="center")
        if click and point_in(mx, my, x, 0, tw, 46):
            S["tab"] = t[0]
        x += tw
    g.rect(0, 46, W, 1, LINE)

def panel(x, y, w, h):
    g.rect(x, y, w, h, PANEL)

def draw_dashboard(mx, my, click):
    missing = check_system()
    threats = len(S["quarantine"])
    if not S["protect"]:
        col = ORANGE
        head = "Protection is OFF"
        sub = "Realtime protection is disabled. Turn it back on."
        ok = False
    elif threats > 0 or len(missing) > 0:
        col = RED
        head = "Attention needed"
        sub = str(threats) + " item(s) in quarantine"
        if missing:
            sub += ", " + str(len(missing)) + " system file(s) missing"
        ok = False
    else:
        col = GREEN
        head = "You're protected"
        sub = "Realtime protection is on. No active threats."
        ok = True

    panel(20, 62, W - 40, 150)
    draw_shield(90, 137, 78, col, ok)
    g.text(head, 150, 84, TXT, size=22)
    g.text(sub, 150, 116, SUB, size=13)
    g.text("Last scan: " + S["last_scan"], 150, 140, SUB, size=12)

    g.text("Realtime", W - 150, 96, SUB, size=12)
    if toggle(mx, my, click, W - 78, 90, S["protect"]):
        S["protect"] = not S["protect"]
        save_cfg()
        toast("Realtime protection " + ("on" if S["protect"] else "off"))

    tiles = [["Scanned", str(S["scanned"])],
             ["In quarantine", str(threats)],
             ["Detections", str(len(S["history"]))]]
    tx = 20
    for t in tiles:
        panel(tx, 224, 212, 74)
        g.text(t[1], tx + 16, 236, TXT, size=24)
        g.text(t[0], tx + 16, 270, SUB, size=12)
        tx += 224

    if S["scanning"]:
        pct = 0
        if S["scan_total"] > 0:
            pct = S["scan_done"] * 100 // S["scan_total"]
        panel(20, 320, W - 40, 70)
        g.text("Scanning... " + str(pct) + "%", 40, 336, TXT, size=15)
        g.rect(40, 364, W - 120, 12, PANEL2)
        g.rect(40, 364, (W - 120) * pct // 100, 12, ACCENT)
        g.text(str(S["scan_done"]) + " / " + str(S["scan_total"]), W - 70, 336,
               SUB, size=12, align="right")
    else:
        if button(mx, my, click, 20, 330, 220, 54, "Quick Scan", ACCENT):
            start_scan()
        g.text("Scan the whole PC for threats now.", 260, 348, SUB, size=13)

def row_list(items, scroll_key, mx, my, click):
    """Render a scrollable list area, return (top, visible, row_h, area_y)."""
    ax = 20
    ay = 62
    aw = W - 40
    ah = H - ay - 20
    panel(ax, ay, aw, ah)
    row_h = 64
    header = 44
    visible = int((ah - header - 44) // row_h)
    total = len(items)
    scroll = S[scroll_key]
    maxscroll = total - visible
    if maxscroll < 0:
        maxscroll = 0
    if scroll > maxscroll:
        scroll = maxscroll
        S[scroll_key] = scroll
    if total > visible:
        if button(mx, my, click, ax + aw - 84, ay + 8, 36, 28, "^", PANEL2):
            if scroll > 0:
                S[scroll_key] = scroll - 1
        if button(mx, my, click, ax + aw - 44, ay + 8, 36, 28, "v", PANEL2):
            if scroll < maxscroll:
                S[scroll_key] = scroll + 1
    return (ax, ay, aw, ah, header, row_h, visible, scroll)

def draw_quarantine(mx, my, click):
    items = S["quarantine"]
    box = row_list(items, "scroll_q", mx, my, click)
    ax = box[0]
    ay = box[1]
    aw = box[2]
    header = box[4]
    row_h = box[5]
    visible = box[6]
    scroll = box[7]
    g.text("Quarantine  (" + str(len(items)) + ")", ax + 16, ay + 14, TXT,
           size=15)
    if not items:
        g.text("Nothing in quarantine. Nice and clean.", ax + 16,
               ay + header + 20, SUB, size=13)
        return
    y = ay + header
    end = scroll + visible
    if end > len(items):
        end = len(items)
    i = scroll
    while i < end:
        r = items[i]
        g.rect(ax + 10, y + 4, aw - 20, row_h - 8, PANEL2)
        g.text(r["name"], ax + 24, y + 12, TXT, size=14)
        g.text(r["threat"] + "   -   " + r["time"], ax + 24, y + 34, SUB,
               size=12)
        if button(mx, my, click, ax + aw - 210, y + 15, 92, 32, "Restore",
                  GREEN):
            unquarantine(r)
            return
        if button(mx, my, click, ax + aw - 110, y + 15, 92, 32, "Delete", RED):
            delete_q(r)
            return
        y += row_h
        i += 1

def draw_history(mx, my, click):
    items = S["history"]
    box = row_list(items, "scroll_h", mx, my, click)
    ax = box[0]
    ay = box[1]
    aw = box[2]
    header = box[4]
    visible = box[6]
    scroll = box[7]
    row_h = 40
    visible = int((box[3] - header - 44) // row_h)
    g.text("Detection history  (" + str(len(items)) + ")", ax + 16, ay + 14,
           TXT, size=15)
    if button(mx, my, click, ax + aw - 150, ay + 10, 120, 30, "Clear history",
              PANEL2):
        S["history"] = []
        save_history()
        return
    if not items:
        g.text("No detections yet.", ax + 16, ay + header + 20, SUB, size=13)
        return
    order = []
    j = len(items) - 1
    while j >= 0:
        order.append(items[j])
        j -= 1
    y = ay + header
    end = scroll + visible
    if end > len(order):
        end = len(order)
    i = scroll
    while i < end:
        r = order[i]
        acol = RED
        if r["action"] == "restored":
            acol = GREEN
        elif r["action"] == "cleaned":
            acol = ORANGE
        elif r["action"] == "alert":
            acol = ORANGE
        g.text(r["time"], ax + 20, y + 8, SUB, size=12)
        g.text(r["action"], ax + 110, y + 8, acol, size=12)
        g.text(r["threat"] + "  " + r["name"], ax + 220, y + 8, TXT, size=12)
        g.rect(ax + 14, y + 32, aw - 28, 1, LINE)
        y += row_h
        i += 1

def draw_settings(mx, my, click):
    ax = 20
    ay = 62
    panel(ax, ay, W - 40, H - ay - 20)
    g.text("Settings", ax + 16, ay + 14, TXT, size=16)
    y = ay + 60

    g.text("Realtime protection", ax + 24, y + 2, TXT, size=14)
    g.text("Scan files as they appear.", ax + 24, y + 22, SUB, size=11)
    if toggle(mx, my, click, ax + 320, y, S["protect"]):
        S["protect"] = not S["protect"]
        save_cfg()
    y += 60

    g.text("Sound alerts", ax + 24, y + 2, TXT, size=14)
    g.text("Play a tone when a threat is caught.", ax + 24, y + 22, SUB,
           size=11)
    if toggle(mx, my, click, ax + 320, y, S["sound"]):
        S["sound"] = not S["sound"]
        save_cfg()
    y += 70

    if button(mx, my, click, ax + 24, y, 220, 40, "Restore my files", ACCENT):
        restore_personal()
    g.text("Rebuild personal files from the backup vault.", ax + 260, y + 12,
           SUB, size=12)
    y += 54
    if button(mx, my, click, ax + 24, y, 220, 40, "Back up files now",
              PANEL2):
        for p in gather():
            maybe_backup(p)
        save_vault()
        toast("Backup updated (" + str(len(S["vault"])) + " files)")
    g.text("Snapshot writable files for restore.", ax + 260, y + 12, SUB,
           size=12)
    y += 70

    ms = check_system()
    if ms:
        g.text("System files missing: " + str(len(ms)), ax + 24, y, RED,
               size=13)
        g.text("Edgy can't rebuild C:\\Windows. Use BIOS > Restore Factory "
               "Defaults.", ax + 24, y + 22, SUB, size=11)
    else:
        g.text("System files: all present.", ax + 24, y, GREEN, size=13)

def draw_toast():
    if not S["toast"]:
        return
    if g.clock() - S["toast_t"] > 3.0:
        S["toast"] = ""
        return
    tw = 8 * len(S["toast"]) + 40
    g.rect(W / 2 - tw / 2, H - 44, tw, 30, "#0a1020")
    g.rect(W / 2 - tw / 2, H - 44, tw, 30, ACCENT, fill=False, width=1)
    g.text(S["toast"], W / 2, H - 37, TXT, size=12, align="center")

def main():
    g.init(W, H, "Edgy Defender")
    g.fps(FPS)
    load_cfg()
    load_quarantine()
    load_history()
    load_vault()
    S["known"] = gather()
    notify("Edgy Defender", "Security center is open. Realtime protection " +
           ("on." if S["protect"] else "off."))

    while g.running():
        m = g.mouse()
        mx = m[0]
        my = m[1]
        click = g.click()

        g.fill(BG)
        draw_tabs(mx, my, click)

        if S["tab"] == "dash":
            draw_dashboard(mx, my, click)
        elif S["tab"] == "quar":
            draw_quarantine(mx, my, click)
        elif S["tab"] == "hist":
            draw_history(mx, my, click)
        else:
            draw_settings(mx, my, click)

        draw_toast()

        if S["scanning"]:
            step_scan()
        elif S["protect"]:
            if g.clock() - S["rt_last"] >= RT_INTERVAL:
                realtime_tick()
                S["rt_last"] = g.clock()

        g.flip()

main()
