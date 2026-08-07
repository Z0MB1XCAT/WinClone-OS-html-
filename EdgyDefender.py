# ============================================================================
#  Edgy Defender  -  the antivirus with an attitude          # EDGY-DEFENDER-ALLOW
#  A realtime, pure-Python security suite for WinClone. No app.js edits.
#
#  HOW TO USE
#    1. Copy this whole file into WinClone: New > Python Script (or Notepad),
#       save it as  EdgyDefender.py  in  Documents\Python.
#    2. Double-click it, or run  python EdgyDefender.py  in the Terminal.
#    3. It scans your folders on a loop and quarantines anything nasty in
#       realtime. Leave it running - that's the whole point.
#
#  TRY IT
#    Make a file whose contents include the line   EDGY-DEFENDER-TEST-FILE
#    (a harmless EICAR-style marker), drop it in Downloads, and watch Edgy
#    Defender catch and quarantine it within a couple of seconds.
#
#  It stays in the browser. It only ever touches the WinClone virtual disk
#  through the winclone module, so it can't escape the tab - same as
#  everything else in here.
#
#  Everything can be turned off with the Stop button (unless you set
#  HEADLESS = True, in which case: reload the page).
# ============================================================================

import winclone
import time

# ----------------------------- configuration --------------------------------
INTERVAL       = 2       # seconds between realtime sweeps
FULL_RESCAN    = 15      # every N ticks do a full deep scan (not just new files)
HEARTBEAT      = 10      # print an "all clear" status every N ticks
AGGRESSIVE     = False   # True = delete threats for good; False = Recycle Bin
STOP_HIJACKS   = True    # kill screen effects when a screen-hijacker is caught
HEADLESS       = False   # True = hide our own window and run invisibly

# Folders to guard. Missing ones are skipped without complaint.
WATCH = [
    "C:\\Users\\User\\Desktop",
    "C:\\Users\\User\\Documents",
    "C:\\Users\\User\\Downloads",
    "C:\\Users\\User\\Pictures",
    "C:\\Users\\User\\Music",
]

LOG_FILE = "C:\\Users\\User\\Documents\\EdgyDefender.log"

# Files Edgy Defender will never quarantine (itself + its own log).
WHITELIST = ["edgydefender.py", "edgydefender.log"]

# Any file that contains this marker is trusted and skipped. Put it in a
# comment in your own scripts to opt them out of scanning.
ALLOW_MARK = "EDGY-DEFENDER-ALLOW"

# --------------------------- the signature database -------------------------
# Content substrings (matched case-insensitively). This is where a real AV
# keeps its virus definitions; ours is short and honest about being a toy.
CONTENT_SIGS = [
    ("edgy-defender-test-file",              "EICAR-Test"),
    ("eicar-standard-antivirus-test-file",   "EICAR-Test"),
    ("your files have been encrypted",       "Ransom.Note"),
    ("your files are being encrypted",       "Ransom.Note"),
    ("send cork coins",                      "Ransom.Note"),
    ("bitcork",                              "Ransom.BitCork"),
]

# Ransom-note style filenames.
RANSOM_NAMES = ["how_to_decrypt", "howtodecrypt", "decrypt_", "read_me",
                "readme_ransom", "restore_files", "recover_files"]

# Double-extension droppers - the classic "totally not an exe" trick.
BAD_EXT = [".txt.exe", ".jpg.exe", ".png.exe", ".pdf.exe", ".doc.exe",
           ".jpg.scr", ".png.scr", ".mp3.exe", ".mp4.exe", ".zip.exe"]

# Executable-ish extensions that are suspicious when they land in Downloads.
RISKY_DL_EXT = [".exe", ".scr", ".bat", ".com", ".cmd"]

# Scary words in a filename.
BAD_WORDS = ["virus", "trojan", "malware", "keylog", "spyware", "ransom",
             "backdoor", "coinminer", "payload", "rootkit", "hacktool"]


# ------------------------------- helpers ------------------------------------
def base(path):
    """Last path segment (the file name)."""
    i = path.rfind("\\")
    if i < 0:
        return path
    return path[i + 1:]


def is_folder(path):
    """A path is a folder if we can list it."""
    try:
        winclone.ls(path)
        return True
    except Exception:
        return False


def list_files(root):
    """Every file under root, recursively. Never raises."""
    found = []
    stack = [root]
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


