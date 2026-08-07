# ============================================================================
#  Edgy Defender  -  the antivirus with an attitude          # EDGY-DEFENDER-ALLOW
#  A realtime, pure-Python security suite for WinClone. No app.js edits.
#
#  WHAT IT DOES
#    - Realtime scanning of your folders (catches threats as files appear).
#    - PRE-EXECUTION detection: reads .py source and quarantines droppers
#      BEFORE you double-click them - the only point it can actually stop a
#      destructive script from running.
#    - Backs up your personal files to a vault and can RESTORE them later,
#      no factory reset needed.
#    - Junk-flood cleanup: sweeps the spam files viruses leave behind.
#    - System-file integrity monitor with honest recovery guidance.
#
#  HOW TO USE
#    1. Save this file as  EdgyDefender.py  in  Documents\Python.
#    2. Double-click it, or run  python EdgyDefender.py  in the Terminal.
#    3. Leave it running. That's the whole point of realtime protection.
#
#  THE "BUTTONS"  (this is a console app, so buttons are trigger files)
#    Create a file whose NAME starts with one of these, anywhere in a watched
#    folder (e.g. on the Desktop), and Edgy acts on the next sweep, then
#    deletes the trigger:
#       edgy-restore          -> restore your personal files from the vault
#       edgy-restore-system   -> attempt a system-file restore (see note below)
#       edgy-cleanup          -> sweep junk-flood spam right now
#       edgy-status           -> print / notify a status report
#
#  TRY THE DETECTOR
#    Make a text file containing the line  EDGY-DEFENDER-TEST-FILE  and drop it
#    in Downloads - it gets quarantined within a couple of seconds.
#
#  HONEST LIMITS (a browser-contained tool cannot lie about these)
#    - It CANNOT stop a script that is ALREADY running - deleting its file
#      doesn't kill the live interpreter. Pre-execution detection is the win.
#    - It CANNOT rebuild deleted SYSTEM files: WinClone blocks every app from
#      writing into C:\Windows. Recover those from the Recycle Bin (if they
#      weren't permanent-deleted) or BIOS > Restore Factory Defaults.
#    - PERSONAL-file restore works fully, because those folders are writable.
# ============================================================================

import winclone
import time

# ------------------------------- configuration ------------------------------
INTERVAL        = 2       # seconds between realtime sweeps
FULL_RESCAN     = 15      # every N ticks, deep-scan everything (not just new)
HEARTBEAT       = 10      # print an "all clear" status every N ticks
AGGRESSIVE      = False   # True = delete threats for good; False = Recycle Bin
STOP_HIJACKS    = True    # kill screen effects when a hijacker is caught
HEADLESS        = False   # True = hide our own window and run invisibly

BACKUP          = True    # keep a restore vault of personal files
CLEAN_FLOODS    = True    # auto-sweep junk-flood spam
SPAM_FLOOD      = 15      # this many same-name copies in a folder = a flood
MAX_FLOOD_TICK  = 150     # cap flood deletions per sweep (stay responsive)
MAX_VAULT_FILES = 400     # don't hoard the whole disk
MAX_FILE_CHARS  = 20000   # skip backing up anything bigger (likely media)
VAULT_SAVE_EVERY = 5      # persist the vault every N ticks if it changed

WATCH = [
    "C:\\Users\\User\\Desktop",
    "C:\\Users\\User\\Documents",
    "C:\\Users\\User\\Downloads",
    "C:\\Users\\User\\Pictures",
    "C:\\Users\\User\\Music",
]

VAULT_FILE = "C:\\Users\\User\\Documents\\EdgyDefender.vault"
LOG_FILE   = "C:\\Users\\User\\Documents\\EdgyDefender.log"

# Real WinClone system files, and where they live.
SYS_DIR   = "C:\\Windows\\System"
KNOWN_SYS = ["systemwinclone.sys", "SysWIW48.dll", "winclone_kernel.dll",
             "wclogon.exe", "bootmgr.wc"]
KNOWN_SYS_LOWER = []
for _n in KNOWN_SYS:
    KNOWN_SYS_LOWER.append(_n.lower())

# Files Edgy never touches (itself, its log, its vault).
WHITELIST  = ["edgydefender.py", "edgydefender.log", "edgydefender.vault",
              "edgyrestore.py"]
# Any file containing this marker is trusted and skipped. Drop it in a comment
# in your own scripts to opt them out of scanning.
ALLOW_MARK = "EDGY-DEFENDER-ALLOW"

# The trigger-file "buttons".
TRIGGERS = ["edgy-restore-system", "edgy-restore", "edgy-cleanup", "edgy-status"]

# Media we don't bother backing up (big binary-ish data URLs).
MEDIA_EXT = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".ico",
             ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".mov"]

# --------------------------- the signature database -------------------------
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

# Shared, mutable state so helper functions don't need `global`.
S = {"vault": {}, "vault_dirty": False, "scanned": 0, "quarantined": 0,
     "cleaned": 0, "known": [], "sys_alerted": [], "victims": []}


# ------------------------------- small helpers ------------------------------
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


def is_folder(path):
    try:
        winclone.ls(path)
        return True
    except Exception:
        return False


def gather():
    """Every file under every watched folder. Never raises."""
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
            path = folder + "\\" + name
            if is_folder(path):
                stack.append(path)
            else:
                found.append(path)
    return found


def has_media_ext(low):
    for ext in MEDIA_EXT:
        if low.endswith(ext):
            return True
    return False


def is_trigger(low):
    for t in TRIGGERS:
        if low.startswith(t):
            return True
    return False


def contains_any(text, needles):
    for n in needles:
        if n in text:
            return True
    return False


# ------------------------------- vault codec --------------------------------
# Newline/tab-safe, length-free escaping so any file content round-trips.
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
            nxt = s[i + 1]
            if nxt == "n":
                out += "\n"
            elif nxt == "r":
                out += "\r"
            elif nxt == "t":
                out += "\t"
            else:
                out += nxt
            i += 2
        else:
            out += ch
            i += 1
    return out


def encode_vault(vault):
    lines = ["EDGYVAULT2"]
    for path in vault.keys():
        lines.append(esc(path) + "\t" + esc(vault[path]))
    return "\n".join(lines)


def decode_vault(text):
    vault = {}
    lines = text.split("\n")
    if len(lines) == 0 or lines[0] != "EDGYVAULT2":
        return vault
    idx = 1
    while idx < len(lines):
        line = lines[idx]
        idx += 1
        if line == "":
            continue
        bits = line.split("\t", 1)
        if len(bits) == 2:
            vault[unesc(bits[0])] = unesc(bits[1])
    return vault


def load_vault():
    try:
        if winclone.exists(VAULT_FILE):
            S["vault"] = decode_vault(winclone.read(VAULT_FILE))
    except Exception:
        S["vault"] = {}


def save_vault():
    try:
        winclone.write(VAULT_FILE, encode_vault(S["vault"]), overwrite=True)
        S["vault_dirty"] = False
    except Exception:
        pass


# ------------------------------- detection ----------------------------------
def classify(path):
    """Return (threat_name, action) or None.
       actions: 'quarantine', 'hijack' (quarantine + stop effects),
                'victim' (encrypted file - alert, never delete)."""
    name = base(path)
    low = name.lower()

    if low in WHITELIST or is_trigger(low):
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

    # ---- filename rules ----
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

    # ---- content signatures ----
    for pair in CONTENT_SIGS:
        if pair[0] in cl:
            return (pair[1], "quarantine")

    # ---- static source analysis for scripts (pre-execution defense) ----
    if low.endswith(".py"):
        squash = cl.replace(" ", "")
        deletes = "del_file(" in squash or "del_file (" in cl
        hits_system = (contains_any(cl, KNOWN_SYS_LOWER) or
                       ("windows" in cl and "system" in cl))
        if deletes and hits_system:
            # a script that deletes system files: the dangerous one
            return ("Trojan.SystemWipe", "hijack")
        writes = cl.count("new_file(") + cl.count(".write(")
        if writes >= 20:
            return ("Trojan.Spammer", "quarantine")
        hides = "show_py_window(false" in squash
        drives = ".effect(" in cl
        if hides and drives:
            return ("Heuristic.ScreenHijack", "hijack")

    return None


# ------------------------------- actions ------------------------------------
def log(line):
    try:
        winclone.append(LOG_FILE, line + "\n")
    except Exception:
        pass


def quarantine(path):
    # Never delete system files, whatever a rule says.
    if is_windows_path(path):
        return False
    try:
        winclone.del_file(path, permanent=AGGRESSIVE, missing_ok=True)
        return True
    except Exception:
        return False


def strip_dupe(name):
    """'notes (3).txt' -> 'notes.txt', 'HACKED (2)' -> 'HACKED'."""
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