def classify(path):
    """Return (threat_name, action) or None. Actions:
         'quarantine' - remove to Recycle Bin / delete
         'hijack'     - quarantine AND stop screen effects
         'victim'     - an encrypted user file: alert, do NOT delete
    """
    name = base(path)
    low = name.lower()

    if low in WHITELIST:
        return None

    # Try to read it. Ransomware-locked files refuse - those are victims,
    # not the malware itself, so we never delete them.
    try:
        content = winclone.read(path)
    except Exception as e:
        if "encrypted" in str(e).lower() or "ransom" in str(e).lower():
            return ("Ransom.Locked", "victim")
        return None

    if ALLOW_MARK in content:
        return None

    # --- name-based rules ---
    if low.startswith("wcworm_"):
        return ("Worm.Replika", "quarantine")

    for w in RANSOM_NAMES:
        if w in low:
            return ("Ransom.Note", "quarantine")

    for ext in BAD_EXT:
        if low.endswith(ext):
            return ("Trojan.Dropper", "quarantine")

    for w in BAD_WORDS:
        if w in low:
            return ("Suspicious.Name", "quarantine")

    # Executables that appear in Downloads are guilty until proven innocent.
    if "\\downloads\\" in path.lower():
        for ext in RISKY_DL_EXT:
            if low.endswith(ext):
                return ("Suspicious.Download", "quarantine")

    # --- content signatures ---
    cl = content.lower()
    for sig, label in CONTENT_SIGS:
        if sig in cl:
            return (label, "quarantine")

    # --- behavioural heuristic for scripts ---
    # A .py that hides its own window AND drives screen effects is almost
    # certainly one of those "un-closeable" prank viruses.
    if low.endswith(".py"):
        squash = cl.replace(" ", "")
        hides = "show_py_window(false" in squash
        hijacks = "winclone.effect(" in cl or ".effect(\"" in cl
        if hides and hijacks:
            return ("Heuristic.ScreenHijack", "hijack")

    return None


def log(line):
    try:
        winclone.append(LOG_FILE, line + "\n")
    except Exception:
        pass


def quarantine(path):
    """Move a threat to the Recycle Bin (or delete it if AGGRESSIVE)."""
    try:
        winclone.del_file(path, permanent=AGGRESSIVE, missing_ok=True)
        return True
    except Exception:
        return False


# ------------------------------- the engine ---------------------------------
def banner():
    print("=" * 52)
    print("   E D G Y   D E F E N D E R")
    print("   the antivirus with an attitude")
    print("=" * 52)
    mode = "AGGRESSIVE (permanent delete)" if AGGRESSIVE else "safe (Recycle Bin)"
    print(f"   realtime sweep : every {INTERVAL}s")
    print(f"   quarantine     : {mode}")
    print(f"   watching       : {len(WATCH)} folders")
    print("   Cork Defender could never. Leave me running.")
    print("-" * 52)


def main():
    banner()
    if HEADLESS:
        winclone.notify("Edgy Defender", "Realtime protection is on. Going dark.")
        winclone.show_py_window(False)
    else:
        winclone.notify("Edgy Defender", "Realtime protection is on.")

    log("--- Edgy Defender started ---")

    known = []            # file paths seen last sweep
    scanned_total = 0
    quarantined_total = 0
    victims = []          # encrypted files we've already warned about
    first = True
    tick = 0

    while True:
        tick += 1

        files = []
        for root in WATCH:
            for p in list_files(root):
                files.append(p)

        # Realtime: prioritise brand-new files; deep-scan everything now and
        # again in case something changed under our feet.
        if first or (tick % FULL_RESCAN == 0):
            targets = files
        else:
            targets = [p for p in files if p not in known]

        hits_this_tick = 0
        for path in targets:
            scanned_total += 1
            result = classify(path)
            if result is None:
                continue
            threat, action = result

            if action == "victim":
                if path not in victims:
                    victims.append(path)
                    msg = f"{base(path)} is encrypted by ransomware"
                    print(f"  [{tick}] RANSOM VICTIM  {threat}: {msg}")
                    print("         -> left alone. Run Cork Defender to decrypt it.")
                    log(f"[tick {tick}] VICTIM {threat}: {path}")
                    winclone.notify("Edgy Defender", msg)
                    winclone.beep("error")
                continue

            # Real threat -> quarantine it.
            hits_this_tick += 1
            ok = quarantine(path)
            where = "deleted" if AGGRESSIVE else "Recycle Bin"
            state = f"quarantined ({where})" if ok else "COULD NOT REMOVE"
            print(f"  [{tick}] THREAT  {threat}: {base(path)}  ->  {state}")
            log(f"[tick {tick}] {threat}: {path} -> {state}")
            winclone.notify("Edgy Defender blocked a threat", f"{threat}: {base(path)}")
            winclone.beep("error")

            if action == "hijack" and STOP_HIJACKS:
                winclone.stop_effects()
                print("         -> screen hijack neutralised, effects stopped.")
                log(f"[tick {tick}] stopped screen effects")

            if ok:
                quarantined_total += 1

        known = files
        first = False

        # Quiet heartbeat so you can see it's alive without spamming the log.
        if hits_this_tick == 0 and (tick % HEARTBEAT == 0):
            live = len(victims)
            extra = f", {live} encrypted file(s) awaiting Cork Defender" if live else ""
            print(f"  [{tick}] all clear - scanned {scanned_total}, "
                  f"quarantined {quarantined_total}{extra}")

        time.sleep(INTERVAL)


main()