def sweep_floods(files, tick):
    """Group by folder + de-duplicated name; big identical-name families are
       spam floods. Returns number removed this sweep."""
    if not CLEAN_FLOODS:
        return 0
    groups = {}
    for path in files:
        name = base(path)
        low = name.lower()
        if low in WHITELIST or is_trigger(low) or has_media_ext(low):
            continue
        if is_windows_path(path):
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
        for path in members:
            if removed >= MAX_FLOOD_TICK:
                break
            if quarantine(path):
                removed += 1
        if removed:
            fam = strip_dupe(base(members[0]))
            print("  [" + str(tick) + "] SPAM FLOOD  " + str(len(members)) +
                  " x '" + fam + "'  ->  cleaning up")
            log("[tick " + str(tick) + "] Spam.Flood x" + str(len(members)) +
                " '" + fam + "'")
            winclone.notify("Edgy Defender cleaned up",
                            str(len(members)) + " junk files ('" + fam + "')")
    S["cleaned"] += removed
    return removed


# ------------------------------- backup -------------------------------------
def maybe_backup(path):
    if not BACKUP:
        return
    low = base(path).lower()
    if low in WHITELIST or is_trigger(low) or is_windows_path(path):
        return
    if has_media_ext(low):
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
    S["vault_dirty"] = True


# ------------------------------- restore ------------------------------------
def restore_personal(tick):
    restored = 0
    failed = 0
    intact = 0
    for path in S["vault"].keys():
        if is_windows_path(path):
            continue
        want = S["vault"][path]
        try:
            if winclone.exists(path) and winclone.read(path) == want:
                intact += 1
                continue
        except Exception:
            pass
        try:
            winclone.write(path, want, overwrite=True)
            restored += 1
        except Exception:
            failed += 1
    line = ("RESTORE: " + str(restored) + " file(s) restored, " +
            str(intact) + " already intact, " + str(failed) + " failed")
    print("  [" + str(tick) + "] " + line)
    log("[tick " + str(tick) + "] " + line)
    note = str(restored) + " personal file(s) restored"
    if failed:
        note += " (" + str(failed) + " failed - their folder may be gone)"
    winclone.notify("Edgy Defender", note)


def restore_system(tick):
    missing = []
    for n in KNOWN_SYS:
        if not winclone.exists(SYS_DIR + "\\" + n):
            missing.append(n)
    if not missing:
        print("  [" + str(tick) + "] SYSTEM: all system files present.")
        winclone.notify("Edgy Defender", "System files are all present.")
        return
    # Try - and report honestly when the OS refuses (it will).
    blocked = []
    for n in missing:
        try:
            winclone.new_file(SYS_DIR + "\\" + n, "")
        except Exception:
            blocked.append(n)
    if blocked:
        print("  [" + str(tick) + "] SYSTEM: cannot rebuild " +
              str(len(blocked)) + " file(s) - WinClone blocks writes to "
              "C:\\Windows.")
        print("           Recover via the Recycle Bin, or "
              "BIOS > Restore Factory Defaults.")
        log("[tick " + str(tick) + "] system restore blocked: " +
            ", ".join(blocked))
        winclone.notify("Edgy Defender",
                        "Can't rebuild system files (OS blocks C:\\Windows). "
                        "Use BIOS > Restore Factory Defaults.")
    else:
        print("  [" + str(tick) + "] SYSTEM: rebuilt " + str(len(missing)) +
              " file(s).")
        winclone.notify("Edgy Defender", "System files rebuilt.")


def report_status(tick):
    missing = []
    for n in KNOWN_SYS:
        if not winclone.exists(SYS_DIR + "\\" + n):
            missing.append(n)
    print("  [" + str(tick) + "] STATUS  scanned=" + str(S["scanned"]) +
          " quarantined=" + str(S["quarantined"]) +
          " cleaned=" + str(S["cleaned"]) +
          " vault=" + str(len(S["vault"])) +
          " sys_missing=" + str(len(missing)))
    body = ("Vault: " + str(len(S["vault"])) + " file(s). Quarantined: " +
            str(S["quarantined"]) + ".")
    if missing:
        body += " Missing system files: " + str(len(missing)) + "."
    winclone.notify("Edgy Defender status", body)


def handle_triggers(files, tick):
    for path in files:
        low = base(path).lower()
        if not is_trigger(low):
            continue
        if low.startswith("edgy-restore-system"):
            restore_system(tick)
        elif low.startswith("edgy-restore"):
            restore_personal(tick)
        elif low.startswith("edgy-cleanup"):
            sweep_floods(gather(), tick)
        elif low.startswith("edgy-status"):
            report_status(tick)
        try:
            winclone.del_file(path, permanent=True, missing_ok=True)
        except Exception:
            pass


def check_system(tick):
    for n in KNOWN_SYS:
        p = SYS_DIR + "\\" + n
        if winclone.exists(p):
            if n in S["sys_alerted"]:
                S["sys_alerted"].remove(n)
            continue
        if n in S["sys_alerted"]:
            continue
        S["sys_alerted"].append(n)
        crit = " (CRITICAL - the OS is on borrowed time)" if \
            n == "systemwinclone.sys" else ""
        print("  [" + str(tick) + "] SYSTEM FILE MISSING: " + n + crit)
        print("           Edgy can't rebuild C:\\Windows. Recover from the "
              "Recycle Bin or BIOS > Restore Factory Defaults.")
        log("[tick " + str(tick) + "] system file missing: " + n)
        winclone.notify("Edgy Defender - system file missing", n)
        winclone.beep("error")


# ------------------------------- the engine ---------------------------------
def banner():
    print("=" * 54)
    print("   E D G Y   D E F E N D E R")
    print("   the antivirus with an attitude")
    print("=" * 54)
    mode = "AGGRESSIVE (delete)" if AGGRESSIVE else "safe (Recycle Bin)"
    print("   realtime sweep : every " + str(INTERVAL) + "s")
    print("   quarantine     : " + mode)
    print("   backup vault   : " + ("on" if BACKUP else "off") +
          "  (" + str(len(S["vault"])) + " files loaded)")
    print("   buttons        : drop a file named edgy-restore / "
          "edgy-cleanup / edgy-status")
    print("-" * 54)


def scan_and_act(targets, tick):
    hits = 0
    for path in targets:
        S["scanned"] += 1
        result = classify(path)
        if result is None:
            continue
        threat = result[0]
        action = result[1]

        if action == "victim":
            if path not in S["victims"]:
                S["victims"].append(path)
                print("  [" + str(tick) + "] RANSOM VICTIM  " + threat + ": " +
                      base(path) + "  (left alone - run Cork Defender)")
                log("[tick " + str(tick) + "] VICTIM " + threat + ": " + path)
                winclone.notify("Edgy Defender",
                                base(path) + " is encrypted by ransomware")
                winclone.beep("error")
            continue

        hits += 1
        ok = quarantine(path)
        where = "deleted" if AGGRESSIVE else "Recycle Bin"
        state = "quarantined (" + where + ")" if ok else "COULD NOT REMOVE"
        print("  [" + str(tick) + "] THREAT  " + threat + ": " + base(path) +
              "  ->  " + state)
        log("[tick " + str(tick) + "] " + threat + ": " + path +
            " -> " + state)
        winclone.notify("Edgy Defender blocked a threat",
                        threat + ": " + base(path))
        winclone.beep("error")
        if action == "hijack" and STOP_HIJACKS:
            winclone.stop_effects()
            print("           -> screen hijack neutralised, effects stopped.")
        if ok:
            S["quarantined"] += 1
    return hits


def main():
    load_vault()
    banner()
    if HEADLESS:
        winclone.notify("Edgy Defender", "Realtime protection on. Going dark.")
        winclone.show_py_window(False)
    else:
        winclone.notify("Edgy Defender", "Realtime protection is on.")
    log("--- Edgy Defender started ---")

    first = True
    tick = 0
    while True:
        tick += 1
        files = gather()

        # Buttons first, so a requested restore/cleanup happens promptly.
        handle_triggers(files, tick)

        if first or (tick % FULL_RESCAN == 0):
            targets = files
        else:
            targets = []
            for p in files:
                if p not in S["known"]:
                    targets.append(p)

        hits = scan_and_act(targets, tick)
        cleaned = sweep_floods(files, tick)
        check_system(tick)

        # Back up whatever survived this sweep.
        if BACKUP:
            for p in gather():
                maybe_backup(p)
            if S["vault_dirty"] and (tick % VAULT_SAVE_EVERY == 0):
                save_vault()

        S["known"] = files
        first = False

        if hits == 0 and cleaned == 0 and (tick % HEARTBEAT == 0):
            waiting = len(S["victims"])
            extra = (", " + str(waiting) + " encrypted file(s) need Cork "
                     "Defender") if waiting else ""
            print("  [" + str(tick) + "] all clear - scanned " +
                  str(S["scanned"]) + ", quarantined " +
                  str(S["quarantined"]) + ", vault " + str(len(S["vault"])) +
                  extra)

        time.sleep(INTERVAL)


main()
