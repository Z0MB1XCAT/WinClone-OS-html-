/*!
 * WinClone — a FAN-MADE CONCEPT: a desktop-OS tribute that lives in a browser tab.
 *
 * Copyright (c) 2026 thisisuhhplanetring. All rights reserved.
 *
 * FAN PROJECT / CONCEPT PIECE. Not a real operating system. Not Microsoft
 * Windows. Contains no Microsoft code, artwork or assets — every part was
 * written from scratch. Not affiliated with, endorsed by or connected to
 * Microsoft Corporation. Free, never sold. "Windows" and "Microsoft" are
 * trademarks of their respective owners, referenced descriptively only.
 *
 * This file is the original work of thisisuhhplanetring. Read it, learn from it, modify your
 * own private copy, fork it on GitHub. Do NOT rehost or republish it as a site
 * of your own, or strip this notice. Full terms: see LICENSE.txt.
 */
"use strict";
/* ============================ VERSION ============================
   Bump WC_VERSION every release and add a matching WC_CHANGELOG entry.
   After an update, the new version's changelog is shown once on the next
   sign-in ("What's new"), and `winver` in the Terminal reports the version. */
const WC_VERSION = "1.4.0";
const WC_CHANGELOG = {
  "1.4.0": [
    "🌀 Screen FX — a new app full of effects that happen to the whole screen instead of inside a window. The desktop shakes, spins, melts, cracks, fills with static or turns upside down, and everything underneath keeps working.",
    "🫠 Twenty of them: Earthquake, Spin, Upside Down, Mirror, Breathe, Drunk, Melt, Heat Haze, Inverted, Rainbow, Lost My Glasses, Dread, TV Static, CRT, Datamosh, Cracked Screen, Cursor Swarm, Bugs, Digital Rain and Strobe. Stack as many as you like and drag the intensity slider.",
    "🤡 Joke.SalineClone — a new fake download that hijacks the effects and keeps picking new ones on its own. Cork Defender removes it.",
    "🐍 Python can take over the screen too: winclone.effect(\"melt\"), winclone.effect(\"all\"), winclone.effects() and winclone.stop_effects().",
    "⌨️ fx in the Terminal toggles any effect, and Ctrl+Alt+X is the panic button that stops everything at once.",
  ],
  "1.3.0": [
    "🛟 System Restore Points — a new app. Snapshot the whole PC before you try something risky, then roll back to it. Your password is never touched.",
    "💾 Python can't clobber your files by accident any more: winclone.write() on a name that's taken makes \"name (2)\" instead, just like pasting a file twice. Pass overwrite=True when you do mean replace.",
    "➕ New Python file commands — winclone.append(), winclone.exists(), winclone.new_file() and winclone.del_file() (add permanent=True to skip the Recycle Bin and really free the space).",
    "📂 winclone.open_app() opens anything now — an app, a file, or a folder, using whatever normally handles it.",
    "🙋 winclone.set_user_name() renames your account from a script, everywhere at once.",
    "🐛 Fixed: FileNotFoundError and PermissionError were being raised but didn't exist, so you couldn't catch them. Added those plus FileExistsError, IsADirectoryError and OSError.",
  ],
  "1.2.0": [
    "🗂️ Task View — the taskbar button opens an overview of every open window, with live thumbnails you can click, close, or drag.",
    "🖥️ Virtual desktops: make as many as 8, drag windows between them, and the taskbar only shows what's on the one you're using.",
    "⌨️ A window switcher on Alt+Tab (Windows usually eats that one, so Alt+` does the same). Ctrl+Alt+←/→ changes desktop, Ctrl+Alt+↑ opens Task View.",
    "🐍 Python. A real interpreter, written from scratch — variables, loops, functions, classes, f-strings, try/except, math and random.",
    "🎮 Python games actually run: import wcgame for a canvas, keys and sound. Five examples ship in Documents\\Python, Pong and Snake included.",
    "📄 New ▸ Python Script, double-click any .py to run it, or type python file.py in the Terminal.",
    "👹 CloneDOOM — a first-person raycaster with textured walls, sliding doors, demons that hunt you, a shotgun and a status bar. Yes, WinClone runs DOOM.",
    "🛟 System Restore Points — take a snapshot before you do something risky, and roll the whole PC back to it later. Your password is never touched.",
  ],
  "1.1.0": [
    "🔒 Your PC has a password now — set one on first boot, and pick a security question in case you forget it.",
    "🔑 Forgot it? Answer your security question right on the lock screen to set a new one.",
    "🪟 The whole shell now feels like Windows 10 — left-aligned taskbar with the white search box, square window corners, classic dark theme.",
    "🧱 A proper Windows 10 Start menu: power rail on the left, alphabetical app list, and colorful live tiles.",
    "📥 Action center — notifications slide in from the right edge, and toasts pop up above the tray.",
    "🔷 A real boot screen with the zigzag WinClone logo and spinning dots, plus startup / notification / error sounds.",
    "🖱️ Drag a selection box on the desktop, and the secret Show Desktop sliver at the taskbar's far right.",
    "🎯 Focused windows stand out with a deeper shadow; running taskbar apps get the accent underline.",
  ],
  "1.0.0": [
    "🎉 Version numbers arrive — check yours anytime by typing winver in the Terminal.",
    "📜 Batch files run: double-click a .bat (or run it in the Terminal), with a real del command.",
    "🔄 Manual updates — install new versions from Start ▸ Power ▸ Update and restart.",
    "✨ This What's New screen, shown once after each update.",
  ],
};

/* ============================ APP REGISTRY ============================ */
const APPS = {
  explorer:  {title:"File Explorer", icon:"📁", w:760, h:500, build:buildExplorer},
  notepad:   {title:"Notepad",       icon:"📝", w:600, h:440, build:buildNotepad},
  docs:      {title:"WinClone Docs", icon:"📘", w:860, h:620, build:buildDocs},
  calc:      {title:"Calculator",    icon:"🧮", w:340, h:500, build:buildCalc},
  terminal:  {title:"Terminal",      icon:"🖥️", w:660, h:420, build:buildTerminal},
  settings:  {title:"Settings",      icon:"⚙️", w:780, h:540, build:buildSettings},
  edge:      {title:"Microsoft Edge",icon:"🌐", w:820, h:560, build:buildEdge},
  photos:    {title:"Photos",        icon:"🖼️", w:700, h:520, build:buildPhotos},
  media:     {title:"Media Player",  icon:"🎞️", w:720, h:520, build:buildMedia},
  recycle:   {title:"Recycle Bin",   icon:"🗑️", w:560, h:420, build:buildRecycle},
  defender:  {title:"Cork Defender", icon:"🛡️", w:620, h:540, build:buildDefender},
  youtube:   {title:"YouTube",       icon:"▶️", w:860, h:600, build:buildYoutube},
  paint:     {title:"Paint",         icon:"🎨", w:720, h:560, build:buildPaint},
  taskmgr:   {title:"Task Manager",  icon:"📊", w:640, h:520, build:buildTaskmgr},
  mines:     {title:"Minesweeper",   icon:"💣", w:400, h:480, build:buildMines},
  snake:     {title:"Snake",         icon:"🐍", w:440, h:520, build:buildSnake},
  python:    {title:"Python",        icon:"🐍", w:840, h:620, build:buildPython},
  doom:      {title:"CloneDOOM",     icon:"👹", w:800, h:560, build:buildDoom},
  restore:   {title:"System Restore Points", icon:"🛟", w:680, h:520, build:buildRestore},
  screenfx:  {title:"Screen FX",     icon:"🌀", w:620, h:600, build:buildScreenFX},
  archive:   {title:"Archive",       icon:"🗜️", w:560, h:420, build:buildArchive, hidden:true},
  pyrun:     {title:"Python",        icon:"🐍", w:660, h:520, build:buildPyRun, hidden:true},
  htmlview:  {title:"HTML Viewer",   icon:"🌐", w:760, h:560, build:buildHtmlView, hidden:true},
  batch:     {title:"cmd.exe",       icon:"⬛", w:640, h:400, build:buildBatch, hidden:true},
};
/* Live-tile backgrounds: per-app gradients for the Start menu tiles (Win10 style) */
const TILE_BG = {
  explorer:"linear-gradient(135deg,#1f6fd0,#63b4ff)",
  notepad: "linear-gradient(135deg,#0e7490,#22d3ee)",
  docs:    "linear-gradient(135deg,#1e3a8a,#3b82f6)",
  calc:    "linear-gradient(135deg,#334155,#64748b)",
  terminal:"linear-gradient(135deg,#111827,#374151)",
  settings:"linear-gradient(135deg,#475569,#94a3b8)",
  edge:    "linear-gradient(135deg,#0ea5a4,#38bdf8)",
  photos:  "linear-gradient(135deg,#7c3aed,#ec4899)",
  media:   "linear-gradient(135deg,#ea580c,#facc15)",
  recycle: "linear-gradient(135deg,#52525b,#a1a1aa)",
  defender:"linear-gradient(135deg,#15803d,#4ade80)",
  youtube: "linear-gradient(135deg,#b91c1c,#f87171)",
  paint:   "linear-gradient(135deg,#9d174d,#f472b6)",
  taskmgr: "linear-gradient(135deg,#4338ca,#818cf8)",
  mines:   "linear-gradient(135deg,#92400e,#f59e0b)",
  snake:   "linear-gradient(135deg,#166534,#84cc16)",
  python:  "linear-gradient(135deg,#2b5b84,#ffd43b)",
  doom:    "linear-gradient(135deg,#5c1008,#c62d1f)",
  restore: "linear-gradient(135deg,#0f5c52,#2fb8a0)",
  screenfx:"linear-gradient(135deg,#3b0764,#a855f7)",
  pyrun:   "linear-gradient(135deg,#2b5b84,#ffd43b)",
  archive: "linear-gradient(135deg,#6b7280,#d1d5db)",
  htmlview:"linear-gradient(135deg,#c2410c,#fb923c)",
  batch:   "linear-gradient(135deg,#18181b,#3f3f46)",
};
const PINNED = ["edge","explorer","notepad","python","docs","calc","photos","settings","terminal","defender","restore","recycle"];
const TASKBAR_PINS = ["explorer","edge","notepad","terminal"];
const DESKTOP_ICONS = [
  {app:"recycle",  label:"Recycle Bin"},
  {app:"explorer", label:"This PC"},
  {app:"edge",     label:"Microsoft Edge"},
  {app:"defender", label:"Cork Defender"},
  {app:"youtube",  label:"YouTube"},
  {app:"paint",    label:"Paint"},
  {app:"taskmgr",  label:"Task Manager"},
  {app:"mines",    label:"Minesweeper"},
  {app:"snake",    label:"Snake"},
  {app:"python",   label:"Python"},
  {app:"doom",     label:"CloneDOOM"},
];

/* ============================ SOUND FX (synthesized, no audio files) ============================ */
let AC=null, lastSfx=0;
function sfx(kind){
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==="suspended") AC.resume();
    const now=Date.now();
    if(kind==="notify" && now-lastSfx<900) return;  // don't ding on top of another sound
    lastSfx=now;
    const t=AC.currentTime;
    const tone=(f,st,d,v,type)=>{ const o=AC.createOscillator(); o.type=type||"sine"; o.frequency.value=f;
      const g=AC.createGain(); g.gain.setValueAtTime(0,t+st); g.gain.linearRampToValueAtTime(v,t+st+.02);
      g.gain.exponentialRampToValueAtTime(.0001,t+st+d); o.connect(g); g.connect(AC.destination);
      o.start(t+st); o.stop(t+st+d+.05); };
    if(kind==="startup"){ tone(392,0,1.0,.10); tone(523.25,.13,1.0,.09); tone(659.25,.26,1.2,.08); tone(783.99,.40,1.6,.07); }
    else if(kind==="notify"){ tone(830,0,.22,.07); tone(1108,.09,.3,.06); }
    else if(kind==="error"){ tone(311,0,.28,.09,"triangle"); tone(233,.12,.34,.09,"triangle"); }
  }catch(e){}
}

/* ============================ STATE ============================ */
/* mru = most-recently-used window order, newest first (drives Alt+Tab).
   Virtual desktops live in VD (see the TASK VIEW section); every window
   record carries a .vd telling it which desktop it belongs to. */
const state = {z:20, wins:{}, focused:null, mru:[]};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function el(tag, cls, html){const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e;}
const deskArea = () => ({w:innerWidth, h:innerHeight-40});   // 40 = taskbar height (--tb-h)

/* ============================ WINDOW MANAGER ============================ */
function openApp(id){
  const app = APPS[id]; if(!app) return;
  if(state.wins[id]){
    const w=state.wins[id];
    if(w.vd!==VD.cur) switchDesktop(w.vd);      // already open on another desktop — go to it
    if(w.min) toggleMin(id,false);
    focusWin(id); return;
  }

  const win = el("div","window"); win.dataset.app=id;
  const area = deskArea();
  const w = Math.min(app.w, area.w-40), h = Math.min(app.h, area.h-40);
  const openCount = Object.keys(state.wins).length;
  let left = Math.max(20, (area.w-w)/2 + (openCount%6)*26 - 60);
  let top  = Math.max(16, (area.h-h)/2 + (openCount%6)*22 - 50);
  Object.assign(win.style,{width:w+"px",height:h+"px",left:left+"px",top:top+"px",zIndex:++state.z});

  win.innerHTML = `
    <div class="titlebar">
      <div class="tb-title"><span class="ic">${app.icon}</span><span class="tt">${app.title}</span></div>
      <div class="tb-controls">
        <button class="tb-btn min" title="Minimize"><svg viewBox="0 0 12 12"><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.2"/></svg></button>
        <button class="tb-btn max" title="Maximize"><svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button>
        <button class="tb-btn close" title="Close"><svg viewBox="0 0 12 12"><line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/><line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/></svg></button>
      </div>
    </div>
    <div class="window-body"></div>`;
  ["n","s","e","w","ne","nw","se","sw"].forEach(d=>{const h=el("div","rz rz-"+d);h.dataset.dir=d;win.appendChild(h);});
  $("#desktop").appendChild(win);

  const rec = {el:win, appId:id, min:false, max:false, prev:null, vd:VD.cur};
  state.wins[id]=rec;

  app.build(win.querySelector(".window-body"), win, rec);

  win.querySelector(".tb-btn.min").onclick = e=>{e.stopPropagation(); toggleMin(id,true);};
  win.querySelector(".tb-btn.max").onclick = e=>{e.stopPropagation(); toggleMax(id);};
  win.querySelector(".tb-btn.close").onclick = e=>{e.stopPropagation(); closeWin(id);};
  win.querySelector(".titlebar").addEventListener("dblclick", ()=>toggleMax(id));
  win.addEventListener("mousedown", ()=>focusWin(id));
  makeDraggable(win, rec);
  makeResizable(win, rec);

  requestAnimationFrame(()=>win.classList.add("show"));
  addTaskItem(id);
  focusWin(id);
}

function focusWin(id){
  const rec = state.wins[id]; if(!rec) return;
  rec.el.style.zIndex = ++state.z;
  state.focused = id;
  state.mru = [id, ...state.mru.filter(x=>x!==id)];   // newest first, for Alt+Tab
  document.querySelectorAll(".window").forEach(w=>w.classList.toggle("focused", w===rec.el));
  updateTaskItems();
}
function closeWin(id){
  const rec = state.wins[id]; if(!rec) return;
  rec.el.classList.remove("show");
  setTimeout(()=>rec.el.remove(),140);
  delete state.wins[id];
  state.mru = state.mru.filter(x=>x!==id);
  if(state.focused===id) state.focused=null;
  removeTaskItem(id);
  updateTaskItems();
  if(tvIsOpen()) renderTaskView();
}
function toggleMin(id, force){
  const rec = state.wins[id]; if(!rec) return;
  const min = force!=null ? force : !rec.min;
  rec.min = min;
  rec.el.classList.toggle("min", min);
  if(!min){ rec.el.style.zIndex = ++state.z; state.focused=id; }
  else if(state.focused===id){ state.focused=null; }
  updateTaskItems();
}
function toggleMax(id, instant){
  const rec = state.wins[id]; if(!rec) return;
  const win = rec.el;
  if(!instant){ win.classList.add("anim"); setTimeout(()=>win.classList.remove("anim"),260); }
  if(rec.max){
    Object.assign(win.style, rec.prev);
    win.classList.remove("max"); rec.max=false;
  }else{
    rec.prev = {left:win.style.left, top:win.style.top, width:win.style.width, height:win.style.height};
    const a=deskArea();
    Object.assign(win.style,{left:"0px",top:"0px",width:a.w+"px",height:a.h+"px"});
    win.classList.add("max"); rec.max=true;
  }
  focusWin(id);
}

function makeDraggable(win, rec){
  const bar = win.querySelector(".titlebar");
  bar.addEventListener("mousedown", e=>{
    if(e.target.closest(".tb-btn")) return;
    focusWin(rec.appId);
    if(rec.max){ // un-maximize on drag, keep cursor grip (instant — no animation mid-drag)
      const ratio = e.clientX / innerWidth;
      toggleMax(rec.appId, true);
      win.style.top="0px";
      win.style.left = (e.clientX - parseFloat(win.style.width)*ratio)+"px";
    }
    const sx=e.clientX, sy=e.clientY, ox=parseFloat(win.style.left), oy=parseFloat(win.style.top);
    const move = ev=>{
      let nx=ox+(ev.clientX-sx), ny=oy+(ev.clientY-sy);
      ny=Math.max(0,ny); nx=Math.min(Math.max(nx,-parseFloat(win.style.width)+80), innerWidth-80);
      win.style.left=nx+"px"; win.style.top=ny+"px";
      snapHint(ev);
    };
    const up = ev=>{
      document.removeEventListener("mousemove",move);
      document.removeEventListener("mouseup",up);
      applySnap(ev, rec);
    };
    document.addEventListener("mousemove",move);
    document.addEventListener("mouseup",up);
  });
}
let snapZone=null;
function snapHint(ev){
  snapZone = ev.clientY<6 ? "top" : ev.clientX<6 ? "left" : ev.clientX>innerWidth-6 ? "right" : null;
}
function applySnap(ev, rec){
  if(!snapZone) return;
  const win=rec.el, a=deskArea();
  win.classList.add("anim"); setTimeout(()=>win.classList.remove("anim"),260);
  rec.prev = {left:win.style.left, top:win.style.top, width:win.style.width, height:win.style.height};
  if(snapZone==="top"){ if(!rec.max) toggleMax(rec.appId); }
  else if(snapZone==="left"){ Object.assign(win.style,{left:"0px",top:"0px",width:(a.w/2)+"px",height:a.h+"px"}); }
  else if(snapZone==="right"){ Object.assign(win.style,{left:(a.w/2)+"px",top:"0px",width:(a.w/2)+"px",height:a.h+"px"}); }
  snapZone=null;
}
function makeResizable(win, rec){
  win.querySelectorAll(".rz").forEach(handle=>{
    handle.addEventListener("mousedown", e=>{
      e.stopPropagation(); focusWin(rec.appId);
      const dir=handle.dataset.dir;
      const sx=e.clientX, sy=e.clientY;
      const ox=parseFloat(win.style.left), oy=parseFloat(win.style.top);
      const ow=parseFloat(win.style.width), oh=parseFloat(win.style.height);
      const move=ev=>{
        let dx=ev.clientX-sx, dy=ev.clientY-sy;
        let L=ox,T=oy,W=ow,H=oh;
        if(dir.includes("e")) W=Math.max(280,ow+dx);
        if(dir.includes("s")) H=Math.max(160,oh+dy);
        if(dir.includes("w")){ W=Math.max(280,ow-dx); L=ox+(ow-W); }
        if(dir.includes("n")){ H=Math.max(160,oh-dy); T=oy+(oh-H); }
        Object.assign(win.style,{left:L+"px",top:T+"px",width:W+"px",height:H+"px"});
      };
      const up=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);};
      document.addEventListener("mousemove",move);
      document.addEventListener("mouseup",up);
    });
  });
}

/* ============================ TASKBAR ITEMS ============================ */
function renderTaskbarPins(){
  const c = $("#tb-apps"); c.innerHTML="";
  TASKBAR_PINS.forEach(id=>{
    const b = el("button","tbtn pin"); b.dataset.app=id;
    b.innerHTML = `<span class="gl">${APPS[id].icon}</span>`;
    b.title = APPS[id].title;
    b.onclick = ()=>taskClick(id);
    c.appendChild(b);
  });
}
function addTaskItem(id){
  const c = $("#tb-apps");
  let b = c.querySelector(`[data-app="${id}"]`);
  if(!b){
    b = el("button","tbtn"); b.dataset.app=id;
    b.innerHTML = `<span class="gl">${APPS[id].icon}</span>`;
    b.title = APPS[id].title;
    b.onclick = ()=>taskClick(id);
    c.appendChild(b);
  }
  updateTaskItems();
}
function removeTaskItem(id){
  if(TASKBAR_PINS.includes(id)) return;
  const b=$("#tb-apps").querySelector(`[data-app="${id}"]`);
  if(b) b.remove();
}
/* Like Windows 10, the taskbar only shows what's running on the desktop you're
   looking at. A pinned app open on another desktop shows as "not running" here;
   clicking it takes you over to that desktop instead of opening a second copy. */
function updateTaskItems(){
  document.querySelectorAll("#tb-apps .tbtn").forEach(b=>{
    const id=b.dataset.app, rec=state.wins[id];
    const here = !!rec && rec.vd===VD.cur;
    b.classList.toggle("run", here);
    b.classList.toggle("active", here && !rec.min && state.focused===id);
    b.style.display = (TASKBAR_PINS.includes(id) || here) ? "" : "none";
  });
}
function taskClick(id){
  const rec = state.wins[id];
  if(!rec){ openApp(id); return; }
  if(rec.vd!==VD.cur){ switchDesktop(rec.vd); if(rec.min) toggleMin(id,false); focusWin(id); return; }
  if(rec.min){ toggleMin(id,false); focusWin(id); }
  else if(state.focused===id){ toggleMin(id,true); }
  else focusWin(id);
}

/* ============================ TASK VIEW / VIRTUAL DESKTOPS / ALT+TAB ============================
   Windows 10's Task View: the taskbar button opens an overview of every window
   on the desktop you're on, with a strip of virtual desktops along the bottom.
   Each window record carries a .vd saying which desktop it lives on, and the
   taskbar only lists the current one.

   The thumbnails are real. Each card holds a scaled-down clone of the live
   window — but a cloned <canvas> comes out blank, so its pixels are copied
   across by hand, and cloned <iframe>s (which would re-fetch the page) are
   swapped for a placeholder.

   On keyboard shortcuts: Windows itself swallows Alt+Tab and every Win-key
   chord before the browser ever sees them, so the working shortcuts are the
   Ctrl+Alt ones below. Alt+Tab is still wired up for the cases where it does
   reach the page, with Alt+` as the reliable stand-in. */
const VD = {list:[{name:"Desktop 1"}], cur:0};

function vdWindows(d){ return Object.keys(state.wins).filter(id=>state.wins[id].vd===d); }
function applyVD(){
  Object.keys(state.wins).forEach(id=>{
    const rec=state.wins[id];
    rec.el.classList.toggle("vd-off", rec.vd!==VD.cur);
  });
  updateTaskItems();
}
function vdFlash(text){
  let f=$("#vd-flash");
  if(!f){ f=el("div"); f.id="vd-flash"; document.body.appendChild(f); }
  f.textContent=text;
  f.classList.remove("show"); void f.offsetWidth;   // restart the fade
  f.classList.add("show");
  clearTimeout(f._t); f._t=setTimeout(()=>f.classList.remove("show"),950);
}
function switchDesktop(i){
  if(i<0 || i>=VD.list.length || i===VD.cur) return;
  VD.cur=i;
  applyVD();
  const here=vdWindows(i).filter(id=>!state.wins[id].min);
  if(here.length){                                   // focus whatever was on top over there
    here.sort((a,b)=>(parseInt(state.wins[a].el.style.zIndex,10)||0)-(parseInt(state.wins[b].el.style.zIndex,10)||0));
    focusWin(here[here.length-1]);
  }else{
    state.focused=null;
    document.querySelectorAll(".window").forEach(w=>w.classList.remove("focused"));
    updateTaskItems();
  }
  vdFlash(VD.list[i].name);
  if(tvIsOpen()) renderTaskView();
}
function newDesktop(goThere){
  if(VD.list.length>=8){ showToast({icon:"🖥️",title:"Virtual desktops",body:"WinClone tops out at 8 desktops."}); return; }
  VD.list.push({name:"Desktop "+(VD.list.length+1)});
  if(goThere) switchDesktop(VD.list.length-1);
  else if(tvIsOpen()) renderTaskView();
}
function closeDesktop(i){
  if(VD.list.length<=1) return;
  const to = i===0 ? 0 : i-1;                        // its windows fall back one desktop, like Win10
  Object.keys(state.wins).forEach(id=>{
    const r=state.wins[id];
    if(r.vd===i) r.vd=to; else if(r.vd>i) r.vd--;
  });
  VD.list.splice(i,1);
  VD.list.forEach((d,n)=>{ if(/^Desktop \d+$/.test(d.name)) d.name="Desktop "+(n+1); });
  VD.cur = VD.cur===i ? Math.min(to, VD.list.length-1) : (VD.cur>i ? VD.cur-1 : VD.cur);
  applyVD();
  if(tvIsOpen()) renderTaskView();
}
function moveWinToDesktop(id,d){
  const r=state.wins[id];
  if(!r || d<0 || d>=VD.list.length || r.vd===d) return;
  r.vd=d;
  if(state.focused===id) state.focused=null;
  applyVD();
  if(tvIsOpen()) renderTaskView();
}

function winTitleOf(id){
  const r=state.wins[id], t=r&&r.el.querySelector(".tt");
  return (t&&t.textContent&&t.textContent.trim()) || (APPS[id]?APPS[id].title:id);
}
function winThumb(rec, maxW, maxH){
  const src=rec.el;
  const sw=Math.max(120, src.offsetWidth  || parseFloat(src.style.width)  || 400);
  const sh=Math.max(90,  src.offsetHeight || parseFloat(src.style.height) || 300);
  const scale=Math.min(maxW/sw, maxH/sh, 1);
  const box=el("div","tv-thumb");
  box.style.width =Math.round(sw*scale)+"px";
  box.style.height=Math.round(sh*scale)+"px";
  const clone=src.cloneNode(true);
  clone.classList.remove("min","vd-off","focused","anim");
  clone.removeAttribute("id");
  clone.style.cssText="position:absolute;left:0;top:0;margin:0;opacity:1;box-shadow:none;transition:none;"+
    "width:"+sw+"px;height:"+sh+"px;transform:scale("+scale+");transform-origin:0 0;pointer-events:none";
  clone.querySelectorAll(".rz").forEach(h=>h.remove());
  const live=src.querySelectorAll("canvas"), cop=clone.querySelectorAll("canvas");
  for(let i=0;i<live.length && i<cop.length;i++){
    try{ if(live[i].width && live[i].height) cop[i].getContext("2d").drawImage(live[i],0,0); }catch(e){}
  }
  clone.querySelectorAll("iframe").forEach(f=>{ f.replaceWith(el("div","tv-frame","🌐")); });
  box.appendChild(clone);
  return box;
}

let TVDRAG=null;
function tvIsOpen(){ const t=$("#taskview"); return !!t && t.classList.contains("open"); }
function renderTaskView(){
  const tv=$("#taskview"); if(!tv) return;
  const grid=tv.querySelector(".tv-grid"), desks=tv.querySelector(".tv-desks");
  if(!grid||!desks) return;
  grid.innerHTML=""; desks.innerHTML="";

  const ids=vdWindows(VD.cur);
  ids.sort((a,b)=>(parseInt(state.wins[b].el.style.zIndex,10)||0)-(parseInt(state.wins[a].el.style.zIndex,10)||0));
  if(!ids.length){
    grid.appendChild(el("div","tv-empty",
      `<div class="tv-eic">🪟</div><b>Nothing open on ${esc(VD.list[VD.cur].name)}</b>
       <span>Open something from Start — or drag a window here from another desktop.</span>`));
  }
  const across=Math.max(1,Math.min(ids.length,4));
  const cw=Math.max(170, Math.min(320, Math.floor((innerWidth-140)/across)-26));
  ids.forEach(id=>{
    const rec=state.wins[id];
    const card=el("div","tv-card"+(state.focused===id?" cur":""));
    card.dataset.app=id;
    card.appendChild(el("div","tv-cap",
      `<span class="gl">${APPS[id]?APPS[id].icon:"🪟"}</span><span class="nm">${esc(winTitleOf(id))}</span>`));
    const x=el("button","tv-x","✕"); x.title="Close";
    x.onclick=e=>{ e.stopPropagation(); closeWin(id); };
    card.appendChild(x);
    card.appendChild(winThumb(rec, cw, Math.round(cw*0.64)));
    card.onclick=()=>{ closeTaskView(); if(rec.min) toggleMin(id,false); focusWin(id); };
    card.draggable=true;
    card.addEventListener("dragstart",e=>{
      TVDRAG=id; card.classList.add("dragging");
      e.dataTransfer.effectAllowed="move";
      try{ e.dataTransfer.setData("text/plain",id); }catch(_){}
    });
    card.addEventListener("dragend",()=>{
      TVDRAG=null; card.classList.remove("dragging");
      document.querySelectorAll(".tv-desk.hot").forEach(d=>d.classList.remove("hot"));
    });
    grid.appendChild(card);
  });

  const row=el("div","tv-deskrow");
  VD.list.forEach((d,i)=>{
    const n=vdWindows(i).length;
    const card=el("div","tv-desk"+(i===VD.cur?" cur":""),
      `<div class="tv-dmini"><i></i><i></i></div>
       <div class="tv-dname">${esc(d.name)}</div>
       <div class="tv-dcount">${n} window${n===1?"":"s"}</div>`);
    card.onclick=()=>switchDesktop(i);
    if(VD.list.length>1){
      const x=el("button","tv-dx","✕"); x.title="Close "+d.name;
      x.onclick=e=>{ e.stopPropagation(); closeDesktop(i); };
      card.appendChild(x);
    }
    card.addEventListener("dragover",e=>{ if(TVDRAG==null) return; e.preventDefault(); card.classList.add("hot"); });
    card.addEventListener("dragleave",()=>card.classList.remove("hot"));
    card.addEventListener("drop",e=>{
      if(TVDRAG==null) return;
      e.preventDefault(); e.stopPropagation();
      card.classList.remove("hot");
      moveWinToDesktop(TVDRAG,i); TVDRAG=null;
    });
    row.appendChild(card);
  });
  const add=el("div","tv-desk tv-new",`<div class="tv-plus">＋</div><div class="tv-dname">New desktop</div>`);
  add.onclick=()=>newDesktop(false);
  row.appendChild(add);
  desks.appendChild(row);
  desks.appendChild(el("div","tv-hint",
    "Esc close · Ctrl+Alt+←/→ switch desktop · Ctrl+Alt+↑ Task View · Ctrl+Alt+D new desktop · Alt+Tab (or Alt+`) switch windows"));
}
function openTaskView(){
  const tv=$("#taskview"); if(!tv) return;
  closeFlyouts();
  renderTaskView();
  tv.classList.add("open");
  document.body.classList.add("tv-on");
  const b=$("#taskviewbtn"); if(b) b.classList.add("on");
}
function closeTaskView(){
  const tv=$("#taskview"); if(!tv) return;
  tv.classList.remove("open");
  document.body.classList.remove("tv-on");
  const b=$("#taskviewbtn"); if(b) b.classList.remove("on");
}
function toggleTaskView(){ tvIsOpen() ? closeTaskView() : openTaskView(); }

/* ---- Alt+Tab switcher ---- */
const ALT={open:false, idx:0, list:[]};
function altOrder(){
  const here=vdWindows(VD.cur);
  const out=state.mru.filter(id=>here.includes(id));
  here.forEach(id=>{ if(!out.includes(id)) out.push(id); });
  return out;
}
function altRender(){
  const box=$("#altswitch"); if(!box) return;
  box.innerHTML="";
  ALT.list.forEach((id,i)=>{
    const it=el("div","alt-item"+(i===ALT.idx?" sel":""),
      `<span class="ai">${APPS[id]?APPS[id].icon:"🪟"}</span><span class="an">${esc(winTitleOf(id))}</span>`);
    it.addEventListener("mouseenter",()=>{ ALT.idx=i; altRender(); });
    it.addEventListener("mousedown",e=>{ e.preventDefault(); ALT.idx=i; altCommit(); });
    box.appendChild(it);
  });
  box.classList.add("open");
}
function altStep(dir){
  if(!ALT.open){
    ALT.list=altOrder();
    if(ALT.list.length<2){                            // nothing to switch between
      const id=ALT.list[0];
      if(id && state.wins[id]){ if(state.wins[id].min) toggleMin(id,false); focusWin(id); }
      return;
    }
    ALT.open=true; ALT.idx=0;
  }
  const n=ALT.list.length;
  ALT.idx=(ALT.idx+dir+n)%n;
  altRender();
}
function altCommit(){
  if(!ALT.open) return;
  const id=ALT.list[ALT.idx];
  altClose();
  if(id && state.wins[id]){ if(state.wins[id].min) toggleMin(id,false); focusWin(id); }
}
function altClose(){
  ALT.open=false;
  const box=$("#altswitch");
  if(box){ box.classList.remove("open"); box.innerHTML=""; }
}

/* ---- shell-level keyboard shortcuts ---- */
function shellLocked(){ const lg=$("#login"); return !lg || !lg.classList.contains("hide"); }
addEventListener("keydown", e=>{
  if(shellLocked()) return;
  if(e.altKey && !e.ctrlKey && (e.key==="Tab" || e.key==="`" || e.code==="Backquote")){
    e.preventDefault(); altStep(e.shiftKey?-1:1); return;
  }
  if(e.ctrlKey && e.altKey){
    if(e.key==="ArrowRight"){ e.preventDefault(); switchDesktop(VD.cur+1); return; }
    if(e.key==="ArrowLeft" ){ e.preventDefault(); switchDesktop(VD.cur-1); return; }
    if(e.key==="ArrowUp"   ){ e.preventDefault(); toggleTaskView(); return; }
    if(e.key==="d"||e.key==="D"){ e.preventDefault(); newDesktop(true); return; }
    if(e.key==="x"||e.key==="X"){                        // panic button for Screen FX
      e.preventDefault();
      const had=SFX.on.size;
      sfxStopAll();
      if(had&&hasKind("joke")) malToast("🤡","Joke.SalineClone","Screen cleared — but the joke virus is still installed and will start again. Run Cork Defender.");
      else if(had) showToast({icon:"🌀",title:"Screen FX stopped",body:"All "+had+" effect(s) switched off."});
      return;
    }
  }
  if(e.key==="Escape"){
    if(ALT.open){ e.preventDefault(); altClose(); return; }
    if(tvIsOpen()){ e.preventDefault(); closeTaskView(); return; }
  }
}, true);
addEventListener("keyup", e=>{ if(ALT.open && (e.key==="Alt" || !e.altKey)) altCommit(); });
addEventListener("blur", ()=>{ if(ALT.open) altCommit(); });   // OS stole Alt+Tab — don't leave it hanging
(function(){
  const tv=$("#taskview"); if(!tv) return;
  tv.addEventListener("click", e=>{
    if(e.target===tv || e.target.classList.contains("tv-scroll") || e.target.classList.contains("tv-grid")) closeTaskView();
  });
})();

/* ============================ DESKTOP ICONS ============================
   Icons sit on a fixed grid and can be dragged to any free cell; the chosen
   cell is remembered in wc_iconpos. Anything without a saved cell auto-fills
   top-to-bottom then across, the way Windows does. */
const ICON_GRID={x:10,y:10,w:88,h:92};
const IPOS_KEY="wc_iconpos";
let ICONPOS={}; try{ ICONPOS=JSON.parse(localStorage.getItem(IPOS_KEY))||{}; }catch(e){ ICONPOS={}; }
let ICONLIST=[];
function saveIconPos(){ try{ localStorage.setItem(IPOS_KEY,JSON.stringify(ICONPOS)); }catch(e){} }
function gridDims(){
  return {
    cols:Math.max(1,Math.floor((innerWidth-ICON_GRID.x)/ICON_GRID.w)),
    rows:Math.max(1,Math.floor((innerHeight-40-ICON_GRID.y)/ICON_GRID.h))
  };
}
function nearestFreeCell(taken,c,r){
  const {cols,rows}=gridDims();
  c=Math.max(0,Math.min(c,cols-1)); r=Math.max(0,Math.min(r,rows-1));
  if(!taken.has(c+","+r)) return [c,r];
  for(let d=1;d<=cols+rows;d++){
    for(let dc=-d;dc<=d;dc++) for(let dr=-d;dr<=d;dr++){
      if(Math.max(Math.abs(dc),Math.abs(dr))!==d) continue;
      const nc=c+dc, nr=r+dr;
      if(nc<0||nr<0||nc>=cols||nr>=rows) continue;
      if(!taken.has(nc+","+nr)) return [nc,nr];
    }
  }
  return [c,r];
}
function layoutIcons(list){
  const {cols,rows}=gridDims();
  const taken=new Set(), pending=[];
  list.forEach(it=>{
    const p=ICONPOS[it.key];
    if(Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
       && p[0]>=0 && p[1]>=0 && p[0]<cols && p[1]<rows && !taken.has(p[0]+","+p[1])){
      it.cell=[p[0],p[1]]; taken.add(p[0]+","+p[1]);
    } else pending.push(it);
  });
  let c=0,r=0;
  pending.forEach(it=>{
    while(taken.has(c+","+r) && c<cols){ r++; if(r>=rows){ r=0; c++; } }
    it.cell=[c,r]; taken.add(c+","+r);
  });
  list.forEach(it=>{
    it.el.style.left=(ICON_GRID.x+it.cell[0]*ICON_GRID.w)+"px";
    it.el.style.top =(ICON_GRID.y+it.cell[1]*ICON_GRID.h)+"px";
  });
}
/* drop an icon at a pixel position -> snap to the nearest free grid cell */
function placeIconAt(key,x,y){
  const c=Math.round((x-ICON_GRID.x)/ICON_GRID.w);
  const r=Math.round((y-ICON_GRID.y)/ICON_GRID.h);
  const taken=new Set();
  ICONLIST.forEach(it=>{ if(it.key!==key && it.cell) taken.add(it.cell[0]+","+it.cell[1]); });
  ICONPOS[key]=nearestFreeCell(taken,c,r);
  saveIconPos(); renderDesktopIcons();
}
let ICONDRAG=null;   // {key,dx,dy} while an icon is being repositioned
function makeIconDraggable(elm,key){
  elm.draggable=true;
  elm.addEventListener("dragstart",e=>{
    const r=elm.getBoundingClientRect();
    ICONDRAG={key,dx:e.clientX-r.left,dy:e.clientY-r.top};
    e.dataTransfer.effectAllowed="move";
    try{ e.dataTransfer.setData("text/plain",key); }catch(_){}
    elm.classList.add("dragging");
  });
  elm.addEventListener("dragend",()=>{ ICONDRAG=null; elm.classList.remove("dragging"); });
}

function renderDesktopIcons(){
  const c=$("#icons"); if(!c) return; c.innerHTML="";
  const sel=e=>{ document.querySelectorAll(".dicon.sel").forEach(x=>x.classList.remove("sel")); e.currentTarget.classList.add("sel"); e.stopPropagation(); };
  const dpath=[...HOME_PATH,"Desktop"];
  const list=[];
  DESKTOP_ICONS.forEach(d=>{
    const i=el("div","dicon");
    i.innerHTML=`<div class="gl">${APPS[d.app].icon}</div><div class="lbl">${d.label}</div>`;
    i.onclick=sel;
    i.ondblclick=()=>openApp(d.app);
    if(d.app==="recycle"){ // drop a file here to delete it
      i.addEventListener("dragover",e=>{ if(DRAG){ e.preventDefault(); i.classList.add("recycle-hot"); } });
      i.addEventListener("dragleave",()=>i.classList.remove("recycle-hot"));
      i.addEventListener("drop",e=>{ if(!DRAG) return; e.preventDefault(); e.stopPropagation(); i.classList.remove("recycle-hot"); deleteAt(DRAG.path,DRAG.name); });
    }
    makeIconDraggable(i,"app:"+d.app);
    list.push({key:"app:"+d.app, el:i});
    c.appendChild(i);
  });
  const dt=nodeAt(dpath);
  if(dt&&dt.children) Object.keys(dt.children).forEach(name=>{
    const item=dt.children[name];
    const i=el("div","dicon"+(isLnk(name,item)?" is-lnk":""));
    i.innerHTML=`<div class="gl">${glyphFor(name,item)}</div><div class="lbl">${esc(name)}</div>`;
    i.onclick=sel;
    i.ondblclick=()=>fsOpen(dpath,name,item);
    i.oncontextmenu=e=>{ e.preventDefault(); e.stopPropagation(); fsItemMenu(e.clientX,e.clientY,dpath,name,item); };
    makeDragSource(i,dpath,name,item);   // lets it be dropped into folders / Explorer / Recycle Bin
    // ...and also track it as a grid move, so dropping on bare desktop just repositions it
    i.addEventListener("dragstart",e=>{
      const r=i.getBoundingClientRect();
      ICONDRAG={key:"file:"+name,dx:e.clientX-r.left,dy:e.clientY-r.top};
    });
    i.addEventListener("dragend",()=>{ ICONDRAG=null; });
    if(item.folder) makeDropTarget(i,()=>[...dpath,name]);
    list.push({key:"file:"+name, el:i});
    c.appendChild(i);
  });
  // forget saved cells for icons that no longer exist, then lay the rest out
  const live=new Set(list.map(it=>it.key));
  let pruned=false;
  Object.keys(ICONPOS).forEach(k=>{ if(!live.has(k)){ delete ICONPOS[k]; pruned=true; } });
  if(pruned) saveIconPos();   // keep storage in step with memory (only writes when something went away)
  ICONLIST=list;
  layoutIcons(list);
}

/* ============================ START / FLYOUTS ============================ */
function searchVFS(q,limit){
  q=q.toLowerCase(); const out=[]; limit=limit||10;
  (function walk(node,path){
    const kids=node.children||{};
    for(const k of Object.keys(kids)){
      if(out.length>=limit) return;
      const it=kids[k];
      if(k.toLowerCase().includes(q)) out.push({name:k,path:[...path],item:it});
      if(it.folder) walk(it,[...path,k]);
    }
  })({children:VFS},[]);
  return out.slice(0,limit);
}
function renderStartGrid(filter){
  const g=$("#sm-grid"), list=$("#sm-list"); if(!g||!list) return;
  g.innerHTML=""; list.innerHTML="";
  const f=(filter||"").toLowerCase();
  // left column: alphabetical all-apps list with letter headers (Win10 style)
  const ids=Object.keys(APPS).filter(id=>!APPS[id].hidden && (!f || APPS[id].title.toLowerCase().includes(f)))
    .sort((a,b)=>APPS[a].title.localeCompare(APPS[b].title));
  let letter="";
  ids.forEach(id=>{
    const L=APPS[id].title[0].toUpperCase();
    if(!f && L!==letter){ letter=L; list.appendChild(el("div","sm-letter",L)); }
    const row=el("div","sm-row",`<span class="gl">${APPS[id].icon}</span><span class="nm">${esc(APPS[id].title)}</span>`);
    row.onclick=()=>{ closeFlyouts(); openApp(id); };
    row.oncontextmenu=e=>{ e.preventDefault(); e.stopPropagation();
      showCtx(e.clientX,e.clientY,[{icon:"🖥️",label:"Add to desktop",action:()=>{ addAppShortcutToDesktop(id); closeFlyouts(); }}]); };
    list.appendChild(row);
  });
  if(f){
    const files=searchVFS(f,10);
    if(files.length){
      list.appendChild(el("div","sm-letter","Files & folders"));
      files.forEach(r=>{
        const a=el("div","sm-row",`<span class="gl">${r.item.folder?"📁":glyphFor(r.name,r.item)}</span><span class="nm">${esc(r.name)}</span>`);
        a.title=r.path.join(" › ");
        a.onclick=()=>{ closeFlyouts(); if(r.item.folder) openExplorerAt([...r.path,r.name]); else fsOpen([...r.path],r.name,r.item); };
        list.appendChild(a);
      });
    }
  }
  // right column: live tiles for the pinned apps
  PINNED.forEach(id=>{
    const t=el("div","sm-tile",`<span class="tgl">${APPS[id].icon}</span><span class="tnm">${esc(APPS[id].title)}</span>`);
    t.style.background=TILE_BG[id]||"linear-gradient(135deg,#475569,#64748b)";
    t.onclick=()=>{ closeFlyouts(); openApp(id); };
    t.oncontextmenu=e=>{ e.preventDefault(); e.stopPropagation();
      showCtx(e.clientX,e.clientY,[{icon:"🖥️",label:"Add to desktop",action:()=>{ addAppShortcutToDesktop(id); closeFlyouts(); }}]); };
    g.appendChild(t);
  });
}
function closeFlyouts(){ document.querySelectorAll(".flyout.open").forEach(f=>f.classList.remove("open")); }
function toggleFlyout(sel){
  const f=$(sel), wasOpen=f.classList.contains("open");
  closeFlyouts();
  if(!wasOpen) f.classList.add("open");
}

/* ============================ CLOCK / CALENDAR ============================ */
function tick(){
  const d=new Date();
  const time = d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  const dateS = d.toLocaleDateString();
  $("#clk-time").textContent = time;
  $("#clk-date").textContent = dateS;
  $("#lg-time").textContent = d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  $("#lg-date").textContent = d.toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"});
  $("#cal-time").textContent = d.toLocaleTimeString();
  $("#cal-date").textContent = d.toLocaleDateString([], {weekday:"long", year:"numeric", month:"long", day:"numeric"});
}
function renderCalendar(){
  const g=$("#cal-grid"); g.innerHTML="";
  const now=new Date(), y=now.getFullYear(), m=now.getMonth(), today=now.getDate();
  ["Su","Mo","Tu","We","Th","Fr","Sa"].forEach(d=>g.appendChild(el("div","dow",d)));
  const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
  for(let i=0;i<first;i++) g.appendChild(el("div","cd",""));
  for(let d=1;d<=days;d++){ const c=el("div","cd"+(d===today?" today":""),d); g.appendChild(c); }
}

/* ============================ CONTEXT MENU ============================ */
function showCtx(x,y,items){
  const m=$("#ctx"); m.innerHTML="";
  items.forEach(it=>{
    if(it==="sep"){ m.appendChild(el("div","ctx-sep")); return; }
    const row=el("div","ctx-item",`<span class="gl">${it.icon||""}</span><span>${it.label}</span>${it.arrow?'<span class="arw">›</span>':''}`);
    if(it.action) row.onclick=ev=>{ ev.stopPropagation(); m.style.display="none"; it.action(); };
    m.appendChild(row);
  });
  m.style.display="block";
  const bw=m.offsetWidth, bh=m.offsetHeight;
  m.style.left=Math.min(x, innerWidth-bw-6)+"px";
  m.style.top =Math.min(y, innerHeight-bh-6)+"px";
}
document.addEventListener("contextmenu", e=>{
  e.preventDefault();
  if(e.target.closest(".window")) { showCtx(e.clientX,e.clientY,[
      {icon:"✂️",label:"Cut"},{icon:"📋",label:"Copy"},{icon:"📄",label:"Paste"},"sep",
      {icon:"🔄",label:"Reload",action:()=>location.reload()}
  ]); return; }
  const dpath=[...HOME_PATH,"Desktop"];
  const menu=[
    {icon:"🔄",label:"Refresh", action:()=>renderDesktopIcons()},
    {icon:"🗂️",label:"Show Task View", action:()=>openTaskView()},
    {icon:"➕",label:"New desktop", action:()=>newDesktop(true)},
    "sep",
    {icon:"📄",label:"New", arrow:true, action:()=>newMenu(e.clientX,e.clientY,dpath)},
    {icon:"📥",label:"Import image…", action:()=>importImages(dpath)},
    {icon:"📎",label:"Import files…", action:()=>importFilesTo(dpath)},
  ];
  if(CLIP) menu.push({icon:"📋",label:"Paste",action:()=>clipPaste(dpath)});
  menu.push("sep",
    {icon:"🖥️",label:"Display settings", action:()=>openApp("settings")},
    {icon:"🎨",label:"Personalize", action:()=>{ SETTINGS_PENDING="personal"; openApp("settings"); }},
    "sep",
    {icon:"🖥️",label:"Open Terminal", action:()=>openApp("terminal")});
  showCtx(e.clientX,e.clientY,menu);
});
document.addEventListener("click", e=>{
  if(!e.target.closest("#ctx")) $("#ctx").style.display="none";
  if(!e.target.closest(".flyout") && !e.target.closest("#startbtn") && !e.target.closest("#quickbtn")
     && !e.target.closest("#tray-clock") && !e.target.closest("#searchbtn") && !e.target.closest("#notifbtn")) closeFlyouts();
  if(!e.target.closest(".dicon")) document.querySelectorAll(".dicon.sel").forEach(x=>x.classList.remove("sel"));
});

/* ============================ APP BUILDERS ============================ */
/* ---- file open/save dialog (shared) ---- */
function fileDialog(opts){
  const d=el("div","dlg");
  d.style.width="380px";
  d.innerHTML=`<div class="dlg-head"><span>${opts.mode==="open"?"Open file":"Save As"}</span><button class="x">✕</button></div>
    <div style="padding:12px 14px">
      <div style="display:flex;gap:8px;align-items:center">
        <button class="dlg-btn" data-up style="padding:4px 12px">↑</button>
        <div class="crumb" style="font-size:11.5px;color:#9a9a9a;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"></div>
      </div>
      <div class="fdlg-list"></div>
      ${opts.mode==="save"?'<input class="fdlg-name" placeholder="File name" spellcheck="false">':""}
    </div>
    <div class="dlg-foot"><button class="dlg-btn pri" data-ok>${opts.mode==="open"?"Open":"Save"}</button><button class="dlg-btn" data-cancel>Cancel</button></div>`;
  document.body.appendChild(d);
  d.style.left=Math.max(10,(innerWidth-400)/2)+"px";
  d.style.top=Math.max(10,(innerHeight-440)/2)+"px";
  d.style.zIndex=60000+(++state.z);
  let path=[...HOME_PATH,"Documents"], sel=null;
  const list=d.querySelector(".fdlg-list"), crumb=d.querySelector(".crumb"), nameIn=d.querySelector(".fdlg-name");
  function render(){
    const n=nodeAt(path); if(!n){ path=[...HOME_PATH]; return render(); }
    sel=null;
    crumb.textContent="This PC › "+path.join(" › ");
    list.innerHTML="";
    const kids=n.children||{};
    Object.keys(kids).forEach(k=>{
      const it=kids[k];
      const isText=!it.folder && (k.endsWith(".txt")||k.endsWith(".docx")||it.content!=null);
      if(!it.folder && !isText) return;
      const row=el("div","fdlg-row",`<span>${it.folder?"📁":(it.icon||"📄")}</span><span>${esc(k)}</span>`);
      row.onclick=()=>{
        if(it.folder){ path=[...path,k]; render(); return; }
        list.querySelectorAll(".sel").forEach(x=>x.classList.remove("sel"));
        row.classList.add("sel"); sel=k; if(nameIn) nameIn.value=k;
      };
      list.appendChild(row);
    });
    if(!list.children.length) list.innerHTML=`<div style="color:#888;padding:12px;font-size:12px">Empty folder</div>`;
  }
  d.querySelector("[data-up]").onclick=()=>{ if(path.length>1){ path=path.slice(0,-1); render(); } };
  d.querySelector("[data-cancel]").onclick=()=>d.remove();
  d.querySelector(".x").onclick=()=>d.remove();
  d.querySelector("[data-ok]").onclick=()=>{
    if(opts.mode==="open"){
      if(!sel) return;
      d.remove(); opts.cb([...path],sel);
    }else{
      let name=(nameIn.value||"").trim();
      if(!name) return;
      if(!/\.[a-z0-9]+$/i.test(name)) name+=".txt";
      d.remove(); opts.cb([...path],name);
    }
  };
  render();
}

/* ---- notepad ---- */
let NP_PENDING=null;
const NP={loader:null};
function openFileInNotepad(pn){
  if(state.wins.notepad && NP.loader){
    if(state.wins.notepad.min) toggleMin("notepad",false);
    focusWin("notepad"); NP.loader(pn);
  } else { NP_PENDING=pn; openApp("notepad"); }
}
function buildNotepad(body, win){
  body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%">
    <div class="np-menu"><span data-m="new">New</span><span data-m="open">Open…</span><span data-m="save">Save</span><span data-m="saveas">Save As…</span></div>
    <div style="flex:1"><textarea class="np-area" spellcheck="false" placeholder="Type here…"></textarea></div>
  </div>`;
  const ta=body.querySelector(".np-area");
  let cur=null;
  const setTitle=()=>{ win.querySelector(".tt").textContent=(cur?cur.name:"Untitled")+" — Notepad"; };
  function load(pn){
    const parent=nodeAt(pn.path), f=parent&&parent.children[pn.name];
    if(!f){ winDialog({icon:"❌",title:"Notepad",msg:"File not found."}); return; }
    ta.value=f.content||""; cur={path:pn.path,name:pn.name}; setTitle();
  }
  NP.loader=load;
  function doSave(path,name){
    const parent=nodeAt(path); if(!parent||!parent.children) return;
    const ex=parent.children[name];
    if(ex&&ex.folder){ winDialog({icon:"❌",title:"Notepad",msg:"A folder with that name already exists."}); return; }
    parent.children[name]=Object.assign(ex||{icon:"📄"},{content:ta.value});
    cur={path:[...path],name}; setTitle(); saveFS(); refreshFX();
  }
  body.querySelectorAll("[data-m]").forEach(m=>m.onclick=()=>{
    const k=m.dataset.m;
    if(k==="new"){ ta.value=""; cur=null; setTitle(); }
    else if(k==="open") fileDialog({mode:"open",cb:(p,n)=>load({path:p,name:n})});
    else if(k==="save"){ if(cur) doSave(cur.path,cur.name); else fileDialog({mode:"save",cb:doSave}); }
    else if(k==="saveas") fileDialog({mode:"save",cb:doSave});
  });
  if(NP_PENDING){ load(NP_PENDING); NP_PENDING=null; } else setTitle();
}

/* ---- WinClone Docs: a Google-Docs-style rich text editor ---- */
let DOC_PENDING=null; const DOC={loader:null};
function openDocs(pn){
  if(state.wins.docs && DOC.loader){ if(state.wins.docs.min) toggleMin("docs",false); focusWin("docs"); DOC.loader(pn); }
  else { DOC_PENDING=pn; openApp("docs"); }
}
function docTextToHtml(t){
  if(!t) return "<p><br></p>";
  return t.split(/\n{2,}/).map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("");
}
function buildDocs(body,win){
  body.innerHTML=`<div class="docs">
    <div class="docs-head">
      <span class="ic">📘</span>
      <input class="docs-title" value="Untitled document" spellcheck="false">
      <span class="docs-status" data-status>All changes saved</span>
    </div>
    <div class="docs-tools">
      <button class="docs-tool" data-c="undo" title="Undo">↶</button>
      <button class="docs-tool" data-c="redo" title="Redo">↷</button>
      <span class="docs-sep"></span>
      <select class="docs-sel" data-block title="Paragraph style">
        <option value="P">Normal text</option>
        <option value="H1">Title</option>
        <option value="H2">Heading</option>
        <option value="H3">Subheading</option>
      </select>
      <select class="docs-sel" data-size title="Font size">
        <option value="2">Small</option>
        <option value="3" selected>Normal</option>
        <option value="5">Large</option>
        <option value="6">Huge</option>
      </select>
      <span class="docs-sep"></span>
      <button class="docs-tool" data-c="bold" title="Bold"><b>B</b></button>
      <button class="docs-tool" data-c="italic" title="Italic"><i>I</i></button>
      <button class="docs-tool" data-c="underline" title="Underline"><u>U</u></button>
      <button class="docs-tool" data-c="strikeThrough" title="Strikethrough"><s>S</s></button>
      <label class="docs-tool docs-color" title="Text color"><span data-fc style="color:#1a73e8;font-weight:700">A</span><input type="color" data-color value="#1a73e8"></label>
      <span class="docs-sep"></span>
      <button class="docs-tool" data-c="justifyLeft" title="Align left">☰</button>
      <button class="docs-tool" data-c="justifyCenter" title="Center">≣</button>
      <button class="docs-tool" data-c="justifyRight" title="Align right">☰</button>
      <span class="docs-sep"></span>
      <button class="docs-tool" data-c="insertUnorderedList" title="Bulleted list">•</button>
      <button class="docs-tool" data-c="insertOrderedList" title="Numbered list">1.</button>
      <button class="docs-tool" data-c="removeFormat" title="Clear formatting">✕</button>
    </div>
    <div class="docs-canvas"><div class="docs-page" contenteditable="true" spellcheck="false"></div></div>
  </div>`;
  const page=body.querySelector(".docs-page");
  const titleI=body.querySelector(".docs-title");
  const status=body.querySelector("[data-status]");
  let cur=null, saveT=null, savedRange=null;
  const baseTitle=()=>(titleI.value.trim()||"Untitled document");
  const setTitle=()=>{ win.querySelector(".tt").textContent=baseTitle()+" — Docs"; };
  const setStatus=t=>{ status.textContent=t; };

  page.addEventListener("blur",()=>{
    const s=getSelection(); if(s.rangeCount && page.contains(s.anchorNode)) savedRange=s.getRangeAt(0).cloneRange();
    if(cur || page.innerText.trim()){ clearTimeout(saveT); save(); }   // flush unsaved edits on blur
  });
  function withSel(fn){ page.focus(); if(savedRange){ const s=getSelection(); s.removeAllRanges(); s.addRange(savedRange); } fn(); scheduleSave(); syncToolbar(); }
  function cmd(c){ withSel(()=>document.execCommand(c,false,null)); }

  function ensureFile(){
    if(cur) return true;
    const folder=nodeAt([...HOME_PATH,"Documents"])||nodeAt(HOME_PATH);
    if(!folder||!folder.children) return false;
    const nm=uniqueName(folder, baseTitle()+".wcdocs");
    folder.children[nm]={icon:"📘",doc:true,html:page.innerHTML,content:page.innerText};
    cur={path:nodeAt([...HOME_PATH,"Documents"])?[...HOME_PATH,"Documents"]:[...HOME_PATH],name:nm};
    return true;
  }
  function save(){
    if(!ensureFile()){ setStatus("Couldn't save"); return; }
    const parent=nodeAt(cur.path), ex=parent&&parent.children[cur.name];
    if(!parent||!parent.children||(ex&&ex.folder)){ setStatus("Couldn't save"); return; }
    parent.children[cur.name]=Object.assign(ex||{icon:"📘"},{doc:true,html:page.innerHTML,content:page.innerText});
    saveFS(); refreshFX(); setStatus("All changes saved");
  }
  function scheduleSave(){ setStatus("Saving…"); clearTimeout(saveT); saveT=setTimeout(save,600); }

  function load(pn){
    const parent=nodeAt(pn.path), f=parent&&parent.children[pn.name];
    if(!f){ winDialog({icon:"❌",title:"Docs",msg:"File not found."}); return; }
    page.innerHTML=f.html||docTextToHtml(f.content||"");
    titleI.value=pn.name.replace(/\.[^.]+$/,"");
    cur={path:[...pn.path],name:pn.name}; setTitle(); setStatus("All changes saved");
  }
  DOC.loader=load;

  titleI.addEventListener("change",()=>{
    setTitle();
    if(cur){
      const parent=nodeAt(cur.path);
      if(parent&&parent.children){
        let nn=baseTitle()+".wcdocs";
        if(nn!==cur.name){ if(parent.children[nn]) nn=uniqueName(parent,nn); parent.children[nn]=parent.children[cur.name]; delete parent.children[cur.name]; cur.name=nn; saveFS(); refreshFX(); }
      }
    }
    setStatus("All changes saved");
  });

  page.addEventListener("input",scheduleSave);
  page.addEventListener("keyup",syncToolbar);
  page.addEventListener("mouseup",syncToolbar);

  body.querySelectorAll("[data-c]").forEach(b=>{
    b.addEventListener("mousedown",e=>e.preventDefault());
    b.onclick=()=>cmd(b.dataset.c);
  });
  body.querySelector("[data-block]").onchange=e=>withSel(()=>document.execCommand("formatBlock",false,e.target.value));
  body.querySelector("[data-size]").onchange=e=>withSel(()=>document.execCommand("fontSize",false,e.target.value));
  const colorI=body.querySelector("[data-color]");
  colorI.oninput=()=>{ withSel(()=>document.execCommand("foreColor",false,colorI.value)); body.querySelector("[data-fc]").style.color=colorI.value; };

  function syncToolbar(){
    try{
      ["bold","italic","underline","strikeThrough","justifyLeft","justifyCenter","justifyRight","insertUnorderedList","insertOrderedList"]
        .forEach(c=>{ const b=body.querySelector('[data-c="'+c+'"]'); if(b) b.classList.toggle("on",document.queryCommandState(c)); });
    }catch(e){}
  }

  if(DOC_PENDING){ load(DOC_PENDING); DOC_PENDING=null; }
  else { page.innerHTML="<p><br></p>"; setTitle(); }
}

function buildCalc(body){
  body.innerHTML = `<div class="calc">
    <div class="calc-disp"><div class="expr"></div><div class="val">0</div></div>
    <div class="calc-keys">
      <button class="op" data-k="C">C</button><button class="op" data-k="±">±</button>
      <button class="op" data-k="%">%</button><button class="op" data-k="/">÷</button>
      <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button><button class="op" data-k="*">×</button>
      <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button><button class="op" data-k="-">−</button>
      <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button><button class="op" data-k="+">+</button>
      <button data-k="0" style="grid-column:span 2">0</button><button data-k=".">.</button><button class="eq" data-k="=">=</button>
    </div></div>`;
  const exprEl=body.querySelector(".expr"), valEl=body.querySelector(".val");
  let cur="0", expr="";
  const upd=()=>{ valEl.textContent=cur; exprEl.textContent=expr; };
  const safeEval=s=>{
    if(!/^[-+*/(). 0-9]+$/.test(s)) throw 0;
    return Function("return ("+s+")")();
  };
  body.querySelectorAll(".calc-keys button").forEach(b=>b.onclick=()=>{
    const k=b.dataset.k;
    if(k==="C"){ cur="0"; expr=""; }
    else if(k==="±"){ cur = cur.startsWith("-")?cur.slice(1):("-"+cur); }
    else if(k==="%"){ cur = String(parseFloat(cur)/100); }
    else if(k==="="){
      try{ const r=safeEval(expr+cur); cur=String(+parseFloat(r).toPrecision(12)); expr=""; }
      catch(e){ cur="Error"; expr=""; }
    }
    else if("+-*/".includes(k)){ expr += cur+" "+({"*":"×","/":"÷","-":"−","+":"+"}[k])+" "; expr=expr.replace(/[×÷−]/g,m=>({"×":"*","÷":"/","−":"-"}[m])); cur="0"; }
    else if(k==="."){ if(!cur.includes(".")) cur+="."; }
    else { cur = (cur==="0"||cur==="Error")?k:cur+k; }
    upd();
  });
  upd();
}

const TERM_START=Date.now();
const TERM_FORTUNES=["A folder in the hand is worth two in the Recycle Bin.","There is no cloud. It's just someone else's WinClone.","rm -rf is not a personality.","Have you tried turning systemwinclone.sys off and on again?","The best code is no code. The second best is this HTML file.","404: motivation not found.","You miss 100% of the packets you don't send."];
function buildTerminal(body){
  body.innerHTML = `<div class="term"></div>`;
  const term = body.querySelector(".term");
  let cwd = [...HOME_PATH];
  const hist=[]; let hi=0;
  const pathStr=()=> "C:\\"+cwd.slice(1).join("\\");
  const print = (t,cls)=>{ const d=el("div",cls||""); d.textContent=t; term.appendChild(d); };
  const printHtml = h=>{ const d=el("div"); d.innerHTML=h; term.appendChild(d); };
  print(`WinClone Terminal [Version 10.0.26100]\n(c) WinClone. All rights reserved.  Type "help" for commands.\n`);
  term.addEventListener("click",()=>{ if(!getSelection().toString()){ const inps=term.querySelectorAll("input:not([disabled])"); if(inps.length) inps[inps.length-1].focus(); } });
  function prompt(){
    const line = el("div","term-input");
    line.innerHTML = `<span class="green">${esc(pathStr())}></span>`;
    const inp = el("input"); inp.autocomplete="off"; inp.spellcheck=false;
    line.appendChild(inp); term.appendChild(line); inp.focus();
    inp.addEventListener("keydown", e=>{
      if(e.key==="Enter"){ const cmd=inp.value; inp.disabled=true; if(cmd.trim()) hist.push(cmd); hi=hist.length; run(cmd.trim()); prompt(); term.scrollTop=term.scrollHeight; }
      else if(e.key==="ArrowUp"){ e.preventDefault(); if(hi>0){ hi--; inp.value=hist[hi]||""; } }
      else if(e.key==="ArrowDown"){ e.preventDefault(); if(hi<hist.length-1){ hi++; inp.value=hist[hi]||""; } else { hi=hist.length; inp.value=""; } }
    });
  }
  function cowsay(t){ t=(t||"moo").slice(0,120); const b="-".repeat(t.length+2);
    return ` ${"_".repeat(t.length+2)}\n< ${t} >\n ${b}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`; }
  function neofetch(){
    const up=Math.floor((Date.now()-TERM_START)/1000), um=Math.floor(up/60);
    const L=["        ","▛▀▀▜ ▛▀▀▜","▙▄▄▟ ▙▄▄▟","▛▀▀▜ ▛▀▀▜","▙▄▄▟ ▙▄▄▟","        "];
    const I=[`${getUser()}@WINCLONE-PC`,"—".repeat(18),"OS: WinClone 12 Pro 24H2 (v"+WC_VERSION+")","Host: WinClone Megatrends","Kernel: winclone_kernel.dll","Shell: WinTerminal 10.0","Resolution: "+innerWidth+"x"+innerHeight,"CPU: WinClone Core i9 @ 3.6GHz","Memory: "+(6144+rnd(2048))+"MiB / 32768MiB","Uptime: "+um+"m "+(up%60)+"s"];
    let out="";
    for(let i=0;i<Math.max(L.length,I.length);i++){ out+=`<span class="cyan">${(L[i]||"          ").padEnd(11)}</span>${esc(I[i]||"")}\n`; }
    return out;
  }
  function run(cmd){
    const parts=cmd.split(/\s+/), c=(parts[0]||"").toLowerCase(), args=parts.slice(1), a=args.join(" ");
    const node=()=>nodeAt(cwd);
    switch(c){
      case "": break;
      case "help": printHtml(`<span class="cyan">Files:</span>  dir/ls  cd  pwd  cat/type  mkdir  del/erase  tree  &lt;script&gt;.bat<br><span class="cyan">Python:</span> python &lt;file&gt;.py   (or just type the file name)<br><span class="cyan">System:</span> ver  winver  license  whatsnew  date  time  whoami  hostname  ipconfig  neofetch  color  history  cls/clear  shutdown  exit<br><span class="cyan">Apps:</span>   start &lt;app&gt;  calc  notepad  edge  doom  (or any app id)<br><span class="cyan">Screen:</span> fx list  fx &lt;effect&gt;  fx all  fx off<br><span class="cyan">Fun:</span>    echo  cowsay  matrix  winget  fortune  sudo`); break;
      case "fx": {
        const sub=(args[0]||"").toLowerCase();
        if(!sub||sub==="list"){
          printHtml(`<span class="cyan">Screen effects</span> — they happen to the whole screen, not in this window.<br>`+
            SFX_LIST.map(e=>`&nbsp;&nbsp;${SFX.on.has(e.id)?'<span class="green">●</span>':"○"} `+
              `<b>${esc(e.id)}</b>${" ".repeat(Math.max(1,10-e.id.length)).replace(/ /g,"&nbsp;")}`+
              `<span style="color:#9a9a9a">${esc(e.desc)}</span>`).join("<br>")+
            `<br><br>fx &lt;name&gt; toggles one, <b>fx all</b> runs the lot, <b>fx off</b> stops everything (so does Ctrl+Alt+X).`);
        }
        else if(sub==="off"||sub==="stop"){ sfxStopAll(); print("all screen effects stopped"); }
        else if(sub==="all"||sub==="chaos"){ sfxAll(); print("good luck"); }
        else if(SFX_BY_ID[sub]){ const on=!SFX.on.has(sub); sfxSet(sub,on); print(sub+" "+(on?"on":"off")); }
        else print("no effect called '"+sub+"' — try: fx list");
        break;
      }
      case "cls": case "clear": term.innerHTML=""; break;
      case "ver": print("WinClone [Version 10.0.26100]"); break;
      case "winver":
        winDialog({icon:"🪟",title:"About WinClone",
          msg:`<div style="line-height:1.55"><b>WinClone</b> 12 Pro<br>
          Version <b>${esc(WC_VERSION)}</b><br>
          Build ${esc(isHosted()?installedBuild():"local (file://)")}<br><br>
          <b style="color:#f7a233">FANMADE / CONCEPT</b><br>
          Created by <b>thisisuhhplanetring</b> — © 2026 thisisuhhplanetring. All rights reserved.<br>
          <small style="color:#9a9a9a">A fan-made concept piece, not a real operating system and not
          Microsoft Windows. Contains no Microsoft assets. Not affiliated with, endorsed by or
          connected to Microsoft Corporation. Free, never sold.<br>
          Rehosting as your own is prohibited — type <b>license</b> for terms.</small></div>`});
        break;
      case "license": case "copyright":
        printHtml(`<span class="cyan">WinClone</span> — a <b>FANMADE / CONCEPT</b> project.<br>`+
          `© 2026 thisisuhhplanetring. All rights reserved.<br><br>`+
          `<span class="green">What this is:</span> a hobby tribute to desktop operating systems,<br>`+
          `&nbsp;&nbsp;written from scratch for fun and for learning. It is not a real OS,<br>`+
          `&nbsp;&nbsp;not Microsoft Windows, and contains no Microsoft code or artwork.<br>`+
          `&nbsp;&nbsp;Not affiliated with or endorsed by Microsoft. Free, never sold.<br><br>`+
          `<span class="green">You may:</span> run it, read the source, modify your own private copy,<br>`+
          `&nbsp;&nbsp;and fork it on GitHub (keeping these notices intact).<br>`+
          `<span class="green">You may not:</span> rehost or republish it as a site of your own,<br>`+
          `&nbsp;&nbsp;strip the attribution, pass it off as yours, or sell it.<br><br>`+
          `Full terms are in LICENSE.txt next to index.html.`);
        break;
      case "whatsnew":   // force-show the What's New screen (it normally appears once, after an update)
        showWhatsNew(WC_VERSION, ()=>showToast({icon:"🎉",title:"That was the What's New screen",body:"It shows automatically once, the first time you sign in after an update."}));
        break;
      case "date": print(new Date().toLocaleDateString()); break;
      case "time": print(new Date().toLocaleTimeString()); break;
      case "whoami": print("winclone\\"+getUser().toLowerCase().replace(/\s+/g,"")); break;
      case "hostname": print("WINCLONE-PC"); break;
      case "echo": print(a); break;
      case "pwd": print(pathStr()); break;
      case "ipconfig": printHtml(`Windows IP Configuration<br><br>&nbsp;&nbsp;&nbsp;IPv4 Address. . . . : 192.168.1.42<br>&nbsp;&nbsp;&nbsp;Subnet Mask . . . . : 255.255.255.0<br>&nbsp;&nbsp;&nbsp;Default Gateway . . : 192.168.1.1`); break;
      case "cd": {
        if(!a||a===".") break;
        if(a===".."){ if(cwd.length>1) cwd=cwd.slice(0,-1); break; }
        if(a==="\\"||a==="/"){ cwd=["C:"]; break; }
        if(a==="~"){ cwd=[...HOME_PATH]; break; }
        const t=a.replace(/[\\/]$/,""), n=node(), ch=n&&n.children&&n.children[t];
        if(ch&&ch.folder) cwd=[...cwd,t]; else printHtml(`The system cannot find the path specified: <b>${esc(a)}</b>`);
        break;
      }
      case "dir": case "ls": {
        const kids=(node()||{}).children||{}, keys=Object.keys(kids);
        let out=` Directory of ${esc(pathStr())}\n\n`;
        if(!keys.length) out+="  (empty)\n";
        keys.forEach(k=>{ const it=kids[k], tag=it.folder?"<DIR>":(it.archive?"<ZIP>":"     "); out+=`  ${tag.padEnd(6)} ${it.folder?"📁":glyphFor(k,it)} ${k}\n`; });
        print(out); break;
      }
      case "cat": case "type": {
        const it=(node().children||{})[a];
        if(!it){ printHtml(`Cannot find <b>${esc(a)}</b>`); break; }
        if(it.folder){ print(a+" is a directory."); break; }
        print(it.content!=null?it.content:"(no text preview for this file type)"); break;
      }
      case "mkdir": case "md": {
        if(!a){ print("Usage: mkdir <name>"); break; }
        const n=node(); if(!n||!n.children) break;
        if(n.children[a]){ print("Already exists."); break; }
        n.children[a]={folder:true,children:{}}; saveFS(); refreshFX(); print("Created "+a); break;
      }
      case "del": case "erase": {
        if(!a){ print("The syntax of the command is incorrect."); break; }
        const r=batDelete(cwd, a.replace(/^\/[a-z]\s+/i,""));
        if(r.err) printHtml(`Could Not Find <b>${esc(a)}</b>`);
        break;
      }
      case "tree": {
        let out="";(function w(p,pre){ const k=Object.keys((nodeAt(p)||{}).children||{}); k.forEach((name,i)=>{ const last=i===k.length-1, it=nodeAt(p).children[name]; out+=pre+(last?"└─ ":"├─ ")+(it.folder?"📁 ":"")+name+"\n"; if(it.folder) w([...p,name],pre+(last?"   ":"│  ")); }); })(cwd,""); print(out||"(empty)"); break;
      }
      case "neofetch": case "winfetch": printHtml(neofetch()); break;
      case "cowsay": print(cowsay(a)); break;
      case "matrix": { const ch="ｱｲｳｴｵｶｷｸ01<>*/#$%ﾊﾋﾌﾍﾎ"; for(let i=0;i<16;i++){ let s=""; for(let j=0;j<48;j++) s+=ch[Math.floor(Math.random()*ch.length)]; print(s,"green"); } print("Wake up, "+getUser()+"…","green"); break; }
      case "winget": {
        const sub=(args[0]||"").toLowerCase();
        if(sub==="list") printHtml(`Name              Id            Version<br>-----------------------------------------<br>WinClone Edge     WC.Edge       120.0<br>Cork Defender     WC.Defender   4.8<br>WinClone Docs     WC.Docs       1.0`);
        else if(sub==="install"){ print("Found "+(args.slice(1).join(" ")||"package")+"…"); print("Downloading ██████████ 100%"); print("Successfully installed. (Try the App Store for the real thing.)"); }
        else print("usage: winget [list | install <pkg>]");
        break;
      }
      case "fortune": print(TERM_FORTUNES[rnd(TERM_FORTUNES.length)]); break;
      case "sudo": printHtml(`${esc(getUser().toLowerCase())} is not in the sudoers file.<br>This incident will be reported. <span style="color:#888">(jk — you're the admin)</span>`); break;
      case "history": print(hist.map((h,i)=>`  ${i+1}  ${h}`).join("\n")||"(no history)"); break;
      case "color": { const m={green:"#4ade80",amber:"#ffbf00",white:"#e8e8e8",red:"#ff6b6b",cyan:"#5cd6ff"}; if(m[a]){ term.style.color=m[a]; print("(color → "+a+")"); } else print("colors: green amber white red cyan"); break; }
      case "shutdown": print("Shutting down…"); setTimeout(()=>{ closeWin("terminal"); doShutdown(); },500); break;
      case "python": case "py": case "python3": {
        if(!a){ openApp("python"); print("Opening Python…"); break; }
        const fn=a.replace(/^"(.*)"$/,"$1");
        const segs=batResolve(cwd,fn);
        let nm=segs[segs.length-1];
        const parent=nodeAt(segs.slice(0,-1));
        let f=parent&&parent.children&&parent.children[nm];
        if(!f && parent&&parent.children&&parent.children[nm+".py"]){ nm=nm+".py"; f=parent.children[nm]; }
        if(!f||f.folder){ printHtml(`python: can't open file <b>${esc(fn)}</b>: no such file`); break; }
        openPyFile({path:segs.slice(0,-1),name:nm});
        print("Running "+nm+" — see the Python window.");
        break;
      }
      case "start": case "open": if(APPS[args[0]]) openApp(args[0]); else print("Unknown app: "+(a||"")); break;
      case "exit": closeWin("terminal"); break;
      default: {
        if(APPS[c]){ openApp(c); break; }
        const kids=(node()||{}).children||{}, tok=parts[0];
        const bn = (kids[tok]&&!kids[tok].folder) ? tok
          : (kids[tok+".bat"]?tok+".bat":kids[tok+".cmd"]?tok+".cmd":kids[tok+".py"]?tok+".py":null);
        if(bn && /\.(bat|cmd)$/i.test(bn)){ openBatch({path:[...cwd],name:bn}); break; }
        if(bn && /\.py$/i.test(bn)){ openPyFile({path:[...cwd],name:bn}); break; }
        printHtml(`'${esc(c)}' is not recognized as an internal or external command,<br>operable program or batch file.`);
      }
    }
  }
  prompt();
}

/* ============================ BATCH SCRIPT RUNNER (.bat / .cmd) ============================ */
let BAT_PENDING=null; const BAT={loader:null};
function openBatch(pn){
  if(state.wins.batch && BAT.loader){ if(state.wins.batch.min) toggleMin("batch",false); focusWin("batch"); BAT.loader(pn); }
  else { BAT_PENDING=pn; openApp("batch"); }
}
function buildBatch(body,win,rec){
  body.innerHTML=`<div class="term batcon"></div>`;
  const con=body.querySelector(".batcon");
  const setTitle=t=>{ const tt=win.querySelector(".tt"); if(tt) tt.textContent=t; };
  const print=(t,cls)=>{ const d=el("div",cls||""); d.textContent=t==null?"":String(t); con.appendChild(d); con.scrollTop=con.scrollHeight; };
  const printHtml=h=>{ const d=el("div"); d.innerHTML=h; con.appendChild(d); con.scrollTop=con.scrollHeight; };
  let runGen=0;
  function load(pn){
    con.innerHTML="";
    const myGen=++runGen;                                  // invalidates any still-running previous script
    const node=nodeAt(pn.path), item=node&&node.children&&node.children[pn.name];
    if(!item){ print("The system cannot find the file: "+pn.name); return; }
    if(item.web){ print("Access is denied. This script was downloaded from the internet and WinClone will not run it."); return; }
    setTitle(pn.name);
    runBatchScript(String(item.content||""), [...pn.path], {
      con, print, printHtml, setTitle,
      alive:()=>document.body.contains(con)&&runGen===myGen,
      close:()=>closeWin("batch")
    });
  }
  BAT.loader=load;
  if(BAT_PENDING){ load(BAT_PENDING); BAT_PENDING=null; }
}
/* Interprets a batch script line-by-line against the VFS. Supports the common subset:
   @, echo on/off, echo, rem/::, del/erase, rd/rmdir, md/mkdir, cd, cls, title, color,
   pause, timeout, start, exit, and labels. Unknown commands report like real cmd. */
function runBatchScript(text, cwd, io){
  const lines=text.split(/\r?\n/);
  let echo=true, i=0;
  const promptStr=()=> "C:\\"+cwd.slice(1).join("\\")+">";
  const sched=(ms)=>{ if(io.alive()) setTimeout(step, ms==null?45:ms); };
  function finish(){ /* leave the window open showing output */ }

  function step(){
    if(!io.alive()) return;
    if(i>=lines.length){ finish(); return; }
    let raw=lines[i++].replace(/\s+$/,"");
    let cmd=raw.replace(/^\s+/,"");
    if(cmd===""){ sched(8); return; }
    let atSil=false;
    if(cmd[0]==="@"){ atSil=true; cmd=cmd.slice(1).replace(/^\s+/,""); }
    if(cmd[0]===":"){ sched(8); return; }               // label (::comment or :label)
    if(echo && !atSil) io.print(promptStr()+cmd);
    exec(cmd);
  }

  function exec(cmd){
    if(/^echo[.:]/i.test(cmd)){ io.print(cmd.slice(5)); sched(); return; }   // echo. / echo: (blank or glued text)
    const sp=cmd.indexOf(" ");
    const word=(sp<0?cmd:cmd.slice(0,sp)).toLowerCase();
    const rest=(sp<0?"":cmd.slice(sp+1)).trim();
    switch(word){
      case "rem": break;
      case "echo": {
        const low=rest.toLowerCase();
        if(low==="off"){ echo=false; break; }
        if(low==="on"){ echo=true; break; }
        if(rest==="") io.print("ECHO is "+(echo?"on":"off")+".");
        else io.print(rest);
        break;
      }
      case "cls": io.con.innerHTML=""; break;
      case "title": io.setTitle(rest||"cmd.exe"); break;
      case "color": break;
      case "pause": {
        io.print("Press any key to continue . . .");
        const go=()=>{ window.removeEventListener("keydown",kh,true); io.con.removeEventListener("click",go); sched(); };
        const kh=e=>go();
        window.addEventListener("keydown",kh,true); io.con.addEventListener("click",go);
        return;                                            // wait; don't auto-schedule
      }
      case "timeout": {
        let n=2; const m=rest.match(/\/t\s+(\d+)/i)||rest.match(/^(\d+)/); if(m) n=Math.min(9,parseInt(m[1],10)||0);
        io.print("Waiting for "+n+" second(s)…");
        sched(Math.max(200,n*1000)); return;
      }
      case "del": case "erase": {
        if(!rest){ io.print("The syntax of the command is incorrect."); break; }
        const r=batDelete(cwd, rest.replace(/^\/[a-z]\s+/i,""));
        if(r.err) io.print("Could Not Find "+rest);
        break;                                             // success is silent, like real del
      }
      case "rd": case "rmdir": {
        const recursive=/\/s\b/i.test(rest);
        const target=rest.replace(/\/[a-z]\b/ig,"").trim();
        const r=batRmdir(cwd, target, recursive);
        if(r.err==="notdir") io.print("The system cannot find the file specified.");
        else if(r.err==="notempty") io.print("The directory is not empty.");
        break;
      }
      case "md": case "mkdir": {
        if(!rest){ io.print("The syntax of the command is incorrect."); break; }
        const segs=batResolve(cwd, rest), name=segs[segs.length-1], parent=nodeAt(segs.slice(0,-1));
        if(!parent||!parent.children){ io.print("The system cannot find the path specified."); break; }
        if(parent.children[name]){ io.print("A subdirectory or file "+name+" already exists."); break; }
        parent.children[name]={folder:true,children:{}}; saveFS(); refreshFX();
        break;
      }
      case "cd": case "chdir": {
        let arg=rest.replace(/^\/d\s+/i,"").trim();
        if(!arg){ io.print(promptStr().slice(0,-1)); break; }
        const segs=batResolve(cwd, arg), n=nodeAt(segs);
        if(n&&n.folder){ cwd=segs; } else io.print("The system cannot find the path specified.");
        break;
      }
      case "start": {
        const id=(rest.split(/\s+/)[0]||"").toLowerCase();
        if(APPS[id]) openApp(id); else io.print("The system cannot find the file specified.");
        break;
      }
      case "exit": io.close(); return;
      case "set": case "if": case "for": case "goto": case "setlocal": case "endlocal": case "call": case "pushd": case "popd": break;
      default:
        if(APPS[word]){ openApp(word); break; }
        io.printHtml(`'${esc(word)}' is not recognized as an internal or external command,<br>operable program or batch file.`);
    }
    sched();
  }
  step();
}

/* ============================ SYSTEM RESTORE POINTS ============================
   A snapshot of the machine's state you can roll back to. It captures the
   filesystem, the Recycle Bin, infections and your look-and-feel settings.

   It deliberately does NOT capture your password or security question — rolling
   back should never change how you sign in — and it doesn't touch the installed
   copy of WinClone's own code, so restoring never downgrades the OS.

   Snapshots live in the same localStorage as everything else, so they cost real
   space: keeping one roughly doubles what your files take up. That's why
   there's a cap, a size readout, and a clear error when the drive is full. */
const RP_KEY="wc_restore", RP_MAX=6;
/* keys a restore point carries; wc_pass / wc_sq / wc_sqa / wc_sys_* stay out on purpose */
const RP_KEYS=["wc_fs","wc_recycle","wc_infect","wc_user","wc_wall","wc_theme","wc_accent","wc_iconpos","wc_notifs"];

function rpLoad(){ try{ return JSON.parse(localStorage.getItem(RP_KEY))||[]; }catch(e){ return []; } }
function rpBytes(o){ try{ return JSON.stringify(o).length; }catch(e){ return 0; } }
function rpSizeLabel(n){
  if(n<1024) return n+" B";
  if(n<1024*1024) return (n/1024).toFixed(1)+" KB";
  return (n/1048576).toFixed(2)+" MB";
}
function rpWhenLabel(ts){
  const d=new Date(ts);
  return d.toLocaleDateString([], {day:"numeric",month:"short"})+" "+
         d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}
function rpCapture(name){
  try{ saveFS(); }catch(e){}                       // make sure the snapshot sees the current files
  const data={};
  RP_KEYS.forEach(k=>{ data[k]=localStorage.getItem(k); });
  return {
    id:"rp"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36),
    name:String(name||"Restore point").slice(0,48),
    when:Date.now(),
    version:WC_VERSION,
    data,
  };
}
/* Returns null on success, or a message explaining why it couldn't be saved. */
function rpCreate(name){
  const list=rpLoad();
  if(list.length>=RP_MAX) return "You already have "+RP_MAX+" restore points. Delete one first.";
  const pt=rpCapture(name);
  const next=[pt,...list];
  try{
    localStorage.setItem(RP_KEY,JSON.stringify(next));
  }catch(e){
    return "Not enough storage to save a restore point ("+rpSizeLabel(rpBytes(pt))+" needed). "+
           "Delete an old restore point, empty the Recycle Bin, or remove some large files.";
  }
  return null;
}
function rpDelete(id){
  const next=rpLoad().filter(p=>p.id!==id);
  try{ localStorage.setItem(RP_KEY,JSON.stringify(next)); }catch(e){}
}
function rpRestore(id){
  const pt=rpLoad().find(p=>p.id===id);
  if(!pt) return false;
  const d=pt.data||{};
  RP_KEYS.forEach(k=>{
    const v=d[k];
    try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){}
  });
  return true;
}

function buildRestore(body,win){
  const draw=()=>{
    const list=rpLoad();
    const used=rpBytes(list);
    body.innerHTML=`<div class="rp">
      <div class="rp-head">
        <div>
          <div class="rp-title">System Restore Points</div>
          <div class="rp-sub">Take a snapshot now, and you can put WinClone back exactly how it is today.</div>
        </div>
        <button class="rp-new">＋ Create restore point</button>
      </div>
      <div class="rp-list"></div>
      <div class="rp-foot">
        <span>${list.length} of ${RP_MAX} restore points · using ${rpSizeLabel(used)}</span>
        <span class="rp-note">Your password is never changed by a restore.</span>
      </div>
    </div>`;
    const listEl=body.querySelector(".rp-list");
    if(!list.length){
      listEl.innerHTML=`<div class="rp-empty">
        <div class="rp-eic">🛟</div>
        <b>No restore points yet</b>
        <span>Make one before you try something risky — installing junk, deleting system
        files, or letting a Python script loose on your filesystem.</span></div>`;
    }else{
      list.forEach(p=>{
        const row=el("div","rp-row",
          `<div class="rp-ic">🛟</div>
           <div class="rp-meta">
             <b>${esc(p.name)}</b>
             <span>${rpWhenLabel(p.when)} · ${rpSizeLabel(rpBytes(p))}${p.version?" · WinClone "+esc(p.version):""}</span>
           </div>`);
        const go=el("button","rp-btn pri","Restore");
        const rm=el("button","rp-btn","Delete");
        go.onclick=()=>confirmRestore(p);
        rm.onclick=()=>{
          winDialog({icon:"🗑️",title:"Delete restore point",
            msg:`Delete <b>${esc(p.name)}</b>?<br><small style="color:#9a9a9a">The files it saved can't be recovered afterwards.</small>`,
            buttons:[{label:"Delete",primary:true,action:()=>{ rpDelete(p.id); draw(); }},{label:"Cancel"}]});
        };
        row.appendChild(go); row.appendChild(rm);
        listEl.appendChild(row);
      });
    }
    body.querySelector(".rp-new").onclick=()=>{
      const d=new Date();
      inputDialog({
        title:"Create restore point",
        ok:"Create",
        value:"Before "+d.toLocaleDateString([], {day:"numeric",month:"short"})+" "+d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
        cb:(nm)=>{
          const err=rpCreate(nm);
          if(err){ winDialog({icon:"⚠️",title:"Couldn't create restore point",msg:esc(err)}); return; }
          draw();
          notify({icon:"🛟",title:"Restore point created",body:nm});
        }
      });
    };
  };
  function confirmRestore(p){
    winDialog({icon:"🛟",title:"Restore this PC",
      msg:`Put WinClone back to <b>${esc(p.name)}</b>, taken ${rpWhenLabel(p.when)}?<br><br>
        <small style="color:#9a9a9a">Your files, Recycle Bin, wallpaper and settings all go back to how
        they were. Anything you've made since then is lost. Your password stays as it is now.<br>
        WinClone will restart.</small>`,
      buttons:[
        {label:"Restore and restart",primary:true,action:()=>{
          if(!rpRestore(p.id)){ winDialog({icon:"⚠️",title:"Restore failed",msg:"That restore point couldn't be read."}); return; }
          const sd=$("#shutdown");
          if(sd){ sd.style.display="flex"; $("#sd-text").textContent="Restoring your files…"; }
          setTimeout(()=>location.reload(),2000);
        }},
        {label:"Cancel"}
      ]});
  }
  draw();
}

/* ============================ SCREEN FX ============================
   Effects that happen to the *screen* instead of inside a window: the whole
   desktop shakes, spins, melts, fills with static. Nothing here is a picture of
   a broken screen — every effect is applied to the real, live desktop, so your
   windows keep working (badly) underneath it.

   How it works: warping effects write a combined transform/filter onto <body>,
   which drags the desktop, the taskbar and every open window along with them.
   Overlay effects draw into #scrfx, a full-screen layer pinned above the shell
   but below the BSOD and the BIOS — those two stay readable on purpose, because
   the BIOS is the escape hatch of last resort.

   The engine costs nothing when idle: no timers, no rAF, no canvases. Turning
   the last effect off tears the whole layer back down. */
const SFX = {
  on:new Set(),         // ids currently running
  power:1,              // intensity, 0.3 – 2
  raf:0, t0:0,
  root:null, layers:{}, st:{},   // st = per-effect scratch state
  mouse:{x:innerWidth/2, y:innerHeight/2},
  panels:[],            // open Screen FX windows that want repainting
  bound:false,
};
const SFX_ARROW=`<svg viewBox="0 0 20 26" width="20" height="26"><path d="M2 1 L2 21 L7 16.5 L10.5 24.5 L14 23 L10.5 15 L17 15 Z"
  fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

/* ---- plumbing ---- */
function sfxRoot(){
  if(SFX.root && SFX.root.isConnected) return SFX.root;
  const r=el("div"); r.id="scrfx";
  document.body.appendChild(r);
  SFX.root=r; SFX.layers={};
  r.style.setProperty("--p", SFX.power);
  return r;
}
function sfxLayer(id,tag,cls){
  const r=sfxRoot();
  const have=SFX.layers[id];
  if(have && have.isConnected) return have;
  const n=document.createElement(tag||"div");
  n.className="sx-l "+(cls||("sx-"+id));
  r.appendChild(n); SFX.layers[id]=n; return n;
}
function sfxDrop(id){
  const n=SFX.layers[id]; if(n) n.remove();
  delete SFX.layers[id]; delete SFX.st[id];
}
function sfxFit(c,scale){
  const s=scale||1;
  c.width =Math.max(1,Math.round(innerWidth *s));
  c.height=Math.max(1,Math.round(innerHeight*s));
}
/* the SVG filters behind melt / liquid. One <svg>, reused, animated per frame. */
function sfxFilters(){
  let s=$("#sfx-svg");
  if(s) return s;
  const host=el("div","sx-svghost",
    `<svg id="sfx-svg" width="0" height="0" aria-hidden="true">
      <filter id="sfx-melt" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.002 0.014" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="sfx-liquid" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
        <feTurbulence type="turbulence" baseFrequency="0.012" numOctaves="1" seed="3" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </svg>`);
  sfxRoot().appendChild(host);
  return $("#sfx-svg");
}
function sfxDisp(id,scale,freq,seed){
  const f=$("#"+id); if(!f) return;
  const t=f.querySelector("feTurbulence"), d=f.querySelector("feDisplacementMap");
  if(d) d.setAttribute("scale", scale.toFixed(1));
  if(t){
    if(freq!=null) t.setAttribute("baseFrequency", freq);
    if(seed!=null) t.setAttribute("seed", seed);
  }
}

/* ---- the catalogue ----
   warp() adds to body's transform, tint() adds to its filter, start()/stop()
   own a layer, frame() runs once per rAF. tame:true = safe to inflict on
   someone without warning; the strobe is deliberately not tame. */
const SFX_LIST=[
  /* --- warp --- */
  {id:"shake", name:"Earthquake", icon:"〰️", cat:"Warp", tame:true,
   desc:"The whole screen judders like someone kicked the desk.",
   warp:(t,p)=>`translate(${((Math.random()-.5)*16*p).toFixed(1)}px,${((Math.random()-.5)*16*p).toFixed(1)}px)`},

  {id:"spin", name:"Spin", icon:"🌀", cat:"Warp", tame:true,
   desc:"The desktop rotates, forever, and the mouse no longer agrees with it.",
   warp:(t,p)=>`rotate(${(t*40*p).toFixed(2)}deg)`},

  {id:"flip", name:"Upside Down", icon:"🙃", cat:"Warp", tame:true,
   desc:"Turns the screen 180°. Everything still works. You don't.",
   warp:()=>"rotate(180deg)"},

  {id:"mirror", name:"Mirror", icon:"🪞", cat:"Warp", tame:true,
   desc:"Flips the screen left-to-right. Reading gets interesting.",
   warp:()=>"scaleX(-1)"},

  {id:"breathe", name:"Breathe", icon:"🫁", cat:"Warp", tame:true,
   desc:"The screen slowly zooms in and out, like the monitor is inhaling.",
   warp:(t,p)=>`scale(${(1+0.22*p*Math.sin(t*1.5)).toFixed(4)})`},

  {id:"drunk", name:"Drunk", icon:"🍺", cat:"Warp", tame:true,
   desc:"A slow, queasy sway with a skew in it. Nothing sits still.",
   warp:(t,p)=>`rotate(${(5*p*Math.sin(t*.9)).toFixed(2)}deg) skewX(${(4*p*Math.sin(t*1.31)).toFixed(2)}deg) `+
     `translate(${(22*p*Math.sin(t*.55)).toFixed(1)}px,${(11*p*Math.cos(t*.7)).toFixed(1)}px)`},

  {id:"melt", name:"Melt", icon:"🫠", cat:"Warp", tame:true,
   desc:"The picture sags and drips downward, and keeps getting worse the longer it runs.",
   start(){ sfxFilters(); },
   stop(){ sfxDisp("sfx-melt",0); },
   frame(t,p){ sfxDisp("sfx-melt", Math.min(90, t*7)*p, "0.002 "+(0.014+0.004*Math.sin(t*.3)).toFixed(4)); },
   tint:()=>"url(#sfx-melt)"},

  {id:"liquid", name:"Heat Haze", icon:"♨️", cat:"Warp", tame:true,
   desc:"Everything ripples like you're looking at it through hot air.",
   start(){ sfxFilters(); },
   stop(){ sfxDisp("sfx-liquid",0); },
   frame(t,p){ sfxDisp("sfx-liquid", 9*p, null, (t*8|0)%90); },
   tint:()=>"url(#sfx-liquid)"},

  /* --- colour --- */
  {id:"invert", name:"Inverted", icon:"🌗", cat:"Colour", tame:true, group:"tint",
   desc:"Every colour on screen becomes its opposite.",
   tint:()=>"invert(1)"},

  {id:"rainbow", name:"Rainbow", icon:"🌈", cat:"Colour", tame:true, group:"tint",
   desc:"Cycles the hue of the entire desktop.",
   tint:(t)=>`hue-rotate(${(t*140).toFixed(1)}deg) saturate(1.7)`},

  {id:"blurry", name:"Lost My Glasses", icon:"👓", cat:"Colour", tame:true, group:"tint",
   desc:"A soft blur that drifts in and out of focus.",
   tint:(t,p)=>`blur(${(p*(1.6+1.6*Math.sin(t*1.9))).toFixed(2)}px)`},

  {id:"dread", name:"Dread", icon:"🩸", cat:"Colour", tame:true, group:"tint",
   desc:"Drains the colour, crushes the contrast and leaves everything sickly.",
   tint:()=>"grayscale(.85) contrast(1.7) sepia(.5) hue-rotate(-25deg)"},

  /* --- overlays --- */
  {id:"static", name:"TV Static", icon:"📺", cat:"Overlay", tame:true, group:"wash",
   desc:"A layer of rolling analogue snow over the whole screen.",
   start(){
     const c=sfxLayer("static","canvas"); sfxFit(c,0.34);
     const frames=[];
     for(let k=0;k<6;k++){
       const o=document.createElement("canvas"); o.width=c.width; o.height=c.height;
       const g=o.getContext("2d"), d=g.createImageData(o.width,o.height);
       for(let i=0;i<d.data.length;i+=4){
         const v=Math.random()*255|0;
         d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255;
       }
       g.putImageData(d,0,0); frames.push(o);
     }
     SFX.st.static={c,ctx:c.getContext("2d"),frames,i:0};
   },
   stop(){ sfxDrop("static"); },
   frame(){ const S=SFX.st.static; if(!S) return;
     S.i=(S.i+1)%S.frames.length; S.ctx.drawImage(S.frames[S.i],0,0); }},

  {id:"crt", name:"CRT", icon:"🖥️", cat:"Overlay", tame:true,
   desc:"Scanlines, a curved vignette and a bright band rolling down the tube.",
   start(){ sfxLayer("crt").innerHTML=`<i class="sx-roll"></i>`; },
   stop(){ sfxDrop("crt"); }},

  {id:"glitch", name:"Datamosh", icon:"📡", cat:"Overlay", tame:true,
   desc:"Bands of the picture tear loose, invert and slide sideways.",
   start(){
     const l=sfxLayer("glitch"); l.innerHTML="";
     const bands=[];
     for(let i=0;i<5;i++){ const b=el("div","sx-band"); l.appendChild(b); bands.push(b); }
     const move=()=>{
       bands.forEach(b=>{
         if(Math.random()<0.35){ b.style.opacity="0"; return; }
         b.style.opacity="1";
         b.style.top=(Math.random()*100).toFixed(1)+"%";
         b.style.height=(4+Math.random()*44*SFX.power).toFixed(0)+"px";
         b.style.transform="translateX("+((Math.random()-.5)*46*SFX.power).toFixed(0)+"px)";
       });
     };
     move();
     SFX.st.glitch={iv:setInterval(move,90)};
   },
   stop(){ const G=SFX.st.glitch; if(G) clearInterval(G.iv); sfxDrop("glitch"); }},

  {id:"crack", name:"Cracked Screen", icon:"🪟", cat:"Overlay", tame:true,
   desc:"Shatters the glass. Click anywhere to crack it again — it never heals.",
   start(){
     const c=sfxLayer("crack","canvas"); sfxFit(c,1);
     SFX.st.crack={c,ctx:c.getContext("2d"),hits:[]};
     sfxCrack(innerWidth*0.5, innerHeight*0.42);
   },
   stop(){ sfxDrop("crack"); }},

  {id:"cursors", name:"Cursor Swarm", icon:"🖱️", cat:"Overlay", tame:true,
   desc:"A trail of pointers chases yours around, each one slower than the last.",
   start(){
     const l=sfxLayer("cursors"); l.innerHTML="";
     const arr=[];
     for(let i=0;i<9;i++){
       const d=el("div","sx-cur",SFX_ARROW);
       d.style.opacity=(0.85-i*0.07).toFixed(2);
       l.appendChild(d);
       arr.push({d,x:SFX.mouse.x,y:SFX.mouse.y,k:0.020+i*0.013});
     }
     SFX.st.cursors=arr;
   },
   stop(){ sfxDrop("cursors"); },
   frame(){ const A=SFX.st.cursors; if(!A) return;
     A.forEach(o=>{
       o.x+=(SFX.mouse.x-o.x)*o.k; o.y+=(SFX.mouse.y-o.y)*o.k;
       o.d.style.transform=`translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`;
     }); }},

  {id:"bugs", name:"Bugs", icon:"🐛", cat:"Overlay", tame:true,
   desc:"Something is crawling on the screen. On the inside.",
   start(){
     const l=sfxLayer("bugs"); l.innerHTML="";
     const kinds=["🐛","🕷️","🪲","🐜","🦗"], arr=[];
     for(let i=0;i<11;i++){
       const d=el("div","sx-bug",kinds[i%kinds.length]);
       l.appendChild(d);
       arr.push({d,x:Math.random()*innerWidth,y:Math.random()*innerHeight,
                 a:Math.random()*6.28,v:0.4+Math.random()*1.1});
     }
     SFX.st.bugs=arr;
   },
   stop(){ sfxDrop("bugs"); },
   frame(t,p){ const A=SFX.st.bugs; if(!A) return;
     A.forEach(o=>{
       o.a+=(Math.random()-.5)*0.35;
       o.x+=Math.cos(o.a)*o.v*p*1.6; o.y+=Math.sin(o.a)*o.v*p*1.6;
       if(o.x<-30) o.x=innerWidth+20; if(o.x>innerWidth+30) o.x=-20;
       if(o.y<-30) o.y=innerHeight+20; if(o.y>innerHeight+30) o.y=-20;
       o.d.style.transform=`translate(${o.x.toFixed(0)}px,${o.y.toFixed(0)}px) rotate(${(o.a*57.3+90).toFixed(0)}deg)`;
     }); }},

  {id:"matrix", name:"Digital Rain", icon:"🟩", cat:"Overlay", tame:true, group:"wash",
   desc:"Green characters pour down over everything you're doing.",
   start(){
     const c=sfxLayer("matrix","canvas"); sfxFit(c,0.6);
     const cols=Math.max(1,Math.floor(c.width/13));
     SFX.st.matrix={c,ctx:c.getContext("2d"),cols,
       y:Array.from({length:cols},()=>Math.random()*-60)};
   },
   stop(){ sfxDrop("matrix"); },
   frame(){ const M=SFX.st.matrix; if(!M) return;
     const g=M.ctx;
     g.fillStyle="rgba(0,0,0,.09)"; g.fillRect(0,0,M.c.width,M.c.height);
     g.font="13px 'Consolas',monospace"; g.fillStyle="#66ff88";
     for(let i=0;i<M.cols;i++){
       g.fillText(String.fromCharCode(0x30A0+(Math.random()*96|0)), i*13, M.y[i]*15);
       if(M.y[i]*15>M.c.height && Math.random()>0.975) M.y[i]=0;
       M.y[i]++;
     } }},

  {id:"strobe", name:"Strobe", icon:"🚨", cat:"Overlay",
   desc:"Full-screen colour flashes. Deliberately slow — under three a second — and never switched on by anything but you.",
   start(){
     const l=sfxLayer("strobe");
     const cols=["#ff2d2d","#1d4ed8","#ffffff","#0b0b0b"]; let i=0;
     l.style.background=cols[0];
     SFX.st.strobe={iv:setInterval(()=>{ i=(i+1)%cols.length; l.style.background=cols[i]; },420)};
   },
   stop(){ const S=SFX.st.strobe; if(S) clearInterval(S.iv); sfxDrop("strobe"); }},
];
const SFX_BY_ID={}; SFX_LIST.forEach(e=>{ SFX_BY_ID[e.id]=e; });

/* one impact: jagged radials plus the rings that join them */
function sfxCrack(x,y){
  const C=SFX.st.crack; if(!C) return;
  if(C.hits.length>11) return;
  C.hits.push([x,y]);
  const g=C.ctx, spokes=9+(Math.random()*6|0), angs=[];
  for(let i=0;i<spokes;i++) angs.push(i/spokes*6.283+Math.random()*0.28);
  const reach=angs.map(()=>140+Math.random()*Math.max(innerWidth,innerHeight)*0.42);
  const draw=(w,col)=>{
    g.strokeStyle=col; g.lineWidth=w; g.lineJoin="round";
    angs.forEach((a,i)=>{
      g.beginPath(); g.moveTo(x,y);
      let px=x,py=y;
      for(let r=18;r<reach[i];r+=26+Math.random()*22){
        const j=a+(Math.random()-.5)*0.22;
        px=x+Math.cos(j)*r; py=y+Math.sin(j)*r;
        g.lineTo(px,py);
      }
      g.stroke();
    });
    for(let ring=1;ring<=3;ring++){
      g.beginPath();
      angs.forEach((a,i)=>{
        const r=reach[i]*(ring/4.2)*(0.8+Math.random()*0.35);
        const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
        i?g.lineTo(px,py):g.moveTo(px,py);
      });
      g.closePath(); g.stroke();
    }
  };
  draw(3.2,"rgba(0,0,0,.55)");      // dark under-stroke so cracks read on pale windows too
  draw(1.1,"rgba(255,255,255,.92)");
  g.fillStyle="rgba(255,255,255,.75)";
  g.beginPath(); g.arc(x,y,3.5,0,6.283); g.fill();
}

/* ---- driver ---- */
function sfxTick(){
  SFX.raf=requestAnimationFrame(sfxTick);
  const t=(performance.now()-SFX.t0)/1000, p=SFX.power;
  let tf="", fl="";
  for(const e of SFX_LIST){
    if(!SFX.on.has(e.id)) continue;
    if(e.frame) e.frame(t,p);
    if(e.warp){ const s=e.warp(t,p); if(s) tf+=s+" "; }
    if(e.tint){ const s=e.tint(t,p); if(s) fl+=s+" "; }
  }
  const b=document.body;
  if(b.style.transform!==tf) b.style.transform=tf;
  if(b.style.filter!==fl)    b.style.filter=fl;
}
function sfxOnMove(e){ SFX.mouse.x=e.clientX; SFX.mouse.y=e.clientY; }
function sfxOnDown(e){ if(SFX.on.has("crack")) sfxCrack(e.clientX,e.clientY); }
function sfxOnResize(){
  if(SFX.st.static){ SFX_BY_ID.static.stop(); SFX_BY_ID.static.start(); }
  if(SFX.st.matrix){ SFX_BY_ID.matrix.stop(); SFX_BY_ID.matrix.start(); }
  const C=SFX.st.crack;
  if(C){ const hits=C.hits; sfxFit(C.c,1); C.hits=[]; hits.forEach(h=>sfxCrack(h[0],h[1])); }
}
function sfxBind(on){
  if(on===SFX.bound) return;
  SFX.bound=on;
  if(on){
    addEventListener("mousemove",sfxOnMove,true);
    addEventListener("pointerdown",sfxOnDown,true);
    addEventListener("resize",sfxOnResize);
  }else{
    removeEventListener("mousemove",sfxOnMove,true);
    removeEventListener("pointerdown",sfxOnDown,true);
    removeEventListener("resize",sfxOnResize);
  }
}
function sfxSync(){
  if(SFX.on.size){
    sfxRoot().style.setProperty("--p",SFX.power);
    if(!SFX.raf){ SFX.t0=performance.now(); sfxBind(true); SFX.raf=requestAnimationFrame(sfxTick); }
  }else{
    if(SFX.raf) cancelAnimationFrame(SFX.raf);
    SFX.raf=0; sfxBind(false);
    document.body.style.transform=""; document.body.style.filter="";
    if(SFX.root) SFX.root.remove();
    SFX.root=null; SFX.layers={}; SFX.st={};   // nothing left running, nothing left allocated
  }
  SFX.panels=SFX.panels.filter(f=>{ try{ return f(); }catch(e){ return false; } });
}
function sfxSet(id,on){
  const e=SFX_BY_ID[id]; if(!e) return false;
  on=(on!==false);
  if(on===SFX.on.has(id)) return true;
  if(on){ SFX.on.add(id); sfxRoot(); if(e.start) e.start(); }
  else  { SFX.on.delete(id); if(e.stop) e.stop(); }
  sfxSync();
  return true;
}
function sfxStopAll(){
  SFX_LIST.forEach(e=>{ if(SFX.on.has(e.id)){ SFX.on.delete(e.id); try{ e.stop&&e.stop(); }catch(err){} } });
  sfxSync();
}
/* Every effect except the strobe — but only one per `group`. Some of these
   drown each other: stacking all four colour filters cancels them into a white
   smear, and static + digital rain both blend in screen mode, which washes the
   picture out until you can't see any of the good ones underneath. */
function sfxAll(){
  sfxRoot();
  const keep={};
  SFX_LIST.forEach(e=>{
    if(!e.tame||!e.group) return;
    (keep[e.group]=keep[e.group]||[]).push(e.id);
  });
  Object.keys(keep).forEach(g=>{ keep[g]=keep[g][rnd(keep[g].length)]; });
  SFX_LIST.forEach(e=>{ if(e.tame && (!e.group||keep[e.group]===e.id)) sfxSet(e.id,true); });
}
function sfxPower(v){
  SFX.power=Math.max(0.3,Math.min(2,Number(v)||1));
  if(SFX.root) SFX.root.style.setProperty("--p",SFX.power);
  sfxSync();
}

/* ---- the app ---- */
function buildScreenFX(body,win){
  body.innerHTML=`<div class="sx-app">
    <div class="sx-head">
      <div>
        <div class="sx-title">Screen FX</div>
        <div class="sx-sub">These don't happen in a window — they happen to the screen. Everything underneath keeps running.</div>
      </div>
      <div class="sx-headbtns">
        <button class="sx-btn chaos">🎲 Total chaos</button>
        <button class="sx-btn stop">■ Stop everything</button>
      </div>
    </div>
    <div class="sx-power">
      <span>Intensity</span>
      <input type="range" min="30" max="200" value="${Math.round(SFX.power*100)}" class="sx-range">
      <b class="sx-pval">${Math.round(SFX.power*100)}%</b>
    </div>
    <div class="sx-grid"></div>
    <div class="sx-foot">
      <span><b class="sx-count">0</b> running</span>
      <span class="sx-note">Panic button: <b>Ctrl + Alt + X</b> stops everything. Reloading the page also clears it.</span>
    </div>
  </div>`;

  const grid=body.querySelector(".sx-grid");
  const cards={};
  let cat=null;
  SFX_LIST.forEach(e=>{
    if(e.cat!==cat){ cat=e.cat; grid.appendChild(el("div","sx-cat",esc(cat))); }
    const c=el("div","sx-card",
      `<div class="sx-ic">${e.icon}</div>
       <div class="sx-meta"><b>${esc(e.name)}</b><span>${esc(e.desc)}</span></div>
       <div class="sx-sw"><i></i></div>`);
    c.onclick=()=>sfxSet(e.id,!SFX.on.has(e.id));
    grid.appendChild(c);
    cards[e.id]=c;
  });

  const range=body.querySelector(".sx-range"), pval=body.querySelector(".sx-pval");
  range.oninput=()=>{ pval.textContent=range.value+"%"; sfxPower(range.value/100); };
  body.querySelector(".sx-btn.stop").onclick=()=>sfxStopAll();
  body.querySelector(".sx-btn.chaos").onclick=()=>sfxAll();

  const paint=()=>{
    if(!body.isConnected) return false;            // window closed — drop the repainter
    SFX_LIST.forEach(e=>cards[e.id].classList.toggle("on",SFX.on.has(e.id)));
    body.querySelector(".sx-count").textContent=SFX.on.size;
    return true;
  };
  SFX.panels.push(paint);
  paint();
}

/* ============================ CLONEDOOM ============================
   "But can it run DOOM?" — yes, for a given value of DOOM.

   This is an original raycaster written from scratch: DDA wall casting with
   textured walls, floor/ceiling casting, billboarded sprites with a z-buffer,
   sliding doors, and enemies with line-of-sight AI. Every texture and sprite is
   generated procedurally at load time — there are no id Software assets here,
   no WAD file, and no id Software code. It's a tribute, like the rest of
   WinClone, not a port.

   Renders at 320x200 into an ImageData buffer (view 320x168 + a 32px status
   bar), then the weapon and HUD go on top with plain 2D calls. */

const DOOM_W=320, DOOM_H=200, DOOM_VH=168, DOOM_HZ=84;
const DOOM_TEXSZ=64;

/* ---- map: 32 x 24 ----
   #  brick wall      =  tech panel     %  slime wall     |  metal wall
   D  door            X  exit switch    .  floor
   S  player start    z  grunt          i  imp            p  brute
   h  medkit          a  ammo           s  shotgun        r  armour        */
const DOOM_MAPSRC=[
"################################",
"#S.......#.........=...........#",
"#........#....a....=...%...%...#",
"#..hh....#....z....=....i......#",
"#........#.........=...%...%...#",
"#...z....#....a....=...........#",
"####D#########D##########D######",
"#..............................#",
"#..z.......i...........p.......#",
"#..............................#",
"####D#########D##########D######",
"#........#.........|...........#",
"#...a....#....hh...|....s......#",
"#........#.........|...........#",
"#...i....#.........|....X......#",
"#........#....z....|...........#",
"#........#.........|....h......#",
"#..%%....#.........|...........#",
"#..%.....#....a....|....r......#",
"#..%.....#.........|...........#",
"#........#.........|....p......#",
"#...i....#..hh.....|...........#",
"#........#.........|...........#",
"################################",
];

function doomRGB(r,g,b){
  r=r<0?0:r>255?255:r|0; g=g<0?0:g>255?255:g|0; b=b<0?0:b>255?255:b|0;
  return (255<<24)|(b<<16)|(g<<8)|r;
}
/* Distance falloff. Deliberately steep — corridors should swallow the far end
   in darkness, which is most of what makes this feel like a shooter from 1993
   rather than a brightly-lit tech demo. */
function doomFog(d){
  const f=2.7/(1+d*0.42+d*d*0.085);
  return f>1?1:(f<0.05?0.05:f);
}
function doomShade(c,f){
  if(f>=1) return c;
  const r=(c&255)*f, g=((c>>8)&255)*f, b=((c>>16)&255)*f;
  return (255<<24)|((b|0)<<16)|((g|0)<<8)|(r|0);
}
/* deterministic value noise, so textures look the same every run */
function doomNoise(x,y,seed){
  let n=(x*374761393+y*668265263+seed*1013904223)|0;
  n=(n^(n>>13))*1274126177;
  return ((n^(n>>16))>>>0)/4294967295;
}

let DOOM_TEX=null, DOOM_SPR=null;
function doomTextures(){
  if(DOOM_TEX) return DOOM_TEX;
  const S=DOOM_TEXSZ, T={};
  const mk=(fill)=>{
    const a=new Uint32Array(S*S);
    for(let y=0;y<S;y++) for(let x=0;x<S;x++) a[y*S+x]=fill(x,y);
    return a;
  };
  // 1: brick
  T[1]=mk((x,y)=>{
    const row=Math.floor(y/8), off=(row%2)*16;
    const bx=(x+off)%32, by=y%8;
    if(by<1||bx<1) return doomRGB(58,54,52);                 // mortar
    const n=doomNoise(x,y,1)*26;
    return doomRGB(104+n-8*(row%3), 42+n*.5, 34+n*.4);
  });
  // 2: tech panel
  T[2]=mk((x,y)=>{
    const bx=x%32, by=y%32;
    const edge=(bx<2||by<2||bx>29||by>29);
    const rivet=((bx-5)*(bx-5)+(by-5)*(by-5)<5)||((bx-26)*(bx-26)+(by-26)*(by-26)<5);
    const n=doomNoise(x,y,2)*18;
    if(rivet) return doomRGB(150+n,152+n,158+n);
    if(edge)  return doomRGB(52+n,56+n,62+n);
    if(by>13&&by<19) return doomRGB(38+n,86+n,120+n);        // lit strip
    return doomRGB(88+n,92+n,100+n);
  });
  // 3: slime / organic
  T[3]=mk((x,y)=>{
    const w=Math.sin((x+Math.sin(y*.22)*4)*.35)*10;
    const n=doomNoise(x,y,3)*22;
    return doomRGB(26+n*.5, 74+w+n, 34+w*.5+n*.4);
  });
  // 4: metal with vents
  T[4]=mk((x,y)=>{
    const n=doomNoise(x,y,4)*16;
    const vent=(y%16)>10 && x>6 && x<58;
    if(vent) return doomRGB(26+n*.4,28+n*.4,32+n*.4);
    return doomRGB(96+n,98+n,104+n) ;
  });
  // 5: door
  T[5]=mk((x,y)=>{
    const n=doomNoise(x,y,5)*12;
    if(x<3||x>60) return doomRGB(58+n,60+n,66+n);
    if(y<6||y>57) return doomRGB(140+n,120+n,40+n);          // hazard trim
    if(Math.abs(x-32)<3) return doomRGB(48+n,50+n,54+n);     // centre seam
    const band=(Math.floor(y/6)%2)===0;
    return band? doomRGB(126+n,128+n,134+n) : doomRGB(104+n,106+n,112+n);
  });
  // 6: exit switch
  T[6]=mk((x,y)=>{
    const n=doomNoise(x,y,6)*14;
    const inX=x>18&&x<46, inY=y>18&&y<46;
    if(inX&&inY){
      if(x>22&&x<42&&y>22&&y<42) return doomRGB(30+n,190+n,70+n);
      return doomRGB(30+n,34+n,38+n);
    }
    return doomRGB(74+n,70+n,66+n);
  });
  // 7: floor gravel   8: ceiling stone
  T[7]=mk((x,y)=>{ const n=doomNoise(x,y,7)*40; const t=((x>>3)+(y>>3))%2; return doomRGB(58+n+t*10,50+n+t*8,44+n+t*6); });
  T[8]=mk((x,y)=>{ const n=doomNoise(x,y,8)*24; return doomRGB(40+n,42+n,48+n); });
  DOOM_TEX=T;
  return T;
}

/* sprites are drawn with ordinary 2D calls into a small canvas, then read back
   as pixels — much easier to author than hand-typed pixel arrays */
function doomSprite(w,h,draw){
  const c=document.createElement("canvas");
  c.width=w; c.height=h;
  const x=c.getContext("2d");
  x.imageSmoothingEnabled=false;
  x.clearRect(0,0,w,h);
  draw(x,w,h);
  const d=x.getImageData(0,0,w,h);
  return {w,h,px:new Uint32Array(d.data.buffer.slice(0))};
}
function doomSprites(){
  if(DOOM_SPR) return DOOM_SPR;
  const S={};
  const legs=(x,col,sw)=>{ x.fillStyle=col; x.fillRect(13+sw,44,7,18); x.fillRect(22-sw,44,7,18); };

  const grunt=(step,firing)=>doomSprite(42,64,(x)=>{
    legs(x,"#2f3a24",step);
    x.fillStyle="#46592f"; x.fillRect(10,22,22,24);            // torso
    x.fillStyle="#3a4a27"; x.fillRect(6,24,5,16); x.fillRect(31,24,5,16);
    x.fillStyle="#9c7b56"; x.fillRect(14,8,14,14);             // head
    x.fillStyle="#1a1008"; x.fillRect(16,13,4,3); x.fillRect(23,13,4,3);
    x.fillStyle="#6b7f4a"; x.fillRect(13,6,16,4);              // helmet
    x.fillStyle="#2a2a2e"; x.fillRect(30,28,11,4);             // rifle
    if(firing){ x.fillStyle="#ffd76a"; x.fillRect(40,26,6,8); x.fillStyle="#fff1b8"; x.fillRect(41,28,3,4); }
  });
  const imp=(step,firing)=>doomSprite(42,64,(x)=>{
    legs(x,"#5a2018",step);
    x.fillStyle="#7d2a1e"; x.fillRect(9,20,24,26);
    x.fillStyle="#6a2318"; x.fillRect(4,22,6,18); x.fillRect(32,22,6,18);
    x.fillStyle="#8b3324"; x.fillRect(13,6,16,15);             // head
    x.fillStyle="#e8d9c0";                                      // horns
    x.beginPath(); x.moveTo(13,7); x.lineTo(8,0); x.lineTo(15,4); x.fill();
    x.beginPath(); x.moveTo(29,7); x.lineTo(34,0); x.lineTo(27,4); x.fill();
    x.fillStyle="#ffdd44"; x.fillRect(16,12,4,3); x.fillRect(23,12,4,3);
    x.fillStyle="#3a120c"; x.fillRect(17,18,8,2);
    if(firing){
      const g=x.createRadialGradient(36,30,1,36,30,9);
      g.addColorStop(0,"#fff2b0"); g.addColorStop(.5,"#ff9a2a"); g.addColorStop(1,"rgba(255,80,0,0)");
      x.fillStyle=g; x.beginPath(); x.arc(36,30,9,0,7); x.fill();
    }
  });
  const brute=(step)=>doomSprite(54,64,(x)=>{
    x.fillStyle="#8c3b52"; x.fillRect(15+step,46,10,16); x.fillRect(29-step,46,10,16);
    x.fillStyle="#c05a76"; x.fillRect(8,16,38,32);             // bulk
    x.fillStyle="#a84864"; x.fillRect(2,20,7,20); x.fillRect(45,20,7,20);
    x.fillStyle="#d4708c"; x.fillRect(15,6,24,14);             // head
    x.fillStyle="#2a0d15"; x.fillRect(19,11,5,3); x.fillRect(30,11,5,3);
    x.fillStyle="#fff4f6";                                      // teeth
    for(let i=0;i<6;i++) x.fillRect(18+i*3,18,2,4);
  });
  S.grunt=[grunt(0,false),grunt(2,false),grunt(0,true)];
  S.imp  =[imp(0,false),imp(2,false),imp(0,true)];
  S.brute=[brute(0),brute(3)];
  S.corpse=doomSprite(48,64,(x)=>{
    x.fillStyle="#6a1c14"; x.fillRect(6,52,36,9);
    x.fillStyle="#8a2a1e"; x.fillRect(12,46,24,7);
    x.fillStyle="#4a120c"; x.fillRect(18,58,14,4);
  });
  S.fire=doomSprite(24,24,(x)=>{
    const g=x.createRadialGradient(12,12,1,12,12,11);
    g.addColorStop(0,"#fffbe0"); g.addColorStop(.35,"#ffc23a");
    g.addColorStop(.7,"#ff5c12"); g.addColorStop(1,"rgba(180,30,0,0)");
    x.fillStyle=g; x.beginPath(); x.arc(12,12,11,0,7); x.fill();
  });
  S.blood=doomSprite(16,16,(x)=>{
    const g=x.createRadialGradient(8,8,0,8,8,7);
    g.addColorStop(0,"#ff2a2a"); g.addColorStop(.5,"#a80f0f"); g.addColorStop(1,"rgba(90,0,0,0)");
    x.fillStyle=g; x.beginPath(); x.arc(8,8,7,0,7); x.fill();
  });
  S.medkit=doomSprite(28,28,(x)=>{
    x.fillStyle="#e8e8e8"; x.fillRect(2,6,24,18);
    x.fillStyle="#b8b8b8"; x.fillRect(2,6,24,3);
    x.fillStyle="#d02020"; x.fillRect(12,10,4,11); x.fillRect(8,14,12,4);
  });
  S.ammo=doomSprite(26,20,(x)=>{
    x.fillStyle="#6b5a2a"; x.fillRect(2,6,22,12);
    x.fillStyle="#8a7638"; x.fillRect(2,6,22,3);
    x.fillStyle="#d8c46a"; for(let i=0;i<4;i++) x.fillRect(5+i*5,9,3,7);
  });
  S.shotgun=doomSprite(40,18,(x)=>{
    x.fillStyle="#4a4a50"; x.fillRect(4,6,30,4);
    x.fillStyle="#6b4a2a"; x.fillRect(22,9,14,5);
    x.fillStyle="#2e2e33"; x.fillRect(4,10,14,2);
  });
  S.armor=doomSprite(28,30,(x)=>{
    x.fillStyle="#1fa04a"; x.beginPath();
    x.moveTo(14,2); x.lineTo(26,8); x.lineTo(22,26); x.lineTo(14,29); x.lineTo(6,26); x.lineTo(2,8);
    x.closePath(); x.fill();
    x.fillStyle="#7ce8a4"; x.fillRect(12,8,4,12);
  });
  DOOM_SPR=S;
  return S;
}

/* mouse feel, remembered between sessions ([ and ] adjust, I inverts) */
let DOOM_SENS=parseFloat(localStorage.getItem("wc_doom_sens"));
if(!isFinite(DOOM_SENS)||DOOM_SENS<=0) DOOM_SENS=1;
let DOOM_INVERT=localStorage.getItem("wc_doom_invert")==="1";
function doomSaveFeel(){
  try{
    localStorage.setItem("wc_doom_sens",String(DOOM_SENS));
    localStorage.setItem("wc_doom_invert",DOOM_INVERT?"1":"0");
  }catch(e){}
}

function buildDoom(body,win,rec){
  const T=doomTextures(), SP=doomSprites();
  body.innerHTML=`<div class="doom">
    <canvas class="doom-cv" width="${DOOM_W}" height="${DOOM_H}"></canvas>
    <div class="doom-tip"></div>
  </div>`;
  const cv=body.querySelector(".doom-cv");
  const tip=body.querySelector(".doom-tip");
  const ctx=cv.getContext("2d");
  ctx.imageSmoothingEnabled=false;
  const img=ctx.createImageData(DOOM_W,DOOM_VH);
  const buf=new Uint32Array(img.data.buffer);
  const zbuf=new Float32Array(DOOM_W);

  /* ---- level ---- */
  const MW=DOOM_MAPSRC[0].length, MH=DOOM_MAPSRC.length;
  const grid=new Uint8Array(MW*MH);        // 0 empty, else texture id
  const doors=new Map();                   // index -> {open, timer}
  let spawn={x:1.5,y:1.5};
  const ents=[];
  const WALLCH={"#":1,"=":2,"%":3,"|":4,"D":5,"X":6};
  for(let y=0;y<MH;y++){
    const row=DOOM_MAPSRC[y];
    for(let x=0;x<MW;x++){
      const ch=row[x]||"#";
      const i=y*MW+x;
      if(WALLCH[ch]){
        grid[i]=WALLCH[ch];
        if(ch==="D") doors.set(i,{open:0,timer:0});
        continue;
      }
      const cx=x+0.5, cy=y+0.5;
      if(ch==="S") spawn={x:cx,y:cy};
      else if(ch==="z") ents.push(mkMonster("grunt",cx,cy));
      else if(ch==="i") ents.push(mkMonster("imp",cx,cy));
      else if(ch==="p") ents.push(mkMonster("brute",cx,cy));
      else if(ch==="h") ents.push({kind:"pickup",item:"medkit",x:cx,y:cy,alive:true,z:0.42,scale:.55});
      else if(ch==="a") ents.push({kind:"pickup",item:"ammo",x:cx,y:cy,alive:true,z:0.46,scale:.45});
      else if(ch==="s") ents.push({kind:"pickup",item:"shotgun",x:cx,y:cy,alive:true,z:0.46,scale:.6});
      else if(ch==="r") ents.push({kind:"pickup",item:"armor",x:cx,y:cy,alive:true,z:0.42,scale:.55});
    }
  }
  function mkMonster(type,x,y){
    const spec={grunt:{hp:30,speed:.028,dmg:9,range:9,cool:75,melee:false},
                imp:  {hp:45,speed:.030,dmg:16,range:11,cool:95,melee:false},
                brute:{hp:90,speed:.050,dmg:18,range:1.4,cool:45,melee:true}}[type];
    return {kind:"monster",type,x,y,hp:spec.hp,spec,alive:true,anim:0,cool:30+((Math.random()*40)|0),
            firing:0,hurt:0,z:0.5,scale:type==="brute"?1.35:1.12};
  }
  const totalMonsters=ents.filter(e=>e.kind==="monster").length;

  const st={
    px:spawn.x, py:spawn.y, dirX:1, dirY:0, planeX:0, planeY:0.66,
    health:100, armor:0, bullets:50, shells:0, weapon:0, hasShotgun:false,
    kills:0, mode:"title", bob:0, flash:0, pain:0, dead:0,
    msg:"", msgT:0, fired:0, locked:false, tick:0,
    horizon:DOOM_HZ, shake:0,
  };
  function say(m){ st.msg=m; st.msgT=150; }

  /* ---- sound: short synthesised bursts, no audio files ---- */
  let noiseBuf=null;
  function noise(){
    if(!AC) return null;
    if(noiseBuf) return noiseBuf;
    const n=AC.sampleRate*0.5;
    noiseBuf=AC.createBuffer(1,n,AC.sampleRate);
    const d=noiseBuf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    return noiseBuf;
  }
  function dsound(kind){
    try{
      AC=AC||new (window.AudioContext||window.webkitAudioContext)();
      if(AC.state==="suspended") AC.resume();
      const vol=Math.max(0,Math.min(100,(typeof masterVol==="number"?masterVol:65)))/100;
      if(!vol) return;
      const t=AC.currentTime;
      const burst=(dur,gain,freq,q)=>{
        const src=AC.createBufferSource(); src.buffer=noise();
        const f=AC.createBiquadFilter(); f.type="lowpass"; f.frequency.value=freq; f.Q.value=q||1;
        const g=AC.createGain();
        g.gain.setValueAtTime(gain*vol,t);
        g.gain.exponentialRampToValueAtTime(.0001,t+dur);
        src.connect(f); f.connect(g); g.connect(AC.destination);
        src.start(t); src.stop(t+dur+.02);
      };
      const tone=(f0,f1,dur,gain,type)=>{
        const o=AC.createOscillator(), g=AC.createGain();
        o.type=type||"sawtooth";
        o.frequency.setValueAtTime(f0,t);
        o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
        g.gain.setValueAtTime(gain*vol,t);
        g.gain.exponentialRampToValueAtTime(.0001,t+dur);
        o.connect(g); g.connect(AC.destination);
        o.start(t); o.stop(t+dur+.02);
      };
      if(kind==="pistol"){ burst(.10,.22,2600,1); tone(320,90,.09,.10,"square"); }
      else if(kind==="shotgun"){ burst(.30,.44,1000,1.4); burst(.07,.30,4200,1); tone(110,34,.30,.26,"square"); }
      else if(kind==="dry") tone(200,160,.05,.08,"square");
      else if(kind==="pain") tone(360,140,.22,.16,"sawtooth");
      else if(kind==="mdie") tone(240,50,.45,.18,"sawtooth");
      else if(kind==="growl") tone(120,70,.35,.10,"sawtooth");
      else if(kind==="pickup"){ tone(660,1320,.10,.10,"square"); }
      else if(kind==="door") burst(.35,.10,700,2);
      else if(kind==="exit"){ tone(440,880,.30,.14,"square"); }
      else if(kind==="fire") burst(.16,.16,900,1);
    }catch(e){}
  }

  /* ---- map helpers ---- */
  const cell=(x,y)=>(x<0||y<0||x>=MW||y>=MH)?1:grid[y*MW+x];
  function isSolid(x,y){
    const c=cell(x,y);
    if(!c) return false;
    if(c===5){ const d=doors.get(y*MW+x); return !d || d.open<0.75; }
    return true;
  }
  function blockedAt(x,y,r){
    return isSolid(Math.floor(x-r),Math.floor(y-r)) || isSolid(Math.floor(x+r),Math.floor(y-r))
        || isSolid(Math.floor(x-r),Math.floor(y+r)) || isSolid(Math.floor(x+r),Math.floor(y+r));
  }
  function lineOfSight(ax,ay,bx,by){
    const dx=bx-ax, dy=by-ay, dist=Math.hypot(dx,dy);
    const steps=Math.ceil(dist*8);
    for(let i=1;i<steps;i++){
      const t=i/steps;
      const x=ax+dx*t, y=ay+dy*t;
      const c=cell(Math.floor(x),Math.floor(y));
      if(c && !(c===5 && (doors.get(Math.floor(y)*MW+Math.floor(x))||{}).open>0.75)) return false;
    }
    return true;
  }

  /* ---- input ---- */
  const keys=new Set();
  const focused=()=>state.wins.doom && state.focused==="doom" && body.isConnected;
  const kname=(e)=>{
    const k=e.key;
    if(k===" ") return "space";
    if(k==="ArrowLeft") return "left";
    if(k==="ArrowRight") return "right";
    if(k==="ArrowUp") return "up";
    if(k==="ArrowDown") return "down";
    if(k==="Control") return "ctrl";
    if(k==="Shift") return "shift";
    return String(k).toLowerCase();
  };
  const kd=(e)=>{
    if(!body.isConnected){ teardown(); return; }
    if(!focused()) return;
    const n=kname(e);
    keys.add(n);
    if(["space","left","right","up","down","w","a","s","d","e","1","2","ctrl"].indexOf(n)>=0) e.preventDefault();
    if(st.mode==="title" && (n==="space"||n==="enter")) start();
    else if(st.mode!=="play" && st.mode!=="title" && (n==="space"||n==="enter")) reset();
    if(n==="e" && st.mode==="play") useDoor();
    if(n==="1" && st.mode==="play") st.weapon=0;
    if(n==="2" && st.mode==="play" && st.hasShotgun) st.weapon=1;
    if(n==="["){ DOOM_SENS=Math.max(.2,DOOM_SENS-.15); doomSaveFeel(); say("Mouse sensitivity "+DOOM_SENS.toFixed(2)); }
    if(n==="]"){ DOOM_SENS=Math.min(4,DOOM_SENS+.15); doomSaveFeel(); say("Mouse sensitivity "+DOOM_SENS.toFixed(2)); }
    if(n==="i"){ DOOM_INVERT=!DOOM_INVERT; doomSaveFeel(); say(DOOM_INVERT?"Mouse inverted":"Mouse normal"); }
  };
  const ku=(e)=>{ keys.delete(kname(e)); };
  const blur=()=>keys.clear();
  document.addEventListener("keydown",kd,true);
  document.addEventListener("keyup",ku,true);
  addEventListener("blur",blur);

  cv.addEventListener("mousedown",(e)=>{
    e.preventDefault();
    focusWin("doom");
    if(st.mode==="title"){ start(); return; }
    if(st.mode!=="play"){ reset(); return; }
    if(!st.locked && cv.requestPointerLock){ try{ cv.requestPointerLock(); }catch(_){} return; }
    shoot();
  });
  const plChange=()=>{ st.locked=(document.pointerLockElement===cv); updateTip(); };
  document.addEventListener("pointerlockchange",plChange);
  /* Screen-right is +y in map space (rows count downward), so a positive
     rotation turns right — moving the mouse right must pass a positive angle. */
  const mmove=(e)=>{
    if(!st.locked || st.mode!=="play") return;
    rotate(e.movementX*0.0022*DOOM_SENS*(DOOM_INVERT?-1:1));
  };
  document.addEventListener("mousemove",mmove);

  function teardown(){
    document.removeEventListener("keydown",kd,true);
    document.removeEventListener("keyup",ku,true);
    document.removeEventListener("pointerlockchange",plChange);
    document.removeEventListener("mousemove",mmove);
    removeEventListener("blur",blur);
    if(document.pointerLockElement===cv && document.exitPointerLock){ try{ document.exitPointerLock(); }catch(_){} }
  }

  function updateTip(){
    tip.textContent = st.mode!=="play" ? "" :
      (st.locked ? "Esc releases the mouse · [ ] mouse speed · I inverts"
                 : "WASD move · mouse or ←/→ turn · click to shoot (click once to grab the mouse) · E doors · 1/2 weapons · [ ] mouse speed · I inverts");
  }

  function rotate(a){
    const c=Math.cos(a), s=Math.sin(a);
    const dx=st.dirX, px=st.planeX;
    st.dirX=dx*c-st.dirY*s;   st.dirY=dx*s+st.dirY*c;
    st.planeX=px*c-st.planeY*s; st.planeY=px*s+st.planeY*c;
  }
  function start(){ st.mode="play"; say("Find the exit switch. Good luck."); updateTip(); }
  function reset(){
    st.px=spawn.x; st.py=spawn.y; st.dirX=1; st.dirY=0; st.planeX=0; st.planeY=0.66;
    st.health=100; st.armor=0; st.bullets=50; st.shells=0; st.weapon=0; st.hasShotgun=false;
    st.kills=0; st.pain=0; st.flash=0; st.dead=0;
    for(let i=ents.length-1;i>=0;i--) if(ents[i].kind==="fire") ents.splice(i,1);
    ents.forEach(e=>{
      e.alive=true; e.hurt=0; e.firing=0; e.awake=false; e.dying=0;
      if(e.kind==="monster"){
        e.hp=e.spec.hp; e.anim=0; e.cool=30+((Math.random()*40)|0);
        if(e.sx!=null){ e.x=e.sx; e.y=e.sy; }
      }
    });
    doors.forEach(d=>{ d.open=0; d.timer=0; });
    st.mode="play"; say("Again!"); updateTip();
  }
  ents.forEach(e=>{ e.sx=e.x; e.sy=e.y; });

  function useDoor(){
    const fx=st.px+st.dirX*0.9, fy=st.py+st.dirY*0.9;
    const i=Math.floor(fy)*MW+Math.floor(fx);
    if(grid[i]===5){
      const d=doors.get(i);
      if(d && d.open<0.05){ d.timer=1; dsound("door"); say("The door grinds open."); }
      return;
    }
    if(grid[i]===6){ st.mode="win"; dsound("exit"); }
  }

  function damagePlayer(n){
    if(st.mode!=="play") return;
    if(st.armor>0){ const soak=Math.min(st.armor,Math.floor(n/2)); st.armor-=soak; n-=soak; }
    st.health-=n;
    st.pain=Math.min(1,st.pain+n/50);
    st.shake=Math.min(1.2,st.shake+n/26);
    dsound("pain");
    if(st.health<=0){ st.health=0; st.mode="dead"; st.dead=0; if(document.exitPointerLock&&st.locked){ try{document.exitPointerLock();}catch(_){} } }
  }

  function shoot(){
    if(st.mode!=="play" || st.fired>0) return;
    const shotgun=st.weapon===1;
    if(shotgun && st.shells<=0){ dsound("dry"); say("Out of shells."); return; }
    if(!shotgun && st.bullets<=0){ dsound("dry"); say("Out of bullets."); return; }
    if(shotgun){ st.shells--; st.fired=22; dsound("shotgun"); st.shake=0.55; }
    else { st.bullets--; st.fired=11; dsound("pistol"); st.shake=0.22; }
    st.flash=1;
    const pellets=shotgun?7:1;
    for(let p=0;p<pellets;p++){
      const spread=shotgun?(Math.random()-.5)*0.20:(Math.random()-.5)*0.03;
      hitscan(spread, shotgun?7:11);
    }
  }
  function hitscan(spread,dmg){
    const c=Math.cos(spread), s=Math.sin(spread);
    const rx=st.dirX*c-st.dirY*s, ry=st.dirX*s+st.dirY*c;
    let best=null, bestD=1e9;
    for(const e of ents){
      if(e.kind!=="monster"||!e.alive) continue;
      const ex=e.x-st.px, ey=e.y-st.py;
      const along=ex*rx+ey*ry;
      if(along<=0.2||along>22) continue;
      const perp=Math.abs(ex*(-ry)+ey*rx);
      if(perp>0.42) continue;
      if(along<bestD && lineOfSight(st.px,st.py,e.x,e.y)){ best=e; bestD=along; }
    }
    if(!best) return;
    best.hp-=dmg; best.hurt=6;
    for(let i=0;i<4;i++){                          // blood spray
      const ang=Math.random()*6.283;
      ents.push({kind:"blood",x:best.x,y:best.y,vx:Math.cos(ang)*0.022,vy:Math.sin(ang)*0.022,
                 alive:true,life:16+((Math.random()*10)|0),scale:0.22+Math.random()*0.12});
    }
    if(best.hp<=0){
      best.alive=false; best.dying=90; st.kills++;
      dsound("mdie");
      if(best.type==="grunt") st.bullets=Math.min(200,st.bullets+5);
      if(st.kills>=totalMonsters) say("Every last one. Now find the exit.");
    }
  }

  /* ---- per-frame update ---- */
  function update(){
    st.tick++;
    if(st.fired>0) st.fired--;
    if(st.flash>0) st.flash=Math.max(0,st.flash-0.18);
    if(st.pain>0) st.pain=Math.max(0,st.pain-0.03);
    if(st.shake>0) st.shake*=0.85;
    if(st.msgT>0) st.msgT--;
    /* head bob + recoil kick, as a moving horizon */
    let hz=DOOM_HZ+Math.sin(st.bob)*1.7;
    if(st.shake>0.01) hz+=(Math.random()-0.5)*st.shake*14;
    st.horizon=Math.max(DOOM_HZ-26,Math.min(DOOM_HZ+26,hz));

    doors.forEach((d,i)=>{
      if(d.timer>0){
        d.open=Math.min(1,d.open+0.045);
        if(d.open>=1){ d.timer++; if(d.timer>260) { d.timer=0; } }
      } else if(d.open>0){
        const px=Math.floor(st.px), py=Math.floor(st.py);
        if(py*MW+px===i) return;                       // don't close on the player
        d.open=Math.max(0,d.open-0.03);
      }
    });

    if(st.mode!=="play"){ if(st.mode==="dead") st.dead++; return; }

    /* movement */
    const run=keys.has("shift")?1.7:1;
    const mv=0.055*run, rot=0.045;
    let fwd=0, strafe=0;
    if(keys.has("w")||keys.has("up")) fwd+=1;
    if(keys.has("s")||keys.has("down")) fwd-=1;
    if(keys.has("d")) strafe+=1;
    if(keys.has("a")) strafe-=1;
    if(keys.has("left")) rotate(-rot);
    if(keys.has("right")) rotate(rot);
    if(fwd||strafe){
      // strafe right = the camera's right vector, which is (-dirY, dirX)
      const nx=st.px + (st.dirX*fwd - st.dirY*strafe)*mv;
      const ny=st.py + (st.dirY*fwd + st.dirX*strafe)*mv;
      if(!blockedAt(nx,st.py,0.22)) st.px=nx;
      if(!blockedAt(st.px,ny,0.22)) st.py=ny;
      st.bob+=0.22*run;
    } else st.bob*=0.9;
    if(keys.has("space")||keys.has("ctrl")) shoot();

    /* pickups */
    for(const e of ents){
      if(e.kind!=="pickup"||!e.alive) continue;
      if(Math.hypot(e.x-st.px,e.y-st.py)>0.55) continue;
      if(e.item==="medkit"){
        if(st.health>=100) continue;
        st.health=Math.min(100,st.health+25); say("Picked up a medkit.");
      }
      else if(e.item==="ammo"){ st.bullets=Math.min(200,st.bullets+20); st.shells=Math.min(60,st.shells+4); say("Ammo."); }
      else if(e.item==="shotgun"){ st.hasShotgun=true; st.shells=Math.min(60,st.shells+8); st.weapon=1; say("You got the shotgun!"); }
      else if(e.item==="armor"){ st.armor=Math.min(100,st.armor+50); say("Armour."); }
      e.alive=false;
      dsound("pickup");
    }

    /* exit tile underfoot */
    if(cell(Math.floor(st.px+st.dirX*0.6),Math.floor(st.py+st.dirY*0.6))===6){
      // touching the switch wall counts, so players don't have to guess about E
      st.mode="win"; dsound("exit"); return;
    }

    /* monsters */
    for(const e of ents){
      if(e.kind!=="monster") continue;
      if(!e.alive){ if(e.dying>0) e.dying--; continue; }
      if(e.hurt>0) e.hurt--;
      if(e.firing>0) e.firing--;
      const dx=st.px-e.x, dy=st.py-e.y;
      const dist=Math.hypot(dx,dy);
      const sees=dist<e.spec.range && lineOfSight(e.x,e.y,st.px,st.py);
      if(!sees){ e.cool=Math.max(e.cool-1,20); continue; }
      if(!e.awake){ e.awake=true; dsound("growl"); }
      e.anim+=0.12;
      const keep=e.spec.melee?0.9:2.2;
      if(dist>keep){
        const nx=e.x+dx/dist*e.spec.speed, ny=e.y+dy/dist*e.spec.speed;
        if(!blockedAt(nx,e.y,0.3)&&!monsterBlocked(e,nx,e.y)) e.x=nx;
        if(!blockedAt(e.x,ny,0.3)&&!monsterBlocked(e,e.x,ny)) e.y=ny;
      }
      e.cool--;
      if(e.cool<=0){
        e.cool=e.spec.cool+((Math.random()*40)|0);
        e.firing=12;
        if(e.spec.melee){
          if(dist<e.spec.range) damagePlayer(e.spec.dmg+((Math.random()*6)|0));
        } else if(e.type==="imp"){
          ents.push({kind:"fire",x:e.x,y:e.y,vx:dx/dist*0.075,vy:dy/dist*0.075,alive:true,z:0.5,scale:.4,life:200,dmg:e.spec.dmg});
          dsound("fire");
        } else {
          dsound("pistol");
          if(Math.random()<0.62) damagePlayer(e.spec.dmg+((Math.random()*5)|0));
        }
      }
    }
    function monsterBlocked(self,x,y){
      for(const o of ents){
        if(o===self||o.kind!=="monster"||!o.alive) continue;
        if(Math.hypot(o.x-x,o.y-y)<0.62) return true;
      }
      return false;
    }

    /* imp fireballs */
    for(const f of ents){
      if(f.kind!=="fire"||!f.alive) continue;
      f.x+=f.vx; f.y+=f.vy; f.life--;
      if(f.life<=0 || isSolid(Math.floor(f.x),Math.floor(f.y))){ f.alive=false; continue; }
      if(Math.hypot(f.x-st.px,f.y-st.py)<0.42){ f.alive=false; damagePlayer(f.dmg); }
    }
    for(const b of ents){
      if(b.kind!=="blood"||!b.alive) continue;
      b.x+=b.vx; b.y+=b.vy; b.vx*=0.86; b.vy*=0.86; b.scale*=0.94;
      if(--b.life<=0) b.alive=false;
    }
    for(let i=ents.length-1;i>=0;i--){
      const k=ents[i].kind;
      if((k==="fire"||k==="blood")&&!ents[i].alive) ents.splice(i,1);
    }
  }

  /* ---- rendering ---- */
  function render(){
    const hz=st.horizon|0;
    buf.fill(0xff08080a);                       // anything the casts don't cover stays near-black
    /* floor + ceiling, cast row by row */
    const rdx0=st.dirX-st.planeX, rdy0=st.dirY-st.planeY;
    const rdx1=st.dirX+st.planeX, rdy1=st.dirY+st.planeY;
    const ftex=T[7], ctex=T[8], S=DOOM_TEXSZ;
    for(let y=hz+1;y<DOOM_VH;y++){
      const p=y-hz;
      if(p<=0) continue;
      const rowDist=(0.5*DOOM_VH)/p;
      const stepX=rowDist*(rdx1-rdx0)/DOOM_W;
      const stepY=rowDist*(rdy1-rdy0)/DOOM_W;
      let fx=st.px+rowDist*rdx0, fy=st.py+rowDist*rdy0;
      const fog=doomFog(rowDist);
      const cy=2*hz-y;
      const drawC=cy>=0&&cy<DOOM_VH;
      const rowF=y*DOOM_W, rowC=cy*DOOM_W;
      for(let x=0;x<DOOM_W;x++){
        const tx=((fx*S)|0)&(S-1), ty=((fy*S)|0)&(S-1);
        const t=ty*S+tx;
        buf[rowF+x]=doomShade(ftex[t],fog);
        if(drawC) buf[rowC+x]=doomShade(ctex[t],fog*0.66);
        fx+=stepX; fy+=stepY;
      }
    }

    /* walls */
    for(let x=0;x<DOOM_W;x++){
      const camX=2*x/DOOM_W-1;
      const rdx=st.dirX+st.planeX*camX, rdy=st.dirY+st.planeY*camX;
      let mapX=Math.floor(st.px), mapY=Math.floor(st.py);
      const ddx=Math.abs(1/(rdx||1e-9)), ddy=Math.abs(1/(rdy||1e-9));
      let stepX,stepY,sdx,sdy;
      if(rdx<0){ stepX=-1; sdx=(st.px-mapX)*ddx; } else { stepX=1; sdx=(mapX+1-st.px)*ddx; }
      if(rdy<0){ stepY=-1; sdy=(st.py-mapY)*ddy; } else { stepY=1; sdy=(mapY+1-st.py)*ddy; }
      let side=0, tile=0, guard=0;
      while(guard++<160){
        if(sdx<sdy){ sdx+=ddx; mapX+=stepX; side=0; }
        else       { sdy+=ddy; mapY+=stepY; side=1; }
        const c=cell(mapX,mapY);
        if(!c) continue;
        if(c===5){
          const d=doors.get(mapY*MW+mapX);
          if(d && d.open>0.75) continue;               // fully open: see straight through
        }
        tile=c; break;
      }
      if(!tile) tile=1;
      const perp=side===0 ? (sdx-ddx) : (sdy-ddy);
      const dist=Math.max(0.0001,perp);
      zbuf[x]=dist;
      const lineH=Math.floor(DOOM_VH/dist);
      let y0=hz-(lineH>>1), y1=y0+lineH;
      const drawStart=y0<0?0:y0, drawEnd=y1>DOOM_VH?DOOM_VH:y1;
      let wallX = side===0 ? st.py+dist*rdy : st.px+dist*rdx;
      wallX-=Math.floor(wallX);
      let texX=(wallX*S)|0;
      if((side===0&&rdx>0)||(side===1&&rdy<0)) texX=S-texX-1;
      const tex=T[tile]||T[1];
      /* a partly-open door slides up out of sight */
      let slide=0;
      if(tile===5){ const d=doors.get(mapY*MW+mapX); if(d) slide=d.open; }
      const fog=doomFog(dist)*(side===1?0.70:1);
      const texStep=S/lineH;
      let texPos=(drawStart-hz+(lineH>>1))*texStep;
      for(let y=drawStart;y<drawEnd;y++){
        let ty=texPos&(S-1); texPos+=texStep;
        if(slide>0){
          const shifted=ty-slide*S;
          if(shifted<0){ continue; }                    // that part of the door has lifted away
          ty=shifted|0;
        }
        buf[y*DOOM_W+x]=doomShade(tex[(ty|0)*S+texX],fog);
      }
    }

    /* sprites, far to near */
    const vis=[];
    for(const e of ents){
      if(e.kind==="pickup"&&!e.alive) continue;
      if((e.kind==="fire"||e.kind==="blood")&&!e.alive) continue;
      if(e.kind==="monster"&&!e.alive&&!(e.dying>0)) continue;
      e._d=(e.x-st.px)*(e.x-st.px)+(e.y-st.py)*(e.y-st.py);
      vis.push(e);
    }
    vis.sort((a,b)=>b._d-a._d);
    const invDet=1/(st.planeX*st.dirY-st.dirX*st.planeY);
    for(const e of vis){
      const sx=e.x-st.px, sy=e.y-st.py;
      const tx=invDet*(st.dirY*sx-st.dirX*sy);
      const ty=invDet*(-st.planeY*sx+st.planeX*sy);
      if(ty<=0.15) continue;
      const scr=Math.floor((DOOM_W/2)*(1+tx/ty));
      const spr=spriteFor(e);
      if(!spr) continue;
      const sc=(e.scale||1);
      const h=Math.abs(Math.floor(DOOM_VH/ty))*sc;
      const w=h*(spr.w/spr.h);
      // stand things on the floor (the bottom of a wall at this distance),
      // except fireballs, which float at eye level
      const floorY=hz+(DOOM_VH/ty)/2;
      let y0=Math.floor((e.kind==="fire"||e.kind==="blood") ? hz-h/2 : floorY-h);
      const x0=Math.floor(scr-w/2);
      const fog=e.kind==="fire"?1:doomFog(ty);
      const hurt=(e.kind==="monster"&&e.hurt>0);
      for(let x=0;x<w;x++){
        const px=x0+x;
        if(px<0||px>=DOOM_W) continue;
        if(ty>=zbuf[px]) continue;
        const sxp=Math.floor(x*spr.w/w);
        for(let y=0;y<h;y++){
          const py=y0+y;
          if(py<0||py>=DOOM_VH) continue;
          const syp=Math.floor(y*spr.h/h);
          const c=spr.px[syp*spr.w+sxp];
          if((c>>>24)<40) continue;
          buf[py*DOOM_W+px]= hurt ? doomShade(c|0x000000ff,1) : doomShade(c,fog);
        }
      }
    }
    ctx.putImageData(img,0,0);

    /* full-screen tints */
    if(st.pain>0){ ctx.fillStyle="rgba(190,0,0,"+(st.pain*0.42).toFixed(3)+")"; ctx.fillRect(0,0,DOOM_W,DOOM_VH); }
    if(st.flash>0){ ctx.fillStyle="rgba(255,220,140,"+(st.flash*0.16).toFixed(3)+")"; ctx.fillRect(0,0,DOOM_W,DOOM_VH); }

    drawWeapon();
    drawHud();
    if(st.mode==="title") drawTitle();
    else if(st.mode==="dead") drawDead();
    else if(st.mode==="win") drawWin();
  }

  function spriteFor(e){
    if(e.kind==="fire") return SP.fire;
    if(e.kind==="blood") return SP.blood;
    if(e.kind==="pickup") return SP[e.item];
    if(e.kind==="monster"){
      if(!e.alive) return SP.corpse;
      const set=SP[e.type];
      if(e.firing>0 && set.length>2) return set[2];
      return set[(Math.floor(e.anim)%2)];
    }
    return null;
  }

  /* The gun is deliberately big and low in frame — a small weapon sprite is one
     of the main reasons a raycaster stops feeling like a shooter of this era. */
  function drawWeapon(){
    const bobX=Math.sin(st.bob)*9, bobY=Math.abs(Math.cos(st.bob))*6;
    const kick=st.fired>6?9:(st.fired>0?4:0);
    const cx=DOOM_W/2+bobX, base=DOOM_VH+4+bobY+kick;
    ctx.save();
    if(st.weapon===1){
      /* shotgun: wide receiver, twin barrels, wooden fore-end */
      ctx.fillStyle="#6b4a2a"; ctx.fillRect(cx-26,base-40,52,42);          // stock/fore-end
      ctx.fillStyle="#57381f"; ctx.fillRect(cx-26,base-40,52,5);
      ctx.fillStyle="#3c3c44"; ctx.fillRect(cx-17,base-96,34,58);          // receiver
      ctx.fillStyle="#4c4c56"; ctx.fillRect(cx-14,base-99,28,6);
      ctx.fillStyle="#23232a"; ctx.fillRect(cx-13,base-124,10,30);         // barrels
      ctx.fillRect(cx+3,base-124,10,30);
      ctx.fillStyle="#15151a"; ctx.fillRect(cx-12,base-124,8,4); ctx.fillRect(cx+4,base-124,8,4);
      ctx.fillStyle="#2c2c33"; ctx.fillRect(cx-6,base-52,12,10);           // pump grip
    }else{
      /* pistol: slide, frame, grip */
      ctx.fillStyle="#4a4a52"; ctx.fillRect(cx-13,base-74,26,40);
      ctx.fillStyle="#5b5b66"; ctx.fillRect(cx-13,base-78,26,7);
      ctx.fillStyle="#22222a"; ctx.fillRect(cx-6,base-96,12,24);           // barrel
      ctx.fillStyle="#3a3a42"; ctx.fillRect(cx-11,base-36,22,38);          // grip
      ctx.fillStyle="#2a2a31"; ctx.fillRect(cx-11,base-36,22,5);
    }
    if(st.fired>6){
      const fy=base-(st.weapon===1?126:98);
      const r=st.weapon===1?26:17;
      const g=ctx.createRadialGradient(cx,fy,1,cx,fy,r);
      g.addColorStop(0,"#fffbe0"); g.addColorStop(.35,"#ffd24a");
      g.addColorStop(.7,"#ff7a12"); g.addColorStop(1,"rgba(255,110,0,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,fy,r,0,7); ctx.fill();
    }
    ctx.restore();
  }

  function bigNum(v,x,y,col){
    ctx.fillStyle=col||"#e04b2a";
    ctx.font="bold 19px Consolas,'Courier New',monospace";
    ctx.textAlign="right";
    ctx.fillText(String(v),x,y);
    ctx.textAlign="left";
  }
  function drawHud(){
    ctx.fillStyle="#2b2620"; ctx.fillRect(0,DOOM_VH,DOOM_W,DOOM_H-DOOM_VH);
    ctx.fillStyle="#4a4238"; ctx.fillRect(0,DOOM_VH,DOOM_W,1);
    ctx.font="8px Consolas,'Courier New',monospace";
    ctx.fillStyle="#9a8f7d";
    ctx.fillText("AMMO",8,DOOM_VH+9);
    ctx.fillText("HEALTH",58,DOOM_VH+9);
    ctx.fillText("ARMOR",176,DOOM_VH+9);
    ctx.fillText("KILLS",244,DOOM_VH+9);
    const ammo=st.weapon===1?st.shells:st.bullets;
    bigNum(ammo,46,DOOM_VH+27);
    bigNum(st.health+"%",120,DOOM_VH+27, st.health<35?"#ff3b2f":"#e04b2a");
    bigNum(st.armor+"%",228,DOOM_VH+27,"#3fa34a");
    bigNum(st.kills+"/"+totalMonsters,300,DOOM_VH+27,"#c9a227");
    /* the face: mood follows health */
    const fx=138, fy=DOOM_VH+5;
    ctx.fillStyle="#c98d5e"; ctx.fillRect(fx,fy,26,24);
    ctx.fillStyle="#5a3a22"; ctx.fillRect(fx,fy,26,4);
    ctx.fillStyle="#1a1008";
    ctx.fillRect(fx+5,fy+9,4,3); ctx.fillRect(fx+17,fy+9,4,3);
    const hurt=st.health<35;
    ctx.fillRect(fx+7,hurt?fy+19:fy+17,12,2);
    if(hurt){ ctx.fillStyle="#a01010"; ctx.fillRect(fx+3,fy+5,5,10); }
    ctx.fillStyle="#8a8070";
    ctx.font="7px Consolas,'Courier New',monospace";
    ctx.fillText(st.weapon===1?"SHOTGUN":"PISTOL",8,DOOM_VH+29);
    if(st.msgT>0 && st.mode==="play"){
      ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(0,2,DOOM_W,13);
      ctx.fillStyle="#e8e2d0"; ctx.font="9px Consolas,'Courier New',monospace";
      ctx.fillText(st.msg,6,12);
    }
  }
  function centre(text,y,size,col){
    ctx.fillStyle=col||"#e8e2d0";
    ctx.font=size+"px Consolas,'Courier New',monospace";
    ctx.textAlign="center";
    ctx.fillText(text,DOOM_W/2,y);
    ctx.textAlign="left";
  }
  function drawTitle(){
    ctx.fillStyle="rgba(6,4,4,.90)"; ctx.fillRect(0,0,DOOM_W,DOOM_H);
    centre("CLONEDOOM",56,30,"#c62d1f");
    centre("it runs on WinClone",76,10,"#9a8f7d");
    centre("WASD move · mouse or ←/→ turn",108,9,"#cfc7b5");
    centre("click shoot · E doors · shift run · 1/2 weapons",122,9,"#cfc7b5");
    centre("press SPACE or click to begin",146,10,"#e0b23a");
    centre("original engine — no id Software code or assets",186,7,"#6b6459");
  }
  function drawDead(){
    ctx.fillStyle="rgba(120,0,0,"+Math.min(.72,st.dead/70).toFixed(2)+")"; ctx.fillRect(0,0,DOOM_W,DOOM_H);
    if(st.dead>30){
      centre("YOU DIED",84,26,"#ffdede");
      centre("kills: "+st.kills+"/"+totalMonsters,104,10,"#ffb4b4");
      centre("press SPACE to try again",128,9,"#ffdede");
    }
  }
  function drawWin(){
    ctx.fillStyle="rgba(4,10,6,.90)"; ctx.fillRect(0,0,DOOM_W,DOOM_H);
    centre("LEVEL CLEARED",72,22,"#3fd06a");
    centre("kills: "+st.kills+"/"+totalMonsters,96,11,"#cfe8d5");
    centre("health left: "+st.health+"%",112,11,"#cfe8d5");
    centre("press SPACE to play again",140,9,"#e0b23a");
  }

  /* ---- loop ---- */
  let raf=0;
  function frame(){
    if(!body.isConnected || !state.wins.doom){ teardown(); return; }
    raf=requestAnimationFrame(frame);
    if(rec && rec.min) return;                       // minimised: don't burn cycles
    update();
    render();
  }
  updateTip();
  render();
  raf=requestAnimationFrame(frame);
}

/* ============================ PYTHON ============================
   A small Python 3 written from scratch: tokenizer -> parser -> a
   generator-based tree-walking interpreter.

   Generators are the whole trick. Every eval/exec here is a generator, so the
   driver can pause a running script between steps and hand the browser back.
   That's what makes `while True:` game loops safe (the tab never freezes),
   input() able to wait for a keystroke, and wcgame.flip() able to wait for the
   next animation frame.

   It is NOT CPython. No real int/float split (4/2 prints 2, not 2.0), no
   threads, no C modules, no real file IO, no operator overloading beyond
   __init__/__str__. Plenty for scripts and little games. */

const PY = {fuel:0, line:0, depth:0};
const PY_FUEL = 20000;               // steps between breaths
const PY_TICK = {tick:1};

/* ---------------- values ---------------- */
class PyTuple extends Array{}
class PyDict{ constructor(){ this.m=new Map(); } }        // dkey -> [key, value]
class PySet{  constructor(){ this.m=new Map(); } }        // dkey -> value
class PySlice{ constructor(a,b,c){ this.a=a; this.b=b; this.c=c; } }
class PyRange{ constructor(a,b,c){ this.a=a; this.b=b; this.c=c; } }
class PyFunc{ constructor(name,params,body,env){ this.name=name; this.params=params; this.body=body; this.env=env; } }
class PyClass{ constructor(name,bases,d){ this.name=name; this.bases=bases; this.d=d; } }
class PyObj{ constructor(cls){ this.cls=cls; this.d=new Map(); } }
class PyBound{ constructor(self,fn){ this.self=self; this.fn=fn; } }
class PyModule{ constructor(name,d){ this.name=name; this.d=d; } }
class PyExc{ constructor(type,msg){ this.type=type; this.msg=msg||""; this.line=0; } }
class PyReturn{ constructor(v){ this.v=v; } }
class PyBreak{}
class PyContinue{}
function pyErr(type,msg){ const e=new PyExc(type,msg); e.line=PY.line; return e; }

let _pyIdN=1; const _pyIds=new WeakMap();
function pyId(o){ if(typeof o!=="object"||o===null) return 0; if(!_pyIds.has(o)) _pyIds.set(o,_pyIdN++); return _pyIds.get(o); }
function dkey(v){
  if(v===null) return "N";
  const t=typeof v;
  if(t==="number")  return "f"+v;
  if(t==="string")  return "s"+v;
  if(t==="boolean") return "f"+(v?1:0);          // True and 1 are the same dict key in Python
  if(v instanceof PyTuple) return "t("+v.map(dkey).join("\u0001")+")";
  return "o"+pyId(v);
}

function pyTypeName(v){
  if(v===null) return "NoneType";
  if(typeof v==="boolean") return "bool";
  if(typeof v==="number") return Number.isInteger(v)?"int":"float";
  if(typeof v==="string") return "str";
  if(v instanceof PyTuple) return "tuple";
  if(Array.isArray(v)) return "list";
  if(v instanceof PyDict) return "dict";
  if(v instanceof PySet) return "set";
  if(v instanceof PyRange) return "range";
  if(v instanceof PyObj) return v.cls.name;
  if(v instanceof PyClass) return "type";
  if(v instanceof PyModule) return "module";
  if(v instanceof PyFunc || v instanceof PyBound || typeof v==="function") return "function";
  return "object";
}
function pyTruth(v){
  if(v===null||v===false||v===undefined) return false;
  if(v===true) return true;
  if(typeof v==="number") return v!==0;
  if(typeof v==="string") return v.length>0;
  if(Array.isArray(v)) return v.length>0;
  if(v instanceof PyDict||v instanceof PySet) return v.m.size>0;
  if(v instanceof PyRange) return pyLen(v)>0;
  return true;
}
function pyLen(v){
  if(typeof v==="string"||Array.isArray(v)) return v.length;
  if(v instanceof PyDict||v instanceof PySet) return v.m.size;
  if(v instanceof PyRange){ const n=Math.ceil((v.b-v.a)/v.c); return n>0?n:0; }
  throw pyErr("TypeError","object of type '"+pyTypeName(v)+"' has no len()");
}
function pyNumStr(n){
  if(Number.isNaN(n)) return "nan";
  if(n===Infinity) return "inf";
  if(n===-Infinity) return "-inf";
  if(Number.isInteger(n)) return String(n);
  return String(n);
}
function pyStr(v){
  if(v===null||v===undefined) return "None";
  if(v===true) return "True";
  if(v===false) return "False";
  if(typeof v==="number") return pyNumStr(v);
  if(typeof v==="string") return v;
  if(v instanceof PyTuple) return "("+[...v].map(pyRepr).join(", ")+(v.length===1?",":"")+")";
  if(Array.isArray(v)) return "["+v.map(pyRepr).join(", ")+"]";
  if(v instanceof PyDict) return "{"+[...v.m.values()].map(kv=>pyRepr(kv[0])+": "+pyRepr(kv[1])).join(", ")+"}";
  if(v instanceof PySet) return v.m.size? "{"+[...v.m.values()].map(pyRepr).join(", ")+"}" : "set()";
  if(v instanceof PyRange) return "range("+v.a+", "+v.b+(v.c!==1?", "+v.c:"")+")";
  if(v instanceof PyFunc) return "<function "+v.name+">";
  if(v instanceof PyBound) return "<bound method "+(v.fn&&v.fn.name||"?")+">";
  if(v instanceof PyClass) return "<class '"+v.name+"'>";
  if(v instanceof PyModule) return "<module '"+v.name+"'>";
  if(v instanceof PyObj) return "<"+v.cls.name+" object>";
  if(v instanceof PyExc) return v.msg||"";              // print(e) shows the message, like Python
  if(typeof v==="function") return "<built-in function "+(v.pyName||"?")+">";
  return String(v);
}
function pyRepr(v){
  if(v instanceof PyExc) return v.type+"("+(v.msg?pyRepr(v.msg):"")+")";
  if(typeof v==="string"){
    const q = (v.indexOf("'")>=0 && v.indexOf('"')<0) ? '"' : "'";
    let out="";
    for(const ch of v){
      if(ch===q||ch==="\\") out+="\\"+ch;
      else if(ch==="\n") out+="\\n";
      else if(ch==="\t") out+="\\t";
      else out+=ch;
    }
    return q+out+q;
  }
  return pyStr(v);
}
/* str() that can call a class's __str__ */
function* pyStrG(v){
  if(v instanceof PyObj){
    const m=classLookup(v.cls,"__str__")||classLookup(v.cls,"__repr__");
    if(m) return pyStr(yield* callPy(new PyBound(v,m),[],null));
  }
  return pyStr(v);
}

function pyEq(a,b){
  if(typeof a==="boolean") a=a?1:0;
  if(typeof b==="boolean") b=b?1:0;
  if(a===b) return true;
  if(a===null||b===null) return false;
  if(Array.isArray(a)&&Array.isArray(b)){
    if((a instanceof PyTuple)!==(b instanceof PyTuple)) return false;
    if(a.length!==b.length) return false;
    for(let i=0;i<a.length;i++) if(!pyEq(a[i],b[i])) return false;
    return true;
  }
  if(a instanceof PyDict&&b instanceof PyDict){
    if(a.m.size!==b.m.size) return false;
    for(const [k,kv] of a.m){ if(!b.m.has(k)) return false; if(!pyEq(kv[1],b.m.get(k)[1])) return false; }
    return true;
  }
  if(a instanceof PySet&&b instanceof PySet){
    if(a.m.size!==b.m.size) return false;
    for(const k of a.m.keys()) if(!b.m.has(k)) return false;
    return true;
  }
  return false;
}
function pyCmp(a,b){
  if(typeof a==="boolean") a=a?1:0;
  if(typeof b==="boolean") b=b?1:0;
  if(typeof a==="number"&&typeof b==="number") return a<b?-1:a>b?1:0;
  if(typeof a==="string"&&typeof b==="string") return a<b?-1:a>b?1:0;
  if(Array.isArray(a)&&Array.isArray(b)){
    const n=Math.min(a.length,b.length);
    for(let i=0;i<n;i++){ const c=pyCmp(a[i],b[i]); if(c) return c; }
    return a.length===b.length?0:(a.length<b.length?-1:1);
  }
  throw pyErr("TypeError","'<' not supported between instances of '"+pyTypeName(a)+"' and '"+pyTypeName(b)+"'");
}
function pyIn(needle,hay){
  if(typeof hay==="string") return typeof needle==="string" ? hay.indexOf(needle)>=0 : false;
  if(hay instanceof PyDict) return hay.m.has(dkey(needle));
  if(hay instanceof PySet) return hay.m.has(dkey(needle));
  if(Array.isArray(hay)){ for(const x of hay) if(pyEq(x,needle)) return true; return false; }
  if(hay instanceof PyRange){ for(const x of pyIter(hay)) if(pyEq(x,needle)) return true; return false; }
  throw pyErr("TypeError","argument of type '"+pyTypeName(hay)+"' is not iterable");
}
function* pyIter(v){
  if(v===null||v===undefined) throw pyErr("TypeError","'NoneType' object is not iterable");
  if(typeof v==="string"){ for(const ch of v) yield ch; return; }
  if(Array.isArray(v)){ for(let i=0;i<v.length;i++) yield v[i]; return; }
  if(v instanceof PyRange){
    const {a,b,c}=v;
    if(c>0){ for(let i=a;i<b;i+=c) yield i; }
    else if(c<0){ for(let i=a;i>b;i+=c) yield i; }
    return;
  }
  if(v instanceof PyDict){ for(const kv of [...v.m.values()]) yield kv[0]; return; }
  if(v instanceof PySet){ for(const x of [...v.m.values()]) yield x; return; }
  throw pyErr("TypeError","'"+pyTypeName(v)+"' object is not iterable");
}
function pyList(v){ return [...pyIter(v)]; }
function pyIndexNum(k){
  if(typeof k==="boolean") return k?1:0;
  if(typeof k!=="number"||!Number.isFinite(k)) throw pyErr("TypeError","list indices must be integers");
  return Math.trunc(k);
}
function pySliceOf(o,s){
  const n=o.length;
  const step = s.c==null?1:pyIndexNum(s.c);
  if(step===0) throw pyErr("ValueError","slice step cannot be zero");
  let start,stop;
  if(step>0){
    start = s.a==null?0:pyIndexNum(s.a); if(start<0) start+=n; start=Math.max(0,Math.min(n,start));
    stop  = s.b==null?n:pyIndexNum(s.b); if(stop <0) stop +=n; stop =Math.max(0,Math.min(n,stop));
  }else{
    start = s.a==null?n-1:pyIndexNum(s.a); if(start<0) start+=n; start=Math.max(-1,Math.min(n-1,start));
    stop  = s.b==null?-1 :pyIndexNum(s.b); if(stop <0) stop +=n; stop =Math.max(-1,Math.min(n,stop));
  }
  const out=[];
  if(step>0){ for(let i=start;i<stop;i+=step) out.push(o[i]); }
  else      { for(let i=start;i>stop;i+=step) out.push(o[i]); }
  if(typeof o==="string") return out.join("");
  if(o instanceof PyTuple) return PyTuple.from(out);
  return out;
}
function pyGetItem(o,k){
  if(o instanceof PyDict){
    const e=o.m.get(dkey(k));
    if(!e) throw pyErr("KeyError",pyRepr(k));
    return e[1];
  }
  if(typeof o==="string"||Array.isArray(o)){
    if(k instanceof PySlice) return pySliceOf(o,k);
    let i=pyIndexNum(k);
    if(i<0) i+=o.length;
    if(i<0||i>=o.length) throw pyErr("IndexError",(typeof o==="string"?"string index":(o instanceof PyTuple?"tuple index":"list index"))+" out of range");
    return o[i];
  }
  if(o instanceof PyRange){
    const arr=pyList(o);
    if(k instanceof PySlice) return pySliceOf(arr,k);
    let i=pyIndexNum(k); if(i<0) i+=arr.length;
    if(i<0||i>=arr.length) throw pyErr("IndexError","range object index out of range");
    return arr[i];
  }
  throw pyErr("TypeError","'"+pyTypeName(o)+"' object is not subscriptable");
}
function pySetItem(o,k,v){
  if(o instanceof PyDict){ o.m.set(dkey(k),[k,v]); return; }
  if(Array.isArray(o)&&!(o instanceof PyTuple)){
    let i=pyIndexNum(k); if(i<0) i+=o.length;
    if(i<0||i>=o.length) throw pyErr("IndexError","list assignment index out of range");
    o[i]=v; return;
  }
  throw pyErr("TypeError","'"+pyTypeName(o)+"' object does not support item assignment");
}
function pyDelItem(o,k){
  if(o instanceof PyDict){ if(!o.m.delete(dkey(k))) throw pyErr("KeyError",pyRepr(k)); return; }
  if(Array.isArray(o)&&!(o instanceof PyTuple)){
    let i=pyIndexNum(k); if(i<0) i+=o.length;
    if(i<0||i>=o.length) throw pyErr("IndexError","list assignment index out of range");
    o.splice(i,1); return;
  }
  throw pyErr("TypeError","'"+pyTypeName(o)+"' object doesn't support item deletion");
}

/* ---------------- operators ---------------- */
function pyNum(v,op){
  if(typeof v==="boolean") return v?1:0;
  if(typeof v!=="number") throw pyErr("TypeError","unsupported operand type(s) for "+op+": '"+pyTypeName(v)+"'");
  return v;
}
function pyBin(op,a,b){
  if(op==="+"){
    if(typeof a==="string"&&typeof b==="string") return a+b;
    if(Array.isArray(a)&&Array.isArray(b)){
      if((a instanceof PyTuple)!==(b instanceof PyTuple))
        throw pyErr("TypeError","can only concatenate "+pyTypeName(a)+' (not "'+pyTypeName(b)+'") to '+pyTypeName(a));
      const out=[...a,...b];
      return (a instanceof PyTuple)?PyTuple.from(out):out;
    }
    if(typeof a==="string"||typeof b==="string")
      throw pyErr("TypeError",'can only concatenate str (not "'+pyTypeName(typeof a==="string"?b:a)+'") to str');
    return pyNum(a,"+")+pyNum(b,"+");
  }
  if(op==="*"){
    const rep=(seq,n)=>{
      n=Math.trunc(pyNum(n,"*"));
      if(typeof seq==="string") return n>0?seq.repeat(n):"";
      const out=[]; for(let i=0;i<n;i++) out.push(...seq);
      return (seq instanceof PyTuple)?PyTuple.from(out):out;
    };
    if(typeof a==="string"||Array.isArray(a)){ if(typeof b==="number"||typeof b==="boolean") return rep(a,b); }
    if(typeof b==="string"||Array.isArray(b)){ if(typeof a==="number"||typeof a==="boolean") return rep(b,a); }
    return pyNum(a,"*")*pyNum(b,"*");
  }
  if(op==="%"){
    if(typeof a==="string") return pyPercentFormat(a,b);
    const x=pyNum(a,"%"), y=pyNum(b,"%");
    if(y===0) throw pyErr("ZeroDivisionError","integer division or modulo by zero");
    return ((x%y)+y)%y;
  }
  const x=pyNum(a,op), y=pyNum(b,op);
  switch(op){
    case "-": return x-y;
    case "/": if(y===0) throw pyErr("ZeroDivisionError","division by zero"); return x/y;
    case "//": if(y===0) throw pyErr("ZeroDivisionError","integer division or modulo by zero"); return Math.floor(x/y);
    case "**": return Math.pow(x,y);
    case "&": return x&y;
    case "|": return x|y;
    case "^": return x^y;
    case "<<": return x<<y;
    case ">>": return x>>y;
  }
  throw pyErr("SyntaxError","unknown operator "+op);
}
function pyPercentFormat(fmt,val){
  const args=(val instanceof PyTuple)?[...val]:[val];
  let i=0;
  return fmt.replace(/%(?:\(([^)]*)\))?([-+0 #]*)(\d+)?(?:\.(\d+))?([sdifgexr%])/g,(m,key,flags,w,p,t)=>{
    if(t==="%") return "%";
    let v;
    if(key!=null && val instanceof PyDict){ const e=val.m.get(dkey(key)); v=e?e[1]:null; }
    else v=args[i++];
    let s;
    if(t==="d"||t==="i") s=String(Math.trunc(Number(v)));
    else if(t==="f") s=Number(v).toFixed(p==null?6:+p);
    else if(t==="x") s=(Math.trunc(Number(v))>>>0).toString(16);
    else if(t==="e") s=Number(v).toExponential(p==null?6:+p);
    else if(t==="g") s=String(Number(v));
    else if(t==="r") s=pyRepr(v);
    else s=pyStr(v);
    if(w){
      const wn=+w;
      if(s.length<wn) s = flags.indexOf("-")>=0 ? s+" ".repeat(wn-s.length)
                        : ((flags.indexOf("0")>=0&&t!=="s"?"0":" ").repeat(wn-s.length)+s);
    }
    return s;
  });
}
function pyFormatSpec(v,spec){
  if(!spec) return null;
  const m=/^(?:([^<>^])?([<>^]))?([+\- ])?(0)?(\d+)?(,)?(?:\.(\d+))?([sdfgexn%])?$/.exec(spec);
  if(!m) return null;
  const fillc=m[1], align=m[2], sign=m[3], zero=m[4], width=m[5], comma=m[6], prec=m[7], type=m[8];
  let s;
  const isNum = typeof v==="number"||typeof v==="boolean";
  if(type==="f"||type==="%"){
    let num=Number(v); if(type==="%") num*=100;
    s=num.toFixed(prec==null?(type==="%"?1:6):+prec);
    if(type==="%") s+="%";
  }
  else if(type==="d") s=String(Math.trunc(Number(v)));
  else if(type==="e") s=Number(v).toExponential(prec==null?6:+prec);
  else if(type==="x") s=(Math.trunc(Number(v))>>>0).toString(16);
  else if(prec!=null && isNum) s=Number(v).toFixed(+prec);
  else if(prec!=null && typeof v==="string") s=v.slice(0,+prec);
  else s=pyStr(v);
  if(comma && /^-?\d+(\.\d+)?$/.test(s)){
    const neg=s[0]==="-"; if(neg) s=s.slice(1);
    const dot=s.indexOf("."), ip=dot<0?s:s.slice(0,dot), fp=dot<0?"":s.slice(dot);
    s=(neg?"-":"")+ip.replace(/\B(?=(\d{3})+(?!\d))/g,",")+fp;
  }
  if(sign==="+" && isNum && Number(v)>=0) s="+"+s;
  if(width){
    const w=+width, fill=fillc||(zero?"0":" ");
    if(s.length<w){
      const a = align || (isNum?">":"<");
      if(a==="<") s=s+fill.repeat(w-s.length);
      else if(a==="^"){ const l=Math.floor((w-s.length)/2); s=fill.repeat(l)+s+fill.repeat(w-s.length-l); }
      else s=fill.repeat(w-s.length)+s;
    }
  }
  return s;
}

/* ---------------- tokenizer ---------------- */
const PY_KW=new Set(["False","None","True","and","as","assert","break","class","continue","def","del",
  "elif","else","except","finally","for","from","global","if","import","in","is","lambda","nonlocal",
  "not","or","pass","raise","return","try","while","with","yield"]);
const PY_OPS=["**=","//=",">>=","<<=","!=","==",">=","<=","->",":=","+=","-=","*=","/=","%=","&=","|=","^=",
  "**","//",">>","<<","+","-","*","/","%","@","&","|","^","~","<",">","(",")","[","]","{","}",",",":",".",";","="];

function pyTokenize(src){
  src=String(src).replace(/\r\n?/g,"\n");
  const toks=[]; const indents=[0];
  let i=0, line=1, depth=0, atLineStart=true;
  const push=(t,v)=>toks.push({t,v,line});

  function readString(pref){
    const startLine=line;
    let quote, triple=false;
    if(src.substr(i,3)==="'''"||src.substr(i,3)==='"""'){ quote=src[i]; triple=true; i+=3; }
    else { quote=src[i]; i+=1; }
    const raw=pref.indexOf("r")>=0, isF=pref.indexOf("f")>=0;
    let out="";
    for(;;){
      if(i>=src.length) throw pySyntax("unterminated string literal",startLine);
      const ch=src[i];
      if(triple && src.substr(i,3)===quote+quote+quote){ i+=3; break; }
      if(!triple && ch===quote){ i++; break; }
      if(!triple && ch==="\n") throw pySyntax("EOL while scanning string literal",startLine);
      if(ch==="\\"){
        if(raw){ out+=ch+(src[i+1]||""); i+=2; continue; }
        i++;
        const e=src[i++];
        if(e==="n") out+="\n";
        else if(e==="t") out+="\t";
        else if(e==="r") out+="\r";
        else if(e==="\\") out+="\\";
        else if(e==="'") out+="'";
        else if(e==='"') out+='"';
        else if(e==="0") out+="\0";
        else if(e==="a") out+="\x07";
        else if(e==="b") out+="\b";
        else if(e==="f") out+="\f";
        else if(e==="v") out+="\v";
        else if(e==="\n"){ line++; }
        else if(e==="u"){ out+=String.fromCharCode(parseInt(src.substr(i,4),16)||0); i+=4; }
        else if(e==="x"){ out+=String.fromCharCode(parseInt(src.substr(i,2),16)||0); i+=2; }
        else out+="\\"+e;
        continue;
      }
      if(ch==="\n") line++;
      out+=ch; i++;
    }
    push(isF?"FSTR":"STR", out);
  }

  while(i<src.length){
    if(atLineStart && depth===0){
      let j=i, col=0;
      while(j<src.length){
        const c=src[j];
        if(c===" "){ col++; j++; }
        else if(c==="\t"){ col+=8-(col%8); j++; }
        else break;
      }
      if(j>=src.length){ i=j; break; }
      if(src[j]==="\n"){ i=j+1; line++; continue; }                       // blank line
      if(src[j]==="#"){ while(j<src.length&&src[j]!=="\n") j++; i=j; continue; }  // comment line
      i=j; atLineStart=false;
      const cur=indents[indents.length-1];
      if(col>cur){ indents.push(col); push("INDENT"); }
      else if(col<cur){
        while(col<indents[indents.length-1]) { indents.pop(); push("DEDENT"); }
        if(col!==indents[indents.length-1]) throw pySyntax("unindent does not match any outer indentation level",line);
      }
      continue;
    }
    const c=src[i];
    if(c==="\n"){ i++; line++; if(depth===0){ push("NEWLINE"); atLineStart=true; } continue; }
    if(c===" "||c==="\t"||c==="\f"||c==="\r"){ i++; continue; }
    if(c==="\\"&&src[i+1]==="\n"){ i+=2; line++; continue; }
    if(c==="#"){ while(i<src.length&&src[i]!=="\n") i++; continue; }
    if(/[A-Za-z_]/.test(c)){
      let j=i; while(j<src.length&&/[A-Za-z0-9_]/.test(src[j])) j++;
      const w=src.slice(i,j);
      if((src[j]==="'"||src[j]==='"') && /^(r|u|b|f|rb|br|fr|rf)$/i.test(w)){ i=j; readString(w.toLowerCase()); continue; }
      i=j;
      push(PY_KW.has(w)?"KW":"NAME", w);
      continue;
    }
    if(c==="'"||c==='"'){ readString(""); continue; }
    if(/[0-9]/.test(c) || (c==="."&&/[0-9]/.test(src[i+1]||""))){
      let j=i;
      if(c==="0"&&/[xXbBoO]/.test(src[i+1]||"")){
        const base=/[xX]/.test(src[i+1])?16:(/[bB]/.test(src[i+1])?2:8);
        j=i+2;
        while(j<src.length&&/[0-9a-fA-F_]/.test(src[j])) j++;
        push("NUM", parseInt(src.slice(i+2,j).replace(/_/g,""),base)||0);
        i=j; continue;
      }
      while(j<src.length&&/[0-9_]/.test(src[j])) j++;
      if(src[j]==="."){ j++; while(j<src.length&&/[0-9_]/.test(src[j])) j++; }
      if(/[eE]/.test(src[j]||"")){ let k=j+1; if(/[+\-]/.test(src[k]||"")) k++; if(/[0-9]/.test(src[k]||"")){ j=k; while(j<src.length&&/[0-9]/.test(src[j])) j++; } }
      push("NUM", parseFloat(src.slice(i,j).replace(/_/g,"")));
      i=j; continue;
    }
    let op=null;
    for(const o of PY_OPS){ if(src.startsWith(o,i)){ op=o; break; } }
    if(!op) throw pySyntax("invalid character "+JSON.stringify(c),line);
    if(op==="("||op==="["||op==="{") depth++;
    if(op===")"||op==="]"||op==="}") depth=Math.max(0,depth-1);
    push("OP",op); i+=op.length;
  }
  if(toks.length && toks[toks.length-1].t!=="NEWLINE") push("NEWLINE");
  while(indents.length>1){ indents.pop(); push("DEDENT"); }
  push("EOF");
  return toks;
}
function pySyntax(msg,line){ const e=new PyExc("SyntaxError",msg); e.line=line||0; return e; }

/* ---------------- parser ---------------- */
function pyParse(src){
  const T=pyTokenize(src);
  let p=0;
  const peek=(k)=>T[p+(k||0)];
  const tt=()=>T[p].t;
  const tv=()=>T[p].v;
  const isOp=(v)=>T[p].t==="OP"&&T[p].v===v;
  const isKw=(v)=>T[p].t==="KW"&&T[p].v===v;
  const next=()=>T[p++];
  function expectOp(v){ if(!isOp(v)) throw pySyntax("expected '"+v+"' but found "+describe(T[p]),T[p].line); return next(); }
  function expectKw(v){ if(!isKw(v)) throw pySyntax("expected '"+v+"'",T[p].line); return next(); }
  function expect(t){ if(tt()!==t) throw pySyntax("expected "+t.toLowerCase()+" but found "+describe(T[p]),T[p].line); return next(); }
  function describe(tok){
    if(tok.t==="EOF") return "end of file";
    if(tok.t==="NEWLINE") return "end of line";
    if(tok.t==="INDENT"||tok.t==="DEDENT") return "a change in indentation";
    return "'"+tok.v+"'";
  }
  function skipNewlines(){ while(tt()==="NEWLINE") next(); }

  function parseModule(){
    const body=[];
    skipNewlines();
    while(tt()!=="EOF"){ body.push(...parseStatement()); skipNewlines(); }
    return {k:"Module",body};
  }
  function parseBlock(){
    // ": <simple statements>" on one line, or ":" NEWLINE INDENT ... DEDENT
    expectOp(":");
    if(tt()!=="NEWLINE"){ return parseSimpleLine(); }
    expect("NEWLINE");
    skipNewlines();
    expect("INDENT");
    const body=[];
    skipNewlines();
    while(tt()!=="DEDENT"&&tt()!=="EOF"){ body.push(...parseStatement()); skipNewlines(); }
    if(tt()==="DEDENT") next();
    if(!body.length) throw pySyntax("expected an indented block",T[p].line);
    return body;
  }
  function parseSimpleLine(){
    const out=[];
    for(;;){
      out.push(parseSimple());
      if(isOp(";")){ next(); if(tt()==="NEWLINE"||tt()==="EOF") break; continue; }
      break;
    }
    if(tt()==="NEWLINE") next();
    return out;
  }
  function parseStatement(){
    const line=T[p].line;
    if(isKw("if"))    return [parseIf()];
    if(isKw("while")) return [parseWhile()];
    if(isKw("for"))   return [parseFor()];
    if(isKw("def"))   return [parseDef()];
    if(isKw("class")) return [parseClass()];
    if(isKw("try"))   return [parseTry()];
    if(isKw("with"))  return [parseWith()];
    if(isOp("@")){                                  // decorators: parsed and ignored
      while(isOp("@")){ next(); parseExpr(); if(tt()==="NEWLINE") next(); skipNewlines(); }
      return parseStatement();
    }
    const s=parseSimpleLine();
    s.forEach(x=>{ if(!x.line) x.line=line; });
    return s;
  }
  function parseIf(){
    const line=T[p].line;
    expectKw("if");
    const test=parseExpr();
    const body=parseBlock();
    let orelse=null;
    skipNewlines();
    if(isKw("elif")){ T[p]={t:"KW",v:"if",line:T[p].line}; orelse=[parseIf()]; }
    else if(isKw("else")){ next(); orelse=parseBlock(); }
    return {k:"If",test,body,orelse,line};
  }
  function parseWhile(){
    const line=T[p].line;
    expectKw("while");
    const test=parseExpr();
    const body=parseBlock();
    skipNewlines();
    if(isKw("else")){ next(); parseBlock(); }        // while/else: parsed, not run
    return {k:"While",test,body,line};
  }
  function parseFor(){
    const line=T[p].line;
    expectKw("for");
    const target=parseTargetList();
    expectKw("in");
    const iter=parseExpr();
    const body=parseBlock();
    skipNewlines();
    if(isKw("else")){ next(); parseBlock(); }
    return {k:"For",target,iter,body,line};
  }
  function parseTargetList(){
    const first=parseTarget();
    if(!isOp(",")) return first;
    const elts=[first];
    while(isOp(",")){ next(); if(isKw("in")) break; elts.push(parseTarget()); }
    return {k:"Tuple",elts};
  }
  function parseTarget(){
    if(isOp("*")){ next(); return {k:"Starred",value:parseTarget()}; }
    if(isOp("(")||isOp("[")){
      const close=isOp("(")?")":"]"; next();
      const elts=[];
      while(!isOp(close)){ elts.push(parseTarget()); if(isOp(",")) next(); else break; }
      expectOp(close);
      return {k:"Tuple",elts};
    }
    return parseUnaryPostfix();
  }
  function parseDef(){
    const line=T[p].line;
    expectKw("def");
    const name=expect("NAME").v;
    expectOp("(");
    const params=parseParams();
    expectOp(")");
    if(isOp("->")){ next(); parseExpr(); }           // return annotations: ignored
    const body=parseBlock();
    return {k:"Def",name,params,body,line};
  }
  function parseParams(){
    const params={names:[],star:null,dstar:null};
    while(!isOp(")")){
      if(isOp("*")){ next(); if(tt()==="NAME") params.star=next().v; }
      else if(isOp("**")){ next(); params.dstar=expect("NAME").v; }
      else if(isOp("/")){ next(); }                  // positional-only marker: ignored
      else{
        const nm=expect("NAME").v;
        if(isOp(":")){ next(); parseExpr(); }        // annotations: ignored
        let def=null;
        if(isOp("=")){ next(); def=parseExpr(); }
        params.names.push({name:nm,def});
      }
      if(isOp(",")) next(); else break;
    }
    return params;
  }
  function parseClass(){
    const line=T[p].line;
    expectKw("class");
    const name=expect("NAME").v;
    const bases=[];
    if(isOp("(")){
      next();
      while(!isOp(")")){ bases.push(parseExpr()); if(isOp(",")) next(); else break; }
      expectOp(")");
    }
    const body=parseBlock();
    return {k:"Class",name,bases,body,line};
  }
  function parseTry(){
    const line=T[p].line;
    expectKw("try");
    const body=parseBlock();
    const handlers=[]; let fin=null;
    skipNewlines();
    while(isKw("except")){
      next();
      let types=null, nm=null;
      if(!isOp(":")){
        const e1=parseExpr();
        types=exprToNames(e1);
        if(isKw("as")){ next(); nm=expect("NAME").v; }
      }
      const hbody=parseBlock();
      handlers.push({types,name:nm,body:hbody});
      skipNewlines();
    }
    if(isKw("else")){ next(); parseBlock(); }
    skipNewlines();
    if(isKw("finally")){ next(); fin=parseBlock(); }
    return {k:"Try",body,handlers,fin,line};
  }
  function exprToNames(e){
    if(e.k==="Name") return [e.id];
    if(e.k==="Tuple") return e.elts.map(x=>x.k==="Name"?x.id:"Exception");
    return ["Exception"];
  }
  function parseWith(){
    /* `with expr as name:` — no context-manager protocol, it just binds the
       value and runs the block, which is what a beginner script expects. */
    const line=T[p].line;
    expectKw("with");
    const items=[];
    for(;;){
      const v=parseExpr();
      let nm=null;
      if(isKw("as")){ next(); nm=parseTarget(); }
      items.push({value:v,target:nm});
      if(isOp(",")){ next(); continue; }
      break;
    }
    const body=parseBlock();
    return {k:"With",items,body,line};
  }
  function parseSimple(){
    const line=T[p].line;
    if(isKw("pass")){ next(); return {k:"Pass",line}; }
    if(isKw("break")){ next(); return {k:"Break",line}; }
    if(isKw("continue")){ next(); return {k:"Continue",line}; }
    if(isKw("return")){
      next();
      const v=(tt()==="NEWLINE"||tt()==="EOF"||isOp(";"))?null:parseExprList();
      return {k:"Return",value:v,line};
    }
    if(isKw("raise")){
      next();
      const v=(tt()==="NEWLINE"||tt()==="EOF"||isOp(";"))?null:parseExpr();
      if(isKw("from")){ next(); parseExpr(); }
      return {k:"Raise",exc:v,line};
    }
    if(isKw("assert")){
      next();
      const test=parseExpr();
      let msg=null;
      if(isOp(",")){ next(); msg=parseExpr(); }
      return {k:"Assert",test,msg,line};
    }
    if(isKw("global")||isKw("nonlocal")){
      next();
      const names=[expect("NAME").v];
      while(isOp(",")){ next(); names.push(expect("NAME").v); }
      return {k:"Global",names,line};
    }
    if(isKw("del")){
      next();
      const targets=[parseUnaryPostfix()];
      while(isOp(",")){ next(); targets.push(parseUnaryPostfix()); }
      return {k:"Del",targets,line};
    }
    if(isKw("import")){
      next();
      const names=[];
      for(;;){
        let mod=expect("NAME").v;
        while(isOp(".")){ next(); mod+="."+expect("NAME").v; }
        let as=null;
        if(isKw("as")){ next(); as=expect("NAME").v; }
        names.push({name:mod,as});
        if(isOp(",")){ next(); continue; }
        break;
      }
      return {k:"Import",names,line};
    }
    if(isKw("from")){
      next();
      let mod=expect("NAME").v;
      while(isOp(".")){ next(); mod+="."+expect("NAME").v; }
      expectKw("import");
      const names=[];
      if(isOp("*")){ next(); names.push({name:"*",as:null}); }
      else{
        const paren=isOp("("); if(paren) next();
        for(;;){
          const nm=expect("NAME").v;
          let as=null;
          if(isKw("as")){ next(); as=expect("NAME").v; }
          names.push({name:nm,as});
          if(isOp(",")){ next(); continue; }
          break;
        }
        if(paren) expectOp(")");
      }
      return {k:"From",module:mod,names,line};
    }
    // expression / assignment
    const first=parseExprList();
    if(isOp("=")){
      const targets=[first];
      let value=null;
      while(isOp("=")){
        next();
        value=parseExprList();
        if(isOp("=")) targets.push(value);
      }
      return {k:"Assign",targets,value,line};
    }
    const aug=["+=","-=","*=","/=","//=","%=","**=","&=","|=","^=",">>=","<<="];
    if(tt()==="OP"&&aug.indexOf(tv())>=0){
      const op=next().v.slice(0,-1);
      const value=parseExprList();
      return {k:"Aug",target:first,op,value,line};
    }
    if(isOp(":")){                                   // annotated assignment: x: int = 3
      next(); parseExpr();
      if(isOp("=")){ next(); const value=parseExprList(); return {k:"Assign",targets:[first],value,line}; }
      return {k:"Pass",line};
    }
    return {k:"Expr",e:first,line};
  }
  function parseListElement(){
    // `*rest` only shows up in unpacking targets and tuple displays
    if(isOp("*")){ next(); return {k:"Starred",value:parseExpr()}; }
    return parseExpr();
  }
  function parseExprList(){
    const first=parseListElement();
    if(!isOp(",")) return first;
    const elts=[first];
    while(isOp(",")){
      next();
      if(tt()==="NEWLINE"||tt()==="EOF"||isOp("=")||isOp(")")||isOp("]")||isOp("}")||isOp(":")) break;
      elts.push(parseListElement());
    }
    return {k:"Tuple",elts};
  }
  function parseExpr(){ return parseTernary(); }
  function parseTernary(){
    if(isKw("lambda")) return parseLambda();
    const v=parseOr();
    if(isKw("if")){
      next();
      const cond=parseOr();
      expectKw("else");
      const other=parseExpr();
      return {k:"IfExp",test:cond,body:v,orelse:other};
    }
    return v;
  }
  function parseLambda(){
    expectKw("lambda");
    const params={names:[],star:null,dstar:null};
    while(!isOp(":")){
      if(isOp("*")){ next(); if(tt()==="NAME") params.star=next().v; }
      else if(isOp("**")){ next(); params.dstar=expect("NAME").v; }
      else{
        const nm=expect("NAME").v;
        let def=null;
        if(isOp("=")){ next(); def=parseExpr(); }
        params.names.push({name:nm,def});
      }
      if(isOp(",")) next(); else break;
    }
    expectOp(":");
    const body=parseExpr();
    return {k:"Lambda",params,body};
  }
  function parseOr(){
    let l=parseAnd();
    while(isKw("or")){ next(); l={k:"Bool",op:"or",l,r:parseAnd()}; }
    return l;
  }
  function parseAnd(){
    let l=parseNot();
    while(isKw("and")){ next(); l={k:"Bool",op:"and",l,r:parseNot()}; }
    return l;
  }
  function parseNot(){
    if(isKw("not")){ next(); return {k:"Unary",op:"not",v:parseNot()}; }
    return parseComparison();
  }
  function parseComparison(){
    const first=parseBitOr();
    const ops=[], rest=[];
    for(;;){
      let op=null;
      if(tt()==="OP"&&["<",">","<=",">=","==","!="].indexOf(tv())>=0) op=next().v;
      else if(isKw("in")){ next(); op="in"; }
      else if(isKw("not")&&peek(1).t==="KW"&&peek(1).v==="in"){ next(); next(); op="not in"; }
      else if(isKw("is")){
        next();
        if(isKw("not")){ next(); op="is not"; } else op="is";
      }
      else break;
      ops.push(op); rest.push(parseBitOr());
    }
    if(!ops.length) return first;
    return {k:"Compare",first,ops,rest};
  }
  function binLevel(nextFn,opsList){
    return function(){
      let l=nextFn();
      while(tt()==="OP"&&opsList.indexOf(tv())>=0){ const op=next().v; l={k:"Bin",op,l,r:nextFn()}; }
      return l;
    };
  }
  const parseArith=binLevel(()=>parseTerm(),["+","-"]);
  function parseBitOr(){ let l=parseBitXor(); while(isOp("|")){ next(); l={k:"Bin",op:"|",l,r:parseBitXor()}; } return l; }
  function parseBitXor(){ let l=parseBitAnd(); while(isOp("^")){ next(); l={k:"Bin",op:"^",l,r:parseBitAnd()}; } return l; }
  function parseBitAnd(){ let l=parseShift(); while(isOp("&")){ next(); l={k:"Bin",op:"&",l,r:parseShift()}; } return l; }
  function parseShift(){
    let l=parseArith();
    while(tt()==="OP"&&(tv()==="<<"||tv()===">>")){ const op=next().v; l={k:"Bin",op,l,r:parseArith()}; }
    return l;
  }
  function parseTerm(){
    let l=parseUnary();
    while(tt()==="OP"&&["*","/","//","%","@"].indexOf(tv())>=0){ const op=next().v; l={k:"Bin",op:op==="@"?"*":op,l,r:parseUnary()}; }
    return l;
  }
  function parseUnary(){
    if(tt()==="OP"&&(tv()==="-"||tv()==="+"||tv()==="~")){ const op=next().v; return {k:"Unary",op,v:parseUnary()}; }
    return parsePower();
  }
  function parsePower(){
    const b=parseUnaryPostfix();
    if(isOp("**")){ next(); return {k:"Bin",op:"**",l:b,r:parseUnary()}; }
    return b;
  }
  function parseUnaryPostfix(){
    let a=parseAtom();
    for(;;){
      if(isOp("(")){
        next();
        const args=[];
        while(!isOp(")")){
          if(isOp("*")){ next(); args.push({kind:"star",value:parseExpr()}); }
          else if(isOp("**")){ next(); args.push({kind:"dstar",value:parseExpr()}); }
          else if(tt()==="NAME"&&peek(1).t==="OP"&&peek(1).v==="="){
            const nm=next().v; next();
            args.push({kind:"kw",name:nm,value:parseExpr()});
          }
          else{
            const e=parseExpr();
            if(isKw("for")){ args.push({kind:"pos",value:parseCompTail(e,"list")}); }
            else args.push({kind:"pos",value:e});
          }
          if(isOp(",")) next(); else break;
        }
        expectOp(")");
        a={k:"Call",fn:a,args};
        continue;
      }
      if(isOp("[")){
        next();
        const sl=parseSubscript();
        expectOp("]");
        a={k:"Sub",value:a,slice:sl};
        continue;
      }
      if(isOp(".")){
        next();
        const nm=expect("NAME").v;
        a={k:"Attr",value:a,attr:nm};
        continue;
      }
      break;
    }
    return a;
  }
  function parseSubscript(){
    let lo=null,hi=null,st=null,isSlice=false;
    if(!isOp(":")) lo=parseExpr();
    if(isOp(":")){
      isSlice=true; next();
      if(!isOp("]")&&!isOp(":")) hi=parseExpr();
      if(isOp(":")){ next(); if(!isOp("]")) st=parseExpr(); }
    }
    if(!isSlice) return lo;
    return {k:"Slice",lo,hi,st};
  }
  function parseCompTail(elt,kind,key,val){
    const gens=[];
    while(isKw("for")){
      next();
      const target=parseTargetList();
      expectKw("in");
      const iter=parseOr();
      const ifs=[];
      while(isKw("if")){ next(); ifs.push(parseOr()); }
      gens.push({target,iter,ifs});
    }
    return {k:"Comp",kind,elt,key,val,gens};
  }
  function parseAtom(){
    const tk=T[p];
    if(tk.t==="NUM"){ next(); return {k:"Num",v:tk.v}; }
    if(tk.t==="STR"){
      next();
      let s=tk.v;
      while(tt()==="STR"){ s+=next().v; }                 // implicit concatenation
      return {k:"Str",v:s};
    }
    if(tk.t==="FSTR"){ next(); return parseFString(tk.v,tk.line); }
    if(tk.t==="NAME"){ next(); return {k:"Name",id:tk.v}; }
    if(tk.t==="KW"){
      if(tk.v==="True"){ next(); return {k:"Const",v:true}; }
      if(tk.v==="False"){ next(); return {k:"Const",v:false}; }
      if(tk.v==="None"){ next(); return {k:"Const",v:null}; }
      if(tk.v==="lambda") return parseLambda();
      if(tk.v==="not"){ next(); return {k:"Unary",op:"not",v:parseNot()}; }
      throw pySyntax("unexpected keyword '"+tk.v+"'",tk.line);
    }
    if(isOp("(")){
      next();
      if(isOp(")")){ next(); return {k:"TupleLit",elts:[]}; }
      const first=parseExpr();
      if(isKw("for")){ const c=parseCompTail(first,"list"); expectOp(")"); return c; }
      if(isOp(",")){
        const elts=[first];
        while(isOp(",")){ next(); if(isOp(")")) break; elts.push(parseExpr()); }
        expectOp(")");
        return {k:"TupleLit",elts};
      }
      expectOp(")");
      return first;
    }
    if(isOp("[")){
      next();
      if(isOp("]")){ next(); return {k:"ListLit",elts:[]}; }
      const first=parseExpr();
      if(isKw("for")){ const c=parseCompTail(first,"list"); expectOp("]"); return c; }
      const elts=[first];
      while(isOp(",")){ next(); if(isOp("]")) break; elts.push(parseExpr()); }
      expectOp("]");
      return {k:"ListLit",elts};
    }
    if(isOp("{")){
      next();
      if(isOp("}")){ next(); return {k:"DictLit",keys:[],vals:[]}; }
      const first=parseExpr();
      if(isOp(":")){
        next();
        const firstVal=parseExpr();
        if(isKw("for")){ const c=parseCompTail(null,"dict",first,firstVal); expectOp("}"); return c; }
        const keys=[first], vals=[firstVal];
        while(isOp(",")){
          next(); if(isOp("}")) break;
          keys.push(parseExpr()); expectOp(":"); vals.push(parseExpr());
        }
        expectOp("}");
        return {k:"DictLit",keys,vals};
      }
      if(isKw("for")){ const c=parseCompTail(first,"set"); expectOp("}"); return c; }
      const elts=[first];
      while(isOp(",")){ next(); if(isOp("}")) break; elts.push(parseExpr()); }
      expectOp("}");
      return {k:"SetLit",elts};
    }
    throw pySyntax("unexpected "+describe(tk),tk.line);
  }
  function parseFString(raw,line){
    const parts=[];
    let buf="";
    for(let i=0;i<raw.length;i++){
      const c=raw[i];
      if(c==="{"&&raw[i+1]==="{"){ buf+="{"; i++; continue; }
      if(c==="}"&&raw[i+1]==="}"){ buf+="}"; i++; continue; }
      if(c==="{"){
        if(buf){ parts.push({t:"s",v:buf}); buf=""; }
        let d=1, j=i+1, expr="";
        while(j<raw.length&&d>0){
          if(raw[j]==="{") d++;
          else if(raw[j]==="}"){ d--; if(!d) break; }
          expr+=raw[j]; j++;
        }
        i=j;
        let spec=null, conv=null;
        const bang=expr.lastIndexOf("!");
        const colon=fstrSpecColon(expr);
        if(colon>=0){ spec=expr.slice(colon+1); expr=expr.slice(0,colon); }
        if(bang>=0 && bang>colon && /^[rsa]$/.test(expr.slice(bang+1))){ conv=expr.slice(bang+1); expr=expr.slice(0,bang); }
        if(/=\s*$/.test(expr) && !/[=!<>]=\s*$/.test(expr)){        // f"{x=}" debug form
          const src2=expr.replace(/=\s*$/,"");
          parts.push({t:"s",v:src2+"="});
          expr=src2;
        }
        let sub;
        try{ sub=pyParseExpression(expr); }
        catch(e){ throw pySyntax("bad expression in f-string: "+expr.trim(),line); }
        parts.push({t:"e",node:sub,spec,conv});
        continue;
      }
      buf+=c;
    }
    if(buf) parts.push({t:"s",v:buf});
    return {k:"FStr",parts};
  }
  function fstrSpecColon(s){
    let d=0;
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(c==="("||c==="["||c==="{") d++;
      else if(c===")"||c==="]"||c==="}") d--;
      else if(c===":"&&d===0) return i;
    }
    return -1;
  }
  return parseModule();
}
function pyParseExpression(src){
  const mod=pyParse(String(src).trim());
  if(!mod.body.length||mod.body[0].k!=="Expr") throw pySyntax("not an expression",0);
  return mod.body[0].e;
}

/* ---------------- environment ---------------- */
class PyEnv{
  constructor(parent){ this.v=new Map(); this.parent=parent||null; this.globals=null; }
  get(n){ let e=this; while(e){ if(e.v.has(n)) return e.v.get(n); e=e.parent; } return undefined; }
  setLocal(n,val){ this.v.set(n,val); }
  set(n,val){
    if(this.globals&&this.globals.has(n)){ let r=this; while(r.parent&&r.parent.parent) r=r.parent; r.v.set(n,val); return; }
    this.v.set(n,val);
  }
}
function envRoot(env){ let e=env; while(e.parent) e=e.parent; return e; }

function classLookup(cls,name){
  let c=cls, guard=0;
  while(c&&guard++<20){
    if(c.d.has(name)) return c.d.get(name);
    c=c.bases&&c.bases[0];
  }
  return undefined;
}
function pyGetAttr(o,name){
  if(o instanceof PyObj){
    if(o.d.has(name)) return o.d.get(name);
    const m=classLookup(o.cls,name);
    if(m!==undefined) return (m instanceof PyFunc)?new PyBound(o,m):m;
    throw pyErr("AttributeError","'"+o.cls.name+"' object has no attribute '"+name+"'");
  }
  if(o instanceof PyClass){
    const m=classLookup(o,name);
    if(m!==undefined) return m;
    throw pyErr("AttributeError","type object '"+o.name+"' has no attribute '"+name+"'");
  }
  if(o instanceof PyModule){
    if(Object.prototype.hasOwnProperty.call(o.d,name)) return o.d[name];
    throw pyErr("AttributeError","module '"+o.name+"' has no attribute '"+name+"'");
  }
  const m=pyMethod(o,name);
  if(m) return m;
  throw pyErr("AttributeError","'"+pyTypeName(o)+"' object has no attribute '"+name+"'");
}

/* ---------------- built-in methods ---------------- */
function argOr(args,i,d){ return args.length>i&&args[i]!==undefined?args[i]:d; }
const STR_M={
  upper:(s)=>s.toUpperCase(),
  lower:(s)=>s.toLowerCase(),
  title:(s)=>s.replace(/\w\S*/g,w=>w[0].toUpperCase()+w.slice(1).toLowerCase()),
  capitalize:(s)=>s?s[0].toUpperCase()+s.slice(1).toLowerCase():s,
  strip:(s,a)=>a.length?trimChars(s,pyStr(a[0]),3):s.trim(),
  lstrip:(s,a)=>a.length?trimChars(s,pyStr(a[0]),1):s.replace(/^\s+/,""),
  rstrip:(s,a)=>a.length?trimChars(s,pyStr(a[0]),2):s.replace(/\s+$/,""),
  split:(s,a)=>{
    if(!a.length||a[0]===null) return s.split(/\s+/).filter(x=>x!=="");
    const sep=pyStr(a[0]);
    const lim=a.length>1?pyIndexNum(a[1]):-1;
    if(lim<0) return s.split(sep);
    const parts=s.split(sep);
    return parts.slice(0,lim).concat(parts.length>lim?[parts.slice(lim).join(sep)]:[]);
  },
  rsplit:(s,a)=>STR_M.split(s,a),
  splitlines:(s)=>s.split(/\r\n?|\n/).filter((x,i,arr)=>!(i===arr.length-1&&x==="")),
  join:(s,a)=>pyList(a[0]).map(x=>{ if(typeof x!=="string") throw pyErr("TypeError","sequence item: expected str instance"); return x; }).join(s),
  replace:(s,a)=>{
    const from=pyStr(a[0]), to=pyStr(a[1]);
    if(a.length>2){
      let n=pyIndexNum(a[2]), out=s;
      while(n-->0 && out.indexOf(from)>=0) out=out.replace(from,to);
      return out;
    }
    return s.split(from).join(to);
  },
  startswith:(s,a)=>{ const p=a[0]; if(p instanceof PyTuple) return [...p].some(x=>s.startsWith(pyStr(x))); return s.startsWith(pyStr(p)); },
  endswith:(s,a)=>{ const p=a[0]; if(p instanceof PyTuple) return [...p].some(x=>s.endsWith(pyStr(x))); return s.endsWith(pyStr(p)); },
  find:(s,a)=>s.indexOf(pyStr(a[0])),
  rfind:(s,a)=>s.lastIndexOf(pyStr(a[0])),
  index:(s,a)=>{ const i=s.indexOf(pyStr(a[0])); if(i<0) throw pyErr("ValueError","substring not found"); return i; },
  count:(s,a)=>{ const t=pyStr(a[0]); if(!t) return s.length+1; return s.split(t).length-1; },
  isdigit:(s)=>s.length>0&&/^[0-9]+$/.test(s),
  isalpha:(s)=>s.length>0&&/^[A-Za-z]+$/.test(s),
  isalnum:(s)=>s.length>0&&/^[A-Za-z0-9]+$/.test(s),
  isspace:(s)=>s.length>0&&/^\s+$/.test(s),
  isupper:(s)=>/[A-Z]/.test(s)&&s===s.toUpperCase(),
  islower:(s)=>/[a-z]/.test(s)&&s===s.toLowerCase(),
  zfill:(s,a)=>{ const w=pyIndexNum(a[0]); const neg=s[0]==="-"; const b=neg?s.slice(1):s; return (neg?"-":"")+(b.length>=w-(neg?1:0)?b:"0".repeat(w-(neg?1:0)-b.length)+b); },
  ljust:(s,a)=>{ const w=pyIndexNum(a[0]), f=a.length>1?pyStr(a[1]):" "; return s.length>=w?s:s+f.repeat(w-s.length); },
  rjust:(s,a)=>{ const w=pyIndexNum(a[0]), f=a.length>1?pyStr(a[1]):" "; return s.length>=w?s:f.repeat(w-s.length)+s; },
  center:(s,a)=>{ const w=pyIndexNum(a[0]), f=a.length>1?pyStr(a[1]):" "; if(s.length>=w) return s; const l=Math.floor((w-s.length)/2); return f.repeat(l)+s+f.repeat(w-s.length-l); },
  format:(s,a,kw)=>{
    let auto=0;
    return s.replace(/\{([^{}]*)\}/g,(m,inner)=>{
      let spec=null;
      const ci=inner.indexOf(":");
      if(ci>=0){ spec=inner.slice(ci+1); inner=inner.slice(0,ci); }
      let v;
      if(inner==="") v=a[auto++];
      else if(/^\d+$/.test(inner)) v=a[+inner];
      else if(kw&&Object.prototype.hasOwnProperty.call(kw,inner)) v=kw[inner];
      else v=null;
      const f=pyFormatSpec(v,spec);
      return f!=null?f:pyStr(v);
    });
  },
};
function trimChars(s,chars,mode){
  let a=0,b=s.length;
  if(mode&1){ while(a<b&&chars.indexOf(s[a])>=0) a++; }
  if(mode&2){ while(b>a&&chars.indexOf(s[b-1])>=0) b--; }
  return s.slice(a,b);
}
const LIST_M={
  append:(l,a)=>{ l.push(argOr(a,0,null)); return null; },
  extend:(l,a)=>{ for(const x of pyIter(a[0])) l.push(x); return null; },
  insert:(l,a)=>{ let i=pyIndexNum(a[0]); if(i<0) i+=l.length; l.splice(Math.max(0,Math.min(l.length,i)),0,a[1]); return null; },
  pop:(l,a)=>{
    if(!l.length) throw pyErr("IndexError","pop from empty list");
    let i=a.length?pyIndexNum(a[0]):l.length-1;
    if(i<0) i+=l.length;
    if(i<0||i>=l.length) throw pyErr("IndexError","pop index out of range");
    return l.splice(i,1)[0];
  },
  remove:(l,a)=>{ for(let i=0;i<l.length;i++) if(pyEq(l[i],a[0])){ l.splice(i,1); return null; } throw pyErr("ValueError","list.remove(x): x not in list"); },
  clear:(l)=>{ l.length=0; return null; },
  index:(l,a)=>{ for(let i=0;i<l.length;i++) if(pyEq(l[i],a[0])) return i; throw pyErr("ValueError",pyRepr(a[0])+" is not in list"); },
  count:(l,a)=>{ let n=0; for(const x of l) if(pyEq(x,a[0])) n++; return n; },
  reverse:(l)=>{ l.reverse(); return null; },
  copy:(l)=>l.slice(),
  sort:function*(l,a,kw){ const s=yield* pySortArray(l,kw); l.length=0; l.push(...s); return null; },
};
LIST_M.sort.gen=true;
const TUP_M={
  index:LIST_M.index, count:LIST_M.count,
};
const DICT_M={
  get:(d,a)=>{ const e=d.m.get(dkey(a[0])); return e?e[1]:argOr(a,1,null); },
  keys:(d)=>[...d.m.values()].map(kv=>kv[0]),
  values:(d)=>[...d.m.values()].map(kv=>kv[1]),
  items:(d)=>[...d.m.values()].map(kv=>PyTuple.from([kv[0],kv[1]])),
  pop:(d,a)=>{
    const k=dkey(a[0]), e=d.m.get(k);
    if(!e){ if(a.length>1) return a[1]; throw pyErr("KeyError",pyRepr(a[0])); }
    d.m.delete(k); return e[1];
  },
  update:(d,a)=>{
    const o=a[0];
    if(o instanceof PyDict){ for(const kv of o.m.values()) d.m.set(dkey(kv[0]),[kv[0],kv[1]]); return null; }
    for(const pair of pyIter(o)){ const p=pyList(pair); d.m.set(dkey(p[0]),[p[0],p[1]]); }
    return null;
  },
  setdefault:(d,a)=>{
    const k=dkey(a[0]), e=d.m.get(k);
    if(e) return e[1];
    const v=argOr(a,1,null); d.m.set(k,[a[0],v]); return v;
  },
  clear:(d)=>{ d.m.clear(); return null; },
  copy:(d)=>{ const n=new PyDict(); for(const [k,kv] of d.m) n.m.set(k,[kv[0],kv[1]]); return n; },
};
const SET_M={
  add:(s,a)=>{ s.m.set(dkey(a[0]),a[0]); return null; },
  remove:(s,a)=>{ if(!s.m.delete(dkey(a[0]))) throw pyErr("KeyError",pyRepr(a[0])); return null; },
  discard:(s,a)=>{ s.m.delete(dkey(a[0])); return null; },
  clear:(s)=>{ s.m.clear(); return null; },
  copy:(s)=>{ const n=new PySet(); for(const [k,v] of s.m) n.m.set(k,v); return n; },
  union:(s,a)=>{ const n=SET_M.copy(s); for(const x of pyIter(a[0])) n.m.set(dkey(x),x); return n; },
  intersection:(s,a)=>{ const o=new PySet(); for(const x of pyIter(a[0])) if(s.m.has(dkey(x))) o.m.set(dkey(x),x); return o; },
  difference:(s,a)=>{ const n=SET_M.copy(s); for(const x of pyIter(a[0])) n.m.delete(dkey(x)); return n; },
};
function pyMethod(o,name){
  let tbl=null;
  if(typeof o==="string") tbl=STR_M;
  else if(o instanceof PyTuple) tbl=TUP_M;
  else if(Array.isArray(o)) tbl=LIST_M;
  else if(o instanceof PyDict) tbl=DICT_M;
  else if(o instanceof PySet) tbl=SET_M;
  if(!tbl||!Object.prototype.hasOwnProperty.call(tbl,name)) return null;
  const f=tbl[name];
  let bound;
  if(f.gen){ bound=function*(args,kw){ return yield* f(o,args||[],kw||null); }; bound.gen=true; }
  else bound=(args,kw)=>f(o,args||[],kw||null);
  bound.pyName=name;
  return bound;
}
function* pySortArray(arr,kw){
  const keyf=kw&&kw.key?kw.key:null;
  const rev=!!(kw&&pyTruth(kw.reverse));
  const decorated=[];
  for(const x of arr) decorated.push([keyf?yield* callPy(keyf,[x],null):x, x]);
  decorated.sort((p,q)=>pyCmp(p[0],q[0]));
  if(rev) decorated.reverse();
  return decorated.map(p=>p[1]);
}

/* ---------------- calling ---------------- */
function* callPy(f,args,kw){
  if(typeof f==="function"){
    if(f.gen) return yield* f(args,kw);
    const r=f(args,kw);
    return r===undefined?null:r;
  }
  if(f instanceof PyBound) return yield* callPy(f.fn,[f.self,...args],kw);
  if(f instanceof PyFunc){
    if(PY.depth>180) throw pyErr("RecursionError","maximum recursion depth exceeded");
    const env=new PyEnv(f.env);
    yield* bindParams(f,args,kw,env);
    PY.depth++;
    try{ yield* execBlock(f.body,env); return null; }
    catch(e){ if(e instanceof PyReturn) return e.v; throw e; }
    finally{ PY.depth--; }
  }
  if(f instanceof PyClass){
    const obj=new PyObj(f);
    const init=classLookup(f,"__init__");
    if(init) yield* callPy(new PyBound(obj,init),args,kw);
    return obj;
  }
  throw pyErr("TypeError","'"+pyTypeName(f)+"' object is not callable");
}
function* bindParams(f,args,kw,env){
  const p=f.params;
  let i=0;
  const used=new Set();
  for(const par of p.names){
    if(kw&&Object.prototype.hasOwnProperty.call(kw,par.name)){ env.setLocal(par.name,kw[par.name]); used.add(par.name); continue; }
    if(i<args.length){ env.setLocal(par.name,args[i++]); continue; }
    if(par.def){ env.setLocal(par.name, yield* evalNode(par.def,f.env)); continue; }
    throw pyErr("TypeError",f.name+"() missing required positional argument: '"+par.name+"'");
  }
  if(p.star) env.setLocal(p.star,PyTuple.from(args.slice(i)));
  else if(i<args.length) throw pyErr("TypeError",f.name+"() takes "+p.names.length+" positional argument(s) but "+args.length+" were given");
  if(p.dstar){
    const d=new PyDict();
    if(kw) for(const k of Object.keys(kw)) if(!used.has(k)) d.m.set(dkey(k),[k,kw[k]]);
    env.setLocal(p.dstar,d);
  }else if(kw){
    for(const k of Object.keys(kw)) if(!used.has(k)) throw pyErr("TypeError",f.name+"() got an unexpected keyword argument '"+k+"'");
  }
}

/* ---------------- statements ---------------- */
function* execBlock(body,env){ for(const st of body) yield* execStmt(st,env); }
function* execStmt(n,env){
  if(n.line) PY.line=n.line;
  switch(n.k){
    case "Expr": yield* evalNode(n.e,env); return;
    case "Pass": return;
    case "Assign": {
      const val=yield* evalNode(n.value,env);
      for(const t of n.targets) yield* assignTo(t,val,env);
      return;
    }
    case "Aug": {
      const cur=yield* evalNode(n.target,env);
      const rhs=yield* evalNode(n.value,env);
      if(n.op==="+"&&Array.isArray(cur)&&!(cur instanceof PyTuple)&&Array.isArray(rhs)){
        for(const x of rhs) cur.push(x);                 // list += list mutates in place
        return;
      }
      yield* assignTo(n.target,pyBin(n.op,cur,rhs),env);
      return;
    }
    case "If":
      if(pyTruth(yield* evalNode(n.test,env))) yield* execBlock(n.body,env);
      else if(n.orelse) yield* execBlock(n.orelse,env);
      return;
    case "While":
      for(;;){
        if(--PY.fuel<=0) yield PY_TICK;
        if(!pyTruth(yield* evalNode(n.test,env))) break;
        try{ yield* execBlock(n.body,env); }
        catch(e){
          if(e instanceof PyBreak) break;
          if(e instanceof PyContinue) continue;
          throw e;
        }
      }
      return;
    case "For": {
      const it=yield* evalNode(n.iter,env);
      for(const v of pyIter(it)){
        if(--PY.fuel<=0) yield PY_TICK;
        yield* assignTo(n.target,v,env);
        try{ yield* execBlock(n.body,env); }
        catch(e){
          if(e instanceof PyBreak) break;
          if(e instanceof PyContinue) continue;
          throw e;
        }
      }
      return;
    }
    case "Def": env.set(n.name,new PyFunc(n.name,n.params,n.body,env)); return;
    case "Class": {
      const cenv=new PyEnv(env);
      yield* execBlock(n.body,cenv);
      const d=new Map();
      for(const [k,v] of cenv.v) d.set(k,v);
      const bases=[];
      for(const b of n.bases){
        const bv=yield* evalNode(b,env);
        if(bv instanceof PyClass) bases.push(bv);
      }
      env.set(n.name,new PyClass(n.name,bases,d));
      return;
    }
    case "Return": throw new PyReturn(n.value?yield* evalNode(n.value,env):null);
    case "Break": throw new PyBreak();
    case "Continue": throw new PyContinue();
    case "Global": {
      if(!env.globals) env.globals=new Set();
      n.names.forEach(x=>env.globals.add(x));
      return;
    }
    case "Del":
      for(const t of n.targets){
        if(t.k==="Name"){ let e=env; while(e){ if(e.v.has(t.id)){ e.v.delete(t.id); break; } e=e.parent; } }
        else if(t.k==="Sub"){
          const o=yield* evalNode(t.value,env);
          const kk=yield* evalSlice(t.slice,env);
          pyDelItem(o,kk);
        }
        else if(t.k==="Attr"){
          const o=yield* evalNode(t.value,env);
          if(o instanceof PyObj) o.d.delete(t.attr);
        }
      }
      return;
    case "Import":
      for(const it of n.names){
        const m=yield* pyImportG(it.name,env);
        env.set(it.as||it.name.split(".")[0],m);
      }
      return;
    case "From": {
      const m=yield* pyImportG(n.module,env);
      for(const it of n.names){
        if(it.name==="*"){ Object.keys(m.d).forEach(k=>{ if(k[0]!=="_") env.set(k,m.d[k]); }); continue; }
        if(!Object.prototype.hasOwnProperty.call(m.d,it.name))
          throw pyErr("ImportError","cannot import name '"+it.name+"' from '"+n.module+"'");
        env.set(it.as||it.name,m.d[it.name]);
      }
      return;
    }
    case "Assert": {
      if(!pyTruth(yield* evalNode(n.test,env))){
        const m=n.msg?pyStr(yield* evalNode(n.msg,env)):"";
        throw pyErr("AssertionError",m);
      }
      return;
    }
    case "Raise": {
      if(!n.exc) throw pyErr("RuntimeError","No active exception to re-raise");
      const v=yield* evalNode(n.exc,env);
      if(v instanceof PyExc) throw v;
      if(typeof v==="function"&&v.excName) throw pyErr(v.excName,"");
      throw pyErr("Exception",pyStr(v));
    }
    case "Try": {
      let pending=null;
      try{
        try{ yield* execBlock(n.body,env); }
        catch(e){
          if(e instanceof PyReturn||e instanceof PyBreak||e instanceof PyContinue) throw e;
          const exc=(e instanceof PyExc)?e:new PyExc(jsErrType(e),jsErrMsg(e));
          let handled=false;
          for(const h of n.handlers){
            if(!h.types||h.types.some(t=>excMatches(exc,t))){
              if(h.name) env.set(h.name,exc);
              yield* execBlock(h.body,env);
              handled=true; break;
            }
          }
          if(!handled) throw exc;
        }
      }catch(e){ pending=e; }
      if(n.fin) yield* execBlock(n.fin,env);
      if(pending) throw pending;
      return;
    }
    case "With": {
      for(const it of n.items){
        const v=yield* evalNode(it.value,env);
        if(it.target) yield* assignTo(it.target,v,env);
      }
      yield* execBlock(n.body,env);
      return;
    }
  }
  throw pyErr("SyntaxError","unsupported statement");
}
const PY_OS_ERRORS=["FileNotFoundError","FileExistsError","PermissionError","IsADirectoryError","OSError","IOError"];
function excMatches(exc,typeName){
  if(typeName==="Exception"||typeName==="BaseException") return exc.type!=="SystemExit";
  if(typeName===exc.type) return true;
  if(typeName==="ArithmeticError") return exc.type==="ZeroDivisionError";
  if(typeName==="LookupError") return exc.type==="IndexError"||exc.type==="KeyError";
  if(typeName==="OSError"||typeName==="IOError") return PY_OS_ERRORS.indexOf(exc.type)>=0;
  return false;
}
function jsErrType(e){ return (e instanceof RangeError)?"RecursionError":"RuntimeError"; }
function jsErrMsg(e){ return (e&&e.message)?String(e.message):String(e); }

function* assignTo(t,val,env){
  switch(t.k){
    case "Name": env.set(t.id,val); return;
    case "Tuple": case "TupleLit": case "ListLit": case "List": {
      const elts=t.elts;
      const items=pyList(val);
      const si=elts.findIndex(e=>e.k==="Starred");
      if(si<0){
        if(items.length!==elts.length)
          throw pyErr("ValueError", items.length<elts.length
            ? "not enough values to unpack (expected "+elts.length+", got "+items.length+")"
            : "too many values to unpack (expected "+elts.length+")");
        for(let i=0;i<elts.length;i++) yield* assignTo(elts[i],items[i],env);
      }else{
        const before=elts.slice(0,si), after=elts.slice(si+1);
        if(items.length<before.length+after.length) throw pyErr("ValueError","not enough values to unpack");
        for(let i=0;i<before.length;i++) yield* assignTo(before[i],items[i],env);
        const mid=items.length-before.length-after.length;
        yield* assignTo(elts[si].value,items.slice(before.length,before.length+mid),env);
        for(let i=0;i<after.length;i++) yield* assignTo(after[i],items[before.length+mid+i],env);
      }
      return;
    }
    case "Sub": {
      const o=yield* evalNode(t.value,env);
      const k=yield* evalSlice(t.slice,env);
      pySetItem(o,k,val);
      return;
    }
    case "Attr": {
      const o=yield* evalNode(t.value,env);
      if(o instanceof PyObj){ o.d.set(t.attr,val); return; }
      if(o instanceof PyClass){ o.d.set(t.attr,val); return; }
      if(o instanceof PyModule){ o.d[t.attr]=val; return; }
      throw pyErr("AttributeError","can't set attribute '"+t.attr+"' on "+pyTypeName(o));
    }
  }
  throw pyErr("SyntaxError","cannot assign to this expression");
}

/* ---------------- expressions ---------------- */
function* evalSlice(node,env){
  if(node&&node.k==="Slice"){
    const a=node.lo?yield* evalNode(node.lo,env):null;
    const b=node.hi?yield* evalNode(node.hi,env):null;
    const c=node.st?yield* evalNode(node.st,env):null;
    return new PySlice(a,b,c);
  }
  return yield* evalNode(node,env);
}
function* evalNode(n,env){
  switch(n.k){
    case "Num": case "Str": case "Const": return n.v;
    case "Name": {
      const v=env.get(n.id);
      if(v===undefined) throw pyErr("NameError","name '"+n.id+"' is not defined");
      return v;
    }
    case "FStr": {
      let out="";
      for(const part of n.parts){
        if(part.t==="s"){ out+=part.v; continue; }
        const v=yield* evalNode(part.node,env);
        if(part.conv==="r"){ out+=pyRepr(v); continue; }
        const f=pyFormatSpec(v,part.spec);
        out += f!=null?f:(yield* pyStrG(v));
      }
      return out;
    }
    case "ListLit": {
      const out=[];
      for(const e of n.elts){
        if(e.k==="Starred"){ for(const x of pyIter(yield* evalNode(e.value,env))) out.push(x); }
        else out.push(yield* evalNode(e,env));
      }
      return out;
    }
    case "TupleLit": case "Tuple": {
      const out=[];
      for(const e of n.elts){
        if(e.k==="Starred"){ for(const x of pyIter(yield* evalNode(e.value,env))) out.push(x); }
        else out.push(yield* evalNode(e,env));
      }
      return PyTuple.from(out);
    }
    case "SetLit": {
      const s=new PySet();
      for(const e of n.elts){ const v=yield* evalNode(e,env); s.m.set(dkey(v),v); }
      return s;
    }
    case "DictLit": {
      const d=new PyDict();
      for(let i=0;i<n.keys.length;i++){
        const k=yield* evalNode(n.keys[i],env);
        const v=yield* evalNode(n.vals[i],env);
        d.m.set(dkey(k),[k,v]);
      }
      return d;
    }
    case "Comp": {
      const cenv=new PyEnv(env);
      if(n.kind==="dict"){
        const d=new PyDict();
        yield* compLoop(n,0,cenv,d);
        return d;
      }
      const out=[];
      yield* compLoop(n,0,cenv,out);
      if(n.kind==="set"){ const s=new PySet(); for(const x of out) s.m.set(dkey(x),x); return s; }
      return out;
    }
    case "Bool": {
      const l=yield* evalNode(n.l,env);
      if(n.op==="and") return pyTruth(l)?(yield* evalNode(n.r,env)):l;
      return pyTruth(l)?l:(yield* evalNode(n.r,env));
    }
    case "Unary": {
      const v=yield* evalNode(n.v,env);
      if(n.op==="not") return !pyTruth(v);
      if(n.op==="-") return -pyNum(v,"-");
      if(n.op==="+") return +pyNum(v,"+");
      if(n.op==="~") return ~pyNum(v,"~");
      break;
    }
    case "Bin": {
      const a=yield* evalNode(n.l,env);
      const b=yield* evalNode(n.r,env);
      return pyBin(n.op,a,b);
    }
    case "Compare": {
      let left=yield* evalNode(n.first,env);
      for(let i=0;i<n.ops.length;i++){
        const right=yield* evalNode(n.rest[i],env);
        const op=n.ops[i];
        let ok;
        if(op==="==") ok=pyEq(left,right);
        else if(op==="!=") ok=!pyEq(left,right);
        else if(op==="in") ok=pyIn(left,right);
        else if(op==="not in") ok=!pyIn(left,right);
        else if(op==="is") ok=(left===right)||(left===null&&right===null);
        else if(op==="is not") ok=!((left===right)||(left===null&&right===null));
        else{
          const c=pyCmp(left,right);
          ok = op==="<"?c<0 : op===">"?c>0 : op==="<="?c<=0 : c>=0;
        }
        if(!ok) return false;
        left=right;
      }
      return true;
    }
    case "IfExp":
      return pyTruth(yield* evalNode(n.test,env)) ? (yield* evalNode(n.body,env)) : (yield* evalNode(n.orelse,env));
    case "Lambda":
      return new PyFunc("<lambda>",n.params,[{k:"Return",value:n.body}],env);
    case "Attr": {
      const o=yield* evalNode(n.value,env);
      return pyGetAttr(o,n.attr);
    }
    case "Sub": {
      const o=yield* evalNode(n.value,env);
      const k=yield* evalSlice(n.slice,env);
      return pyGetItem(o,k);
    }
    case "Call": {
      const fn=yield* evalNode(n.fn,env);
      const args=[]; let kw=null;
      for(const a of n.args){
        if(a.kind==="star"){ for(const x of pyIter(yield* evalNode(a.value,env))) args.push(x); }
        else if(a.kind==="kw"){ kw=kw||{}; kw[a.name]=yield* evalNode(a.value,env); }
        else if(a.kind==="dstar"){
          const v=yield* evalNode(a.value,env);
          kw=kw||{};
          if(v instanceof PyDict) for(const kv of v.m.values()) kw[pyStr(kv[0])]=kv[1];
        }
        else args.push(yield* evalNode(a.value,env));
      }
      if(--PY.fuel<=0) yield PY_TICK;
      return yield* callPy(fn,args,kw);
    }
    case "Slice": return yield* evalSlice(n,env);
    case "Starred": return yield* evalNode(n.value,env);
  }
  throw pyErr("SyntaxError","cannot evaluate this expression");
}
function* compLoop(n,gi,env,out){
  const g=n.gens[gi];
  const it=yield* evalNode(g.iter,env);
  for(const v of pyIter(it)){
    if(--PY.fuel<=0) yield PY_TICK;
    yield* assignTo(g.target,v,env);
    let ok=true;
    for(const c of g.ifs){ if(!pyTruth(yield* evalNode(c,env))){ ok=false; break; } }
    if(!ok) continue;
    if(gi+1<n.gens.length){ yield* compLoop(n,gi+1,env,out); continue; }
    if(n.kind==="dict"){
      const k=yield* evalNode(n.key,env);
      const val=yield* evalNode(n.val,env);
      out.m.set(dkey(k),[k,val]);
    }else out.push(yield* evalNode(n.elt,env));
  }
}

/* ---------------- builtins ---------------- */
const PY_EXC_NAMES=["Exception","BaseException","ValueError","TypeError","NameError","IndexError","KeyError",
  "ZeroDivisionError","AttributeError","RuntimeError","StopIteration","AssertionError","ImportError",
  "NotImplementedError","OverflowError","RecursionError","SystemExit","ArithmeticError","LookupError",
  "OSError","IOError","FileNotFoundError","FileExistsError","PermissionError","IsADirectoryError"];

function makePyBuiltins(io){
  const B={};
  const def=(name,fn,isGen)=>{ fn.pyName=name; if(isGen) fn.gen=true; B[name]=fn; };
  const type=(name,fn)=>{ fn.pyName=name; fn.typeName=name; B[name]=fn; };

  def("print",function*(args,kw){
    const sep=(kw&&kw.sep!=null)?pyStr(kw.sep):" ";
    const end=(kw&&kw.end!=null)?pyStr(kw.end):"\n";
    const parts=[];
    for(const a of args) parts.push(yield* pyStrG(a));
    io.write(parts.join(sep)+end);
    return null;
  },true);
  def("input",function*(args){
    const prompt=args.length?yield* pyStrG(args[0]):"";
    const v=yield {input:prompt};
    return v==null?"":String(v);
  },true);
  def("len",(a)=>pyLen(a[0]));
  def("range",(a)=>{
    const num=(x)=>Math.trunc(pyNum(x,"range"));
    if(!a.length) throw pyErr("TypeError","range expected at least 1 argument");
    if(a.length===1) return new PyRange(0,num(a[0]),1);
    const step=a.length>2?num(a[2]):1;
    if(step===0) throw pyErr("ValueError","range() arg 3 must not be zero");
    return new PyRange(num(a[0]),num(a[1]),step);
  });
  type("int",(a)=>{
    if(!a.length) return 0;
    const v=a[0];
    if(typeof v==="boolean") return v?1:0;
    if(typeof v==="number") return Math.trunc(v);
    if(typeof v==="string"){
      const base=a.length>1?pyIndexNum(a[1]):10;
      const s=v.trim();
      const n=base===10?Number(s):parseInt(s,base);
      if(s===""||Number.isNaN(n)) throw pyErr("ValueError","invalid literal for int() with base "+base+": "+pyRepr(v));
      return Math.trunc(n);
    }
    throw pyErr("TypeError","int() argument must be a string or a number");
  });
  type("float",(a)=>{
    if(!a.length) return 0;
    const v=a[0];
    if(typeof v==="boolean") return v?1:0;
    if(typeof v==="number") return v;
    if(typeof v==="string"){
      const s=v.trim().toLowerCase();
      if(s==="inf") return Infinity;
      if(s==="-inf") return -Infinity;
      if(s==="nan") return NaN;
      const n=Number(s);
      if(s===""||Number.isNaN(n)) throw pyErr("ValueError","could not convert string to float: "+pyRepr(v));
      return n;
    }
    throw pyErr("TypeError","float() argument must be a string or a number");
  });
  const strFn=function*(a){ return a.length?yield* pyStrG(a[0]):""; };
  strFn.gen=true; strFn.pyName="str"; strFn.typeName="str"; B.str=strFn;
  type("bool",(a)=>a.length?pyTruth(a[0]):false);
  type("list",(a)=>a.length?pyList(a[0]):[]);
  type("tuple",(a)=>a.length?PyTuple.from(pyList(a[0])):PyTuple.from([]));
  type("dict",(a,kw)=>{
    const d=new PyDict();
    if(a.length){
      const o=a[0];
      if(o instanceof PyDict){ for(const kv of o.m.values()) d.m.set(dkey(kv[0]),[kv[0],kv[1]]); }
      else for(const pair of pyIter(o)){ const p=pyList(pair); d.m.set(dkey(p[0]),[p[0],p[1]]); }
    }
    if(kw) for(const k of Object.keys(kw)) d.m.set(dkey(k),[k,kw[k]]);
    return d;
  });
  type("set",(a)=>{
    const s=new PySet();
    if(a.length) for(const x of pyIter(a[0])) s.m.set(dkey(x),x);
    return s;
  });
  def("abs",(a)=>Math.abs(pyNum(a[0],"abs")));
  def("round",(a)=>{
    const v=pyNum(a[0],"round");
    const d=a.length>1?pyIndexNum(a[1]):0;
    const f=Math.pow(10,d);
    const r=Math.round(Math.abs(v)*f)/f*(v<0?-1:1);
    return d<=0?Math.round(r):r;
  });
  def("min",function*(a,kw){
    const items=a.length===1?pyList(a[0]):a;
    if(!items.length) throw pyErr("ValueError","min() arg is an empty sequence");
    const keyf=kw&&kw.key?kw.key:null;
    let best=items[0], bestK=keyf?yield* callPy(keyf,[best],null):best;
    for(const x of items.slice(1)){
      const k=keyf?yield* callPy(keyf,[x],null):x;
      if(pyCmp(k,bestK)<0){ best=x; bestK=k; }
    }
    return best;
  },true);
  def("max",function*(a,kw){
    const items=a.length===1?pyList(a[0]):a;
    if(!items.length) throw pyErr("ValueError","max() arg is an empty sequence");
    const keyf=kw&&kw.key?kw.key:null;
    let best=items[0], bestK=keyf?yield* callPy(keyf,[best],null):best;
    for(const x of items.slice(1)){
      const k=keyf?yield* callPy(keyf,[x],null):x;
      if(pyCmp(k,bestK)>0){ best=x; bestK=k; }
    }
    return best;
  },true);
  def("sum",(a)=>{
    let acc=a.length>1?a[1]:0;
    for(const x of pyIter(a[0])) acc=pyBin("+",acc,x);
    return acc;
  });
  def("sorted",function*(a,kw){ return yield* pySortArray(pyList(a[0]),kw); },true);
  def("reversed",(a)=>pyList(a[0]).reverse());
  def("enumerate",(a)=>{
    let i=a.length>1?pyIndexNum(a[1]):0;
    return pyList(a[0]).map(x=>PyTuple.from([i++,x]));
  });
  def("zip",(a)=>{
    const lists=a.map(pyList);
    const n=lists.length?Math.min(...lists.map(l=>l.length)):0;
    const out=[];
    for(let i=0;i<n;i++) out.push(PyTuple.from(lists.map(l=>l[i])));
    return out;
  });
  def("map",function*(a){
    const f=a[0], out=[];
    const lists=a.slice(1).map(pyList);
    const n=lists.length?Math.min(...lists.map(l=>l.length)):0;
    for(let i=0;i<n;i++) out.push(yield* callPy(f,lists.map(l=>l[i]),null));
    return out;
  },true);
  def("filter",function*(a){
    const f=a[0], out=[];
    for(const x of pyIter(a[1])){
      const keep=f===null?pyTruth(x):pyTruth(yield* callPy(f,[x],null));
      if(keep) out.push(x);
    }
    return out;
  },true);
  def("any",(a)=>{ for(const x of pyIter(a[0])) if(pyTruth(x)) return true; return false; });
  def("all",(a)=>{ for(const x of pyIter(a[0])) if(!pyTruth(x)) return false; return true; });
  def("ord",(a)=>String(a[0]).charCodeAt(0));
  def("chr",(a)=>String.fromCharCode(pyIndexNum(a[0])));
  def("hex",(a)=>{ const v=Math.trunc(pyNum(a[0],"hex")); return (v<0?"-0x":"0x")+Math.abs(v).toString(16); });
  def("bin",(a)=>{ const v=Math.trunc(pyNum(a[0],"bin")); return (v<0?"-0b":"0b")+Math.abs(v).toString(2); });
  def("oct",(a)=>{ const v=Math.trunc(pyNum(a[0],"oct")); return (v<0?"-0o":"0o")+Math.abs(v).toString(8); });
  def("repr",(a)=>pyRepr(a[0]));
  def("divmod",(a)=>PyTuple.from([pyBin("//",a[0],a[1]),pyBin("%",a[0],a[1])]));
  def("pow",(a)=>Math.pow(pyNum(a[0],"pow"),pyNum(a[1],"pow")));
  def("id",(a)=>pyId(a[0]));
  def("callable",(a)=>{ const v=a[0]; return typeof v==="function"||v instanceof PyFunc||v instanceof PyBound||v instanceof PyClass; });
  def("type",(a)=>new PyClass(pyTypeName(a[0]),[],new Map()));
  def("isinstance",(a)=>{
    const v=a[0], t=a[1];
    const check=(tt)=>{
      if(tt&&tt.typeName){
        const nm=tt.typeName;
        if(nm==="int") return typeof v==="number"&&Number.isInteger(v);
        if(nm==="float") return typeof v==="number";
        if(nm==="str") return typeof v==="string";
        if(nm==="bool") return typeof v==="boolean";
        if(nm==="list") return Array.isArray(v)&&!(v instanceof PyTuple);
        if(nm==="tuple") return v instanceof PyTuple;
        if(nm==="dict") return v instanceof PyDict;
        if(nm==="set") return v instanceof PySet;
        return false;
      }
      if(tt instanceof PyClass){
        let c=(v instanceof PyObj)?v.cls:null, guard=0;
        while(c&&guard++<20){ if(c.name===tt.name) return true; c=c.bases&&c.bases[0]; }
        return false;
      }
      return false;
    };
    return (t instanceof PyTuple)?[...t].some(check):check(t);
  });
  def("hasattr",(a)=>{ try{ pyGetAttr(a[0],pyStr(a[1])); return true; }catch(e){ return false; } });
  def("getattr",(a)=>{ try{ return pyGetAttr(a[0],pyStr(a[1])); }catch(e){ if(a.length>2) return a[2]; throw e; } });
  def("setattr",(a)=>{
    const o=a[0];
    if(o instanceof PyObj){ o.d.set(pyStr(a[1]),a[2]); return null; }
    throw pyErr("AttributeError","can't set attribute");
  });
  def("exit",()=>{ throw pyErr("SystemExit",""); });
  B.quit=B.exit;
  PY_EXC_NAMES.forEach(nm=>{
    const f=(a)=>{ const e=new PyExc(nm,a.length?pyStr(a[0]):""); e.line=PY.line; return e; };
    f.pyName=nm; f.excName=nm;
    B[nm]=f;
  });
  B.True=true; B.False=false; B.None=null;
  return B;
}

/* ---------------- modules ---------------- */
function makePyModules(io,stage){
  const M={};
  const mk=(name,d)=>{ M[name]=new PyModule(name,d); };
  const fn=(name,f,isGen)=>{ f.pyName=name; if(isGen) f.gen=true; return f; };

  mk("math",{
    pi:Math.PI, e:Math.E, tau:Math.PI*2, inf:Infinity, nan:NaN,
    sqrt:fn("sqrt",a=>{ const v=pyNum(a[0],"sqrt"); if(v<0) throw pyErr("ValueError","math domain error"); return Math.sqrt(v); }),
    floor:fn("floor",a=>Math.floor(pyNum(a[0],"floor"))),
    ceil:fn("ceil",a=>Math.ceil(pyNum(a[0],"ceil"))),
    trunc:fn("trunc",a=>Math.trunc(pyNum(a[0],"trunc"))),
    fabs:fn("fabs",a=>Math.abs(pyNum(a[0],"fabs"))),
    sin:fn("sin",a=>Math.sin(pyNum(a[0],"sin"))),
    cos:fn("cos",a=>Math.cos(pyNum(a[0],"cos"))),
    tan:fn("tan",a=>Math.tan(pyNum(a[0],"tan"))),
    asin:fn("asin",a=>Math.asin(pyNum(a[0],"asin"))),
    acos:fn("acos",a=>Math.acos(pyNum(a[0],"acos"))),
    atan:fn("atan",a=>Math.atan(pyNum(a[0],"atan"))),
    atan2:fn("atan2",a=>Math.atan2(pyNum(a[0],"atan2"),pyNum(a[1],"atan2"))),
    hypot:fn("hypot",a=>Math.hypot(...a.map(x=>pyNum(x,"hypot")))),
    exp:fn("exp",a=>Math.exp(pyNum(a[0],"exp"))),
    log:fn("log",a=>a.length>1?Math.log(pyNum(a[0],"log"))/Math.log(pyNum(a[1],"log")):Math.log(pyNum(a[0],"log"))),
    log2:fn("log2",a=>Math.log2(pyNum(a[0],"log2"))),
    log10:fn("log10",a=>Math.log10(pyNum(a[0],"log10"))),
    pow:fn("pow",a=>Math.pow(pyNum(a[0],"pow"),pyNum(a[1],"pow"))),
    degrees:fn("degrees",a=>pyNum(a[0],"degrees")*180/Math.PI),
    radians:fn("radians",a=>pyNum(a[0],"radians")*Math.PI/180),
    dist:fn("dist",a=>{ const p=pyList(a[0]),q=pyList(a[1]); let s=0; for(let i=0;i<p.length;i++) s+=Math.pow(p[i]-q[i],2); return Math.sqrt(s); }),
    factorial:fn("factorial",a=>{ let n=Math.trunc(pyNum(a[0],"factorial")), r=1; while(n>1) r*=n--; return r; }),
    isclose:fn("isclose",a=>Math.abs(pyNum(a[0],"isclose")-pyNum(a[1],"isclose"))<1e-9),
  });

  let seedState=null;
  const rnd01=()=>{
    if(seedState===null) return Math.random();
    seedState=(seedState*1103515245+12345)&0x7fffffff;   // deterministic once seeded
    return seedState/0x7fffffff;
  };
  mk("random",{
    random:fn("random",()=>rnd01()),
    seed:fn("seed",a=>{ seedState=a.length&&a[0]!==null?Math.abs(Math.trunc(pyNum(a[0],"seed")))||1:null; return null; }),
    randint:fn("randint",a=>{
      const lo=Math.trunc(pyNum(a[0],"randint")), hi=Math.trunc(pyNum(a[1],"randint"));
      if(hi<lo) throw pyErr("ValueError","empty range for randint()");
      return lo+Math.floor(rnd01()*(hi-lo+1));
    }),
    randrange:fn("randrange",a=>{
      let lo=0,hi,step=1;
      if(a.length===1) hi=Math.trunc(pyNum(a[0],"randrange"));
      else { lo=Math.trunc(pyNum(a[0],"randrange")); hi=Math.trunc(pyNum(a[1],"randrange")); if(a.length>2) step=Math.trunc(pyNum(a[2],"randrange")); }
      const n=Math.max(1,Math.ceil((hi-lo)/step));
      return lo+step*Math.floor(rnd01()*n);
    }),
    uniform:fn("uniform",a=>{ const lo=pyNum(a[0],"uniform"), hi=pyNum(a[1],"uniform"); return lo+rnd01()*(hi-lo); }),
    choice:fn("choice",a=>{
      const l=pyList(a[0]);
      if(!l.length) throw pyErr("IndexError","Cannot choose from an empty sequence");
      return l[Math.floor(rnd01()*l.length)];
    }),
    shuffle:fn("shuffle",a=>{
      const l=a[0];
      if(!Array.isArray(l)) throw pyErr("TypeError","shuffle() expects a list");
      for(let i=l.length-1;i>0;i--){ const j=Math.floor(rnd01()*(i+1)); const t=l[i]; l[i]=l[j]; l[j]=t; }
      return null;
    }),
    sample:fn("sample",a=>{
      const l=pyList(a[0]).slice(), k=pyIndexNum(a[1]), out=[];
      for(let i=0;i<k&&l.length;i++) out.push(l.splice(Math.floor(rnd01()*l.length),1)[0]);
      return out;
    }),
    gauss:fn("gauss",a=>{
      const mu=a.length?pyNum(a[0],"gauss"):0, sg=a.length>1?pyNum(a[1],"gauss"):1;
      const u=Math.max(1e-9,rnd01()), v=rnd01();
      return mu+sg*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
    }),
  });

  const t0=Date.now();
  mk("time",{
    time:fn("time",()=>Date.now()/1000),
    monotonic:fn("monotonic",()=>(Date.now()-t0)/1000),
    sleep:fn("sleep",function*(a){
      const s=a.length?pyNum(a[0],"sleep"):0;
      yield {sleep:Math.min(30000,Math.max(0,s*1000))};
      return null;
    },true),
  });

  mk("sys",{
    version:"3.x (WinClone mini-Python)",
    platform:"winclone",
    argv:[io.scriptName||"script.py"],
    exit:fn("exit",()=>{ throw pyErr("SystemExit",""); }),
    stdout:new PyModule("stdout",{write:fn("write",a=>{ io.write(pyStr(a[0])); return null; }),flush:fn("flush",()=>null)}),
  });

  if(stage) mk("wcgame",makeWcgameModule(stage,fn));
  mk("winclone",makeWincloneModule(io,fn));
  return M;
}

/* ---------------- the driver ---------------- */
function pyRunSource(src, io, stage){
  const runner={stopped:false, stop(){ this.stopped=true; try{ if(g&&g.return) g.return(); }catch(e){} }};
  let mod;
  try{ mod=pyParse(src); }
  catch(e){ io.error(pyFormatError(e)); io.done(false); return runner; }

  const root=new PyEnv(null);
  const B=makePyBuiltins(io);
  Object.keys(B).forEach(k=>root.setLocal(k,B[k]));
  root.modules=makePyModules(io,stage);
  root.io=io;                                  // so `import mymodule` can find .py files
  const genv=new PyEnv(root);
  genv.setLocal("__name__","__main__");

  const g=execBlock(mod.body,genv);
  function pump(send){
    if(runner.stopped||!io.alive()) return;
    PY.fuel=PY_FUEL; PY.depth=0;
    let r;
    try{ r=g.next(send); }
    catch(e){
      if(e instanceof PyExc && e.type==="SystemExit"){ io.done(true); return; }
      io.error(pyFormatError(e));
      io.done(false);
      return;
    }
    if(r.done){ io.done(true); return; }
    const y=r.value||{};
    if(y.frame) requestAnimationFrame(()=>pump());
    else if(y.sleep!=null) setTimeout(()=>pump(),Math.max(0,y.sleep));
    // resume off a fresh task: an io.readLine that answers immediately must not
    // recurse pump() into itself until the stack blows
    else if(y.input!=null) io.readLine(y.input,v=>setTimeout(()=>pump(v),0));
    else setTimeout(()=>pump(),0);
  }
  pump();
  return runner;
}
function pyFormatError(e){
  if(e instanceof PyExc){
    const where=e.line?"  line "+e.line+"\n":"";
    return "Traceback (most recent call last):\n"+where+e.type+(e.msg?": "+e.msg:"");
  }
  if(e instanceof RangeError) return "RecursionError: maximum recursion depth exceeded";
  return "InternalError: "+((e&&e.message)||String(e));
}

/* ---------------- import ----------------
   Built-in modules first, then a real .py file from the virtual filesystem:
   one sitting next to the running script, or in Documents\Python, which acts
   as WinClone's site-packages. Imported modules are cached like sys.modules. */
function pyFindModuleSource(base,io){
  const at=(path)=>{
    if(!path||!path.length) return null;
    const n=nodeAt(path);
    const f=n&&n.children&&n.children[base+".py"];
    if(!f||f.folder||f.content==null) return null;
    if(f.web) throw pyErr("ImportError","'"+base+".py' came from the internet — WinClone won't run it");
    return String(f.content);
  };
  const dirs=[];
  if(io&&io.cwd&&io.cwd.length) dirs.push(io.cwd);
  dirs.push([...HOME_PATH,"Documents","Python"]);
  for(const d of dirs){ const s=at(d); if(s!=null) return s; }
  return null;
}
function* pyImportG(name,env){
  const root=envRoot(env);
  const mods=root.modules||{};
  const base=name.split(".")[0];
  if(mods[base]) return mods[base];
  const src=pyFindModuleSource(base,root.io);
  if(src==null)
    throw pyErr("ImportError","no module named '"+base+"'. WinClone ships math, random, time, sys, "+
      "wcgame and winclone — anything else has to be a "+base+".py next to your script or in Documents\\Python");
  if(root.loading&&root.loading.has(base)) throw pyErr("ImportError","circular import of '"+base+"'");
  let ast;
  try{ ast=pyParse(src); }
  catch(e){ throw pyErr("ImportError","couldn't import '"+base+".py': "+(e&&e.msg?e.msg:"syntax error")+(e&&e.line?" (line "+e.line+")":"")); }
  const menv=new PyEnv(root);
  menv.setLocal("__name__",base);
  (root.loading=root.loading||new Set()).add(base);
  try{ yield* execBlock(ast.body,menv); }
  finally{ root.loading.delete(base); }
  const d={};
  for(const [k,v] of menv.v) d[k]=v;
  const mod=new PyModule(base,d);
  mods[base]=mod;
  return mod;
}

/* ============================ PYTHON: STAGE, MODULES, APPS ============================ */

/* A "stage" is a running script's window: a console, an optional canvas, and
   the keyboard/mouse state that wcgame reads. */
function makePyStage(host, opts){
  opts=opts||{};
  const wrap=el("div","py-stage");
  wrap.innerHTML=`<div class="py-canvaswrap"><canvas class="py-canvas"></canvas></div>
    <div class="py-con"></div>
    <div class="py-inrow"><span class="py-prompt"></span><input class="py-in" spellcheck="false" autocomplete="off"></div>`;
  host.appendChild(wrap);
  const cwrap=wrap.querySelector(".py-canvaswrap");
  const cv=wrap.querySelector(".py-canvas");
  const con=wrap.querySelector(".py-con");
  const inrow=wrap.querySelector(".py-inrow");
  const inp=wrap.querySelector(".py-in");
  const promptEl=wrap.querySelector(".py-prompt");

  const S={
    w:0, h:0, ctx:null, canvas:cv,
    held:new Set(), pressed:new Set(),
    mx:0, my:0, mdown:false, clicked:false,
    quitted:false, appId:opts.appId,
  };
  S.alive=()=>!S.quitted && document.body.contains(con) && !!state.wins[S.appId];
  S.quit=()=>{ S.quitted=true; };
  S.setTitle=opts.setTitle||function(){};

  S.initCanvas=(w,h)=>{
    w=Math.max(16,Math.min(1024,Math.round(w||320)));
    h=Math.max(16,Math.min(768,Math.round(h||240)));
    cv.width=w; cv.height=h; S.w=w; S.h=h;
    S.ctx=cv.getContext("2d");
    S.ctx.imageSmoothingEnabled=false;
    S.ctx.fillStyle="#000"; S.ctx.fillRect(0,0,w,h);
    cwrap.style.display="flex";
    wrap.classList.add("has-canvas");
  };
  S.beginFrame=()=>{ S.pressed.clear(); S.clicked=false; };
  S.endFrame=()=>{};

  /* ---- console ---- */
  S.write=(t)=>{ con.appendChild(document.createTextNode(String(t))); con.scrollTop=con.scrollHeight; };
  S.error=(t)=>{
    const s=el("span","py-err"); s.textContent=String(t)+"\n";
    con.appendChild(s); con.scrollTop=con.scrollHeight;
    try{ sfx("error"); }catch(e){}
  };
  S.clear=()=>{ con.innerHTML=""; };
  S.readLine=(prompt,cb)=>{
    promptEl.textContent=prompt||"";
    inrow.style.display="flex";
    inp.value="";
    setTimeout(()=>{ try{ inp.focus(); }catch(e){} },10);
    const go=(e)=>{
      if(e.key!=="Enter") return;
      e.preventDefault();
      const v=inp.value;
      inp.removeEventListener("keydown",go);
      inrow.style.display="none";
      S.write((prompt||"")+v+"\n");
      cb(v);
    };
    inp.addEventListener("keydown",go);
  };

  /* ---- input ---- */
  const keyName=(e)=>{
    const k=e.key;
    if(k===" ") return "space";
    if(k==="ArrowLeft") return "left";
    if(k==="ArrowRight") return "right";
    if(k==="ArrowUp") return "up";
    if(k==="ArrowDown") return "down";
    if(k==="Escape") return "esc";
    if(k==="Enter") return "enter";
    if(k==="Backspace") return "backspace";
    if(k==="Tab") return "tab";
    if(k==="Shift") return "shift";
    if(k==="Control") return "ctrl";
    if(k==="Alt") return "alt";
    return String(k).toLowerCase();
  };
  const detach=()=>{
    document.removeEventListener("keydown",kd,true);
    document.removeEventListener("keyup",ku,true);
    removeEventListener("blur",clr);
  };
  const kd=(e)=>{
    if(!S.alive()){ detach(); return; }
    if(state.focused!==S.appId) return;
    if(document.activeElement===inp) return;             // typing an answer to input()
    const n=keyName(e);
    if(!S.held.has(n)) S.pressed.add(n);
    S.held.add(n);
    if(["space","left","right","up","down","tab"].indexOf(n)>=0) e.preventDefault();
  };
  const ku=(e)=>{ if(!S.alive()){ detach(); return; } S.held.delete(keyName(e)); };
  const clr=()=>S.held.clear();
  document.addEventListener("keydown",kd,true);
  document.addEventListener("keyup",ku,true);
  addEventListener("blur",clr);

  cv.addEventListener("mousemove",e=>{
    const r=cv.getBoundingClientRect();
    if(!r.width||!r.height) return;
    S.mx=Math.floor((e.clientX-r.left)*cv.width/r.width);
    S.my=Math.floor((e.clientY-r.top)*cv.height/r.height);
  });
  cv.addEventListener("mousedown",()=>{ S.mdown=true; S.clicked=true; });
  addEventListener("mouseup",()=>{ S.mdown=false; });

  S.beep=(f,d)=>{
    try{
      AC=AC||new (window.AudioContext||window.webkitAudioContext)();
      if(AC.state==="suspended") AC.resume();
      const t=AC.currentTime, dur=Math.max(.01,Math.min(2,d||.08));
      const o=AC.createOscillator(), g=AC.createGain();
      o.type="square";
      o.frequency.value=Math.max(40,Math.min(4000,f||440));
      const vol=Math.max(0,Math.min(100,(typeof masterVol==="number"?masterVol:65)))/100*.05;
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vol,t+.008);
      g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t+dur+.05);
    }catch(e){}
  };
  return S;
}

/* ---- the wcgame module: WinClone's tiny graphics library ---- */
function makeWcgameModule(stage,fn){
  const need=()=>{ if(!stage.ctx) stage.initCanvas(320,240); return stage.ctx; };
  const C=(v,d)=>v==null?(d||"#ffffff"):pyStr(v);
  const N=(v,d)=>v==null?(d||0):pyNum(v,"wcgame");
  const outline=(kw)=>kw&&kw.fill!==undefined&&!pyTruth(kw.fill);
  const d={};
  d.init=fn("init",(a)=>{
    stage.initCanvas(a[0]!=null?N(a[0]):320, a[1]!=null?N(a[1]):240);
    if(a[2]!=null) stage.setTitle(pyStr(a[2]));
    return null;
  });
  d.width =fn("width", ()=>stage.w||320);
  d.height=fn("height",()=>stage.h||240);
  d.fill=fn("fill",(a)=>{ const c=need(); c.fillStyle=C(a[0],"#000000"); c.fillRect(0,0,stage.w,stage.h); return null; });
  d.rect=fn("rect",(a,kw)=>{
    const c=need(), x=N(a[0]), y=N(a[1]), w=N(a[2]), h=N(a[3]), col=C(a[4]);
    if(outline(kw)){ c.strokeStyle=col; c.lineWidth=kw.width!=null?N(kw.width):1; c.strokeRect(x+.5,y+.5,w-1,h-1); }
    else { c.fillStyle=col; c.fillRect(x,y,w,h); }
    return null;
  });
  d.circle=fn("circle",(a,kw)=>{
    const c=need(), x=N(a[0]), y=N(a[1]), r=Math.abs(N(a[2])), col=C(a[3]);
    c.beginPath(); c.arc(x,y,r,0,Math.PI*2);
    if(outline(kw)){ c.strokeStyle=col; c.lineWidth=kw.width!=null?N(kw.width):1; c.stroke(); }
    else { c.fillStyle=col; c.fill(); }
    return null;
  });
  d.line=fn("line",(a,kw)=>{
    const c=need();
    c.strokeStyle=C(a[4]);
    c.lineWidth=(kw&&kw.width!=null)?N(kw.width):(a[5]!=null?N(a[5]):1);
    c.beginPath(); c.moveTo(N(a[0]),N(a[1])); c.lineTo(N(a[2]),N(a[3])); c.stroke();
    return null;
  });
  d.poly=fn("poly",(a,kw)=>{
    const c=need(), pts=pyList(a[0]).map(p=>pyList(p));
    if(!pts.length) return null;
    c.beginPath();
    c.moveTo(pyNum(pts[0][0],"poly"),pyNum(pts[0][1],"poly"));
    for(let i=1;i<pts.length;i++) c.lineTo(pyNum(pts[i][0],"poly"),pyNum(pts[i][1],"poly"));
    c.closePath();
    const col=C(a[1]);
    if(outline(kw)){ c.strokeStyle=col; c.lineWidth=kw.width!=null?N(kw.width):1; c.stroke(); }
    else { c.fillStyle=col; c.fill(); }
    return null;
  });
  d.text=fn("text",(a,kw)=>{
    const c=need();
    const s=pyStr(a[0]), x=N(a[1]), y=N(a[2]), col=C(a[3]);
    const size=(kw&&kw.size!=null)?N(kw.size):(a[4]!=null?N(a[4]):12);
    c.fillStyle=col;
    c.font=Math.max(5,size)+"px Consolas,'Courier New',monospace";
    c.textBaseline="top";
    c.textAlign=(kw&&kw.align)?pyStr(kw.align):"left";
    c.fillText(s,x,y);
    c.textAlign="left";
    return null;
  });
  d.flip=fn("flip",function*(){ stage.endFrame(); yield {frame:1}; stage.beginFrame(); return null; },true);
  d.wait=fn("wait",function*(a){
    yield {sleep:Math.min(30000,Math.max(0,(a[0]!=null?N(a[0]):0)*1000))};
    return null;
  },true);
  d.running=fn("running",()=>stage.alive());
  d.key    =fn("key",    (a)=>stage.held.has(pyStr(a[0]).toLowerCase()));
  d.pressed=fn("pressed",(a)=>stage.pressed.has(pyStr(a[0]).toLowerCase()));
  d.keys   =fn("keys",   ()=>[...stage.held]);
  d.mouse  =fn("mouse",  ()=>PyTuple.from([stage.mx,stage.my]));
  d.mouse_down=fn("mouse_down",()=>stage.mdown);
  d.click  =fn("click",  ()=>stage.clicked);
  d.beep   =fn("beep",   (a)=>{ stage.beep(a[0]!=null?N(a[0]):440, a[1]!=null?N(a[1]):.08); return null; });
  d.quit   =fn("quit",   ()=>{ stage.quit(); return null; });
  return d;
}

/* ---- the winclone module: talk to the OS the script is running inside ---- */
function makeWincloneModule(io,fn){
  const home=()=>io.cwd&&io.cwd.length?io.cwd:[...HOME_PATH,"Documents"];
  const resolve=(s)=>batResolve(home(),String(s));
  const guard=(segs)=>{
    if(segs.length<2) throw pyErr("ValueError","that path is not a file");
    if(segs[0]==="C:"&&segs[1]==="Windows") throw pyErr("PermissionError","WinClone won't let a script write into C:\\Windows");
  };
  const d={};
  d.notify=fn("notify",(a)=>{
    notify({icon:"🐍",title:a.length?pyStr(a[0]):"Python",body:a.length>1?pyStr(a[1]):""});
    return null;
  });
  d.user   =fn("user",   ()=>getUser());
  d.set_user_name=fn("set_user_name",(a)=>{
    const want=a.length?pyStr(a[0]).trim():"";
    if(want.length>24) throw pyErr("ValueError","that name is too long — 24 characters max");
    setUser(want);                          // "" resets to the default, "User"
    return getUser();                       // updates the Start menu, lock screen and avatar
  });
  d.version=fn("version",()=>WC_VERSION);
  d.cwd    =fn("cwd",    ()=>"C:\\"+home().slice(1).join("\\"));
  /* Works like `start` on the real thing: an app id opens the app, anything
     else is looked up in the filesystem and opened with whatever handles it —
     images to Photos, .html to the viewer, .py to Python, folders to Explorer. */
  d.open_app=fn("open_app",(a)=>{
    const raw=pyStr(a[0]);
    const id=raw.toLowerCase();
    if(APPS[id]){ openApp(id); return id; }
    const segs=resolve(raw);
    const name=segs[segs.length-1];
    const parent=nodeAt(segs.slice(0,-1));
    const item=parent&&parent.children&&parent.children[name];
    if(!item)
      throw pyErr("FileNotFoundError","nothing called '"+raw+"' — not an app, and no such file. "+
        "winclone.apps() lists the apps, winclone.ls() lists the folder");
    if(item.folder){ openExplorerAt(segs); return name; }
    fsOpen(segs.slice(0,-1),name,item);
    return name;
  });
  d.open=d.open_app;
  d.del_file=fn("del_file",(a,kw)=>{
    const segs=resolve(pyStr(a[0]));
    const name=segs[segs.length-1];
    const parent=nodeAt(segs.slice(0,-1));
    const item=parent&&parent.children&&parent.children[name];
    if(!item){
      /* a typo'd delete quietly doing nothing is worse than being told, so this
         still raises — unless you say you don't mind, like Path.unlink does */
      if(flagged(a,kw,"missing_ok",2)) return null;
      throw pyErr("FileNotFoundError","no file called '"+pyStr(a[0])+"'. "+
        "Pass missing_ok=True if you don't mind it being gone already");
    }
    if(flagged(a,kw,"permanent",1)){        // skips the bin, so it actually frees storage
      delete parent.children[name];
      saveFS(); refreshFX();
      try{ applySystemHealth(); }catch(e){}
    }else{
      deleteAt(segs.slice(0,-1),name);      // to the Recycle Bin, exactly like Explorer
    }
    return name;
  });
  d.apps=fn("apps",()=>Object.keys(APPS).filter(k=>!APPS[k].hidden));
  d.ls=fn("ls",(a)=>{
    const segs=a.length?resolve(pyStr(a[0])):home();
    const n=nodeAt(segs);
    if(!n||!n.children) throw pyErr("FileNotFoundError","no folder at "+segs.join("\\"));
    return Object.keys(n.children);
  });
  d.read=fn("read",(a)=>{
    const segs=resolve(pyStr(a[0]));
    const parent=nodeAt(segs.slice(0,-1));
    const f=parent&&parent.children&&parent.children[segs[segs.length-1]];
    if(!f||f.folder) throw pyErr("FileNotFoundError","no file called "+pyStr(a[0]));
    if(f.locked) throw pyErr("PermissionError","that file is encrypted by ransomware — run Cork Defender");
    return String(f.content==null?"":f.content);
  });
  /* write() refuses to clobber by default. A script quietly replacing a file
     the user cares about is a nastier surprise than an error message, so
     replacing has to be asked for: winclone.write(name, text, overwrite=True).
     append() and exists() cover the rest. */
  const target=(p)=>{
    const segs=resolve(pyStr(p));
    guard(segs);
    const parent=nodeAt(segs.slice(0,-1));
    if(!parent||!parent.children) throw pyErr("FileNotFoundError","there's no folder at "+segs.slice(0,-1).join("\\"));
    const name=segs[segs.length-1];
    if(!name) throw pyErr("ValueError","that path doesn't name a file");
    return {parent,name};
  };
  const writable=(t)=>{
    const ex=t.parent.children[t.name];
    if(ex&&ex.folder) throw pyErr("IsADirectoryError","'"+t.name+"' is a folder, not a file");
    if(ex&&ex.locked) throw pyErr("PermissionError","'"+t.name+"' is encrypted by ransomware — run Cork Defender");
    if(ex&&ex.sys) throw pyErr("PermissionError","'"+t.name+"' is a system file");
    return ex;
  };
  d.exists=fn("exists",(a)=>{
    try{ const t=target(a[0]); return !!t.parent.children[t.name]; }catch(e){ return false; }
  });
  /* accept the flag either way — write(name, text, True) is the obvious guess,
     and silently ignoring it would be a maddening thing to debug */
  const flagged=(a,kw,name,pos)=>(kw&&pyTruth(kw[name])) || (a.length>pos&&pyTruth(a[pos]));
  /* A name that's already taken doesn't destroy anything and doesn't blow up —
     it makes another file, the way Explorer does when you paste twice. Pass
     overwrite=True when you really do mean "replace that one". Either way you
     get back the name it actually wrote. */
  d.write=fn("write",(a,kw)=>{
    const t=target(a[0]);
    const ex=t.parent.children[t.name];
    if(ex && !flagged(a,kw,"overwrite",2)){
      const name=uniqueName(t.parent,t.name);
      t.parent.children[name]={icon:glyphFor(name,null),content:pyStr(a[1])};
      saveFS(); refreshFX();
      return name;
    }
    writable(t);                      // replacing for real: folders, locked and system files still say no
    t.parent.children[t.name]=Object.assign(ex||{icon:glyphFor(t.name,null)},{content:pyStr(a[1])});
    saveFS(); refreshFX();
    return t.name;
  });
  /* always creates something, never replaces: on a clash it renames the way the
     rest of WinClone does — notes.txt becomes "notes (2).txt". Returns the name
     it actually used. */
  d.new_file=fn("new_file",(a)=>{
    const t=target(a[0]);
    const name=uniqueName(t.parent,t.name);
    t.parent.children[name]={icon:glyphFor(name,null),content:a.length>1?pyStr(a[1]):""};
    saveFS(); refreshFX();
    return name;
  });
  d.append=fn("append",(a)=>{
    const t=target(a[0]);
    const ex=writable(t);
    const before=(ex&&ex.content!=null)?String(ex.content):"";
    t.parent.children[t.name]=Object.assign(ex||{icon:glyphFor(t.name,null)},{content:before+pyStr(a[1])});
    saveFS(); refreshFX();
    return t.name;
  });
  d.beep=fn("beep",(a)=>{ try{ sfx(a.length&&pyStr(a[0])==="error"?"error":"notify"); }catch(e){} return null; });
  /* screen effects — these escape the window and take over the whole display */
  d.effects=fn("effects",()=>SFX_LIST.map(e=>e.id));
  d.effect=fn("effect",(a,kw)=>{
    const id=pyStr(a[0]).toLowerCase().trim();
    if(id==="off"||id==="none"||id==="all"){
      if(id==="all") sfxAll(); else sfxStopAll();
      return id;
    }
    if(!SFX_BY_ID[id])
      throw pyErr("ValueError","no screen effect called '"+id+"' — winclone.effects() lists them all");
    const on=(kw&&"on" in kw) ? pyTruth(kw.on) : (a.length>1 ? pyTruth(a[1]) : true);
    sfxSet(id,on);
    return id;
  });
  d.stop_effects=fn("stop_effects",()=>{ sfxStopAll(); return null; });
  return d;
}

/* ---- example programs (also written into Documents\Python on first run) ---- */
function pySampleFiles(){
  const o={};
  Object.keys(PY_SAMPLES).forEach(k=>{ o[k]={icon:"🐍",content:PY_SAMPLES[k]}; });
  return o;
}
const PY_SAMPLES={
"hello.py":
`# Welcome to Python, running inside WinClone.
# Hit  Run  (or F5) to run this file.

print("Hello from Python, inside a browser tab.")

name = "WinClone"
version = 1.2
print(f"{name} v{version} says hi")

def triangle(n):
    for row in range(1, n + 1):
        print("*" * row)

triangle(5)

numbers = [4, 8, 15, 16, 23, 42]
print("numbers:", numbers)
print("sum:", sum(numbers), "biggest:", max(numbers))

evens = [n for n in numbers if n % 2 == 0]
print("evens:", evens)

people = {"ada": 36, "alan": 41}
for who, age in people.items():
    print(who, "is", age)

import winclone
print("signed in as:", winclone.user())
winclone.notify("Python", "hello.py finished running")
`,

"guess.py":
`# A guessing game - proves input() really works.
import random

secret = random.randint(1, 50)
tries = 0

print("I'm thinking of a number between 1 and 50.")

while True:
    answer = input("Your guess: ")
    if not answer.isdigit():
        print("Numbers only, please.")
        continue

    guess = int(answer)
    tries = tries + 1

    if guess < secret:
        print("Too low.")
    elif guess > secret:
        print("Too high.")
    else:
        print(f"Got it! {secret} in {tries} tries.")
        break
`,

"pong.py":
`# Bat and ball, drawn with wcgame.
# Left / Right arrows to move.
import wcgame as g
import random

g.init(320, 240)

paddle = 130
ball_x = 160
ball_y = 60
vx = 2
vy = 2
score = 0
lives = 3

while g.running():
    g.fill("#0b1020")

    if g.key("left"):
        paddle = paddle - 5
    if g.key("right"):
        paddle = paddle + 5
    if paddle < 0:
        paddle = 0
    if paddle > 260:
        paddle = 260

    ball_x = ball_x + vx
    ball_y = ball_y + vy

    if ball_x < 4 or ball_x > 316:
        vx = -vx
        g.beep(600, 0.03)
    if ball_y < 4:
        vy = -vy
        g.beep(600, 0.03)

    hit_row = ball_y > 214 and ball_y < 226
    on_paddle = ball_x > paddle and ball_x < paddle + 60
    if hit_row and on_paddle and vy > 0:
        vy = -vy
        score = score + 1
        g.beep(900, 0.04)

    if ball_y > 244:
        lives = lives - 1
        ball_x = 160
        ball_y = 60
        vx = random.choice([-2, 2])
        vy = 2
        g.beep(180, 0.18)
        if lives <= 0:
            break

    g.rect(paddle, 222, 60, 6, "#4cc2ff")
    g.circle(ball_x, ball_y, 4, "#ffd166")
    g.text("score " + str(score), 6, 6, "#9fb3c8", 11)
    g.text("lives " + str(lives), 250, 6, "#9fb3c8", 11)
    g.flip()

g.fill("#0b1020")
g.text("GAME OVER", 88, 96, "#ff6b6b", 22)
g.text("score: " + str(score), 118, 130, "#e6e6e6", 12)
g.flip()
print("Final score:", score)
`,

"snake.py":
`# Snake, written in Python, running in WinClone.
# Arrow keys to steer.
import wcgame as g
import random

CELL = 10
COLS = 32
ROWS = 20
TOP = 20

g.init(COLS * CELL, ROWS * CELL + TOP)

snake = [(8, 10), (7, 10), (6, 10)]
dx = 1
dy = 0
food = (20, 10)
score = 0
alive = True
tick = 0

def new_food():
    while True:
        spot = (random.randint(0, COLS - 1), random.randint(0, ROWS - 1))
        if spot not in snake:
            return spot

while g.running() and alive:
    if g.key("left") and dx == 0:
        dx = -1
        dy = 0
    if g.key("right") and dx == 0:
        dx = 1
        dy = 0
    if g.key("up") and dy == 0:
        dx = 0
        dy = -1
    if g.key("down") and dy == 0:
        dx = 0
        dy = 1

    tick = tick + 1
    if tick % 6 == 0:
        head = ((snake[0][0] + dx) % COLS, (snake[0][1] + dy) % ROWS)
        if head in snake:
            alive = False
        else:
            snake.insert(0, head)
            if head == food:
                score = score + 1
                food = new_food()
                g.beep(880, 0.04)
            else:
                snake.pop()

    g.fill("#0a0f18")
    g.rect(0, 0, COLS * CELL, TOP, "#141b26")
    g.text("score " + str(score), 5, 5, "#7fa8d0", 11)
    g.rect(food[0] * CELL, food[1] * CELL + TOP, CELL - 1, CELL - 1, "#e0491c")

    for i in range(len(snake)):
        part = snake[i]
        shade = "#4cc2ff" if i == 0 else "#2f8fd0"
        g.rect(part[0] * CELL, part[1] * CELL + TOP, CELL - 1, CELL - 1, shade)

    g.flip()

g.text("GAME OVER", 92, 96, "#ff6b6b", 20)
g.flip()
print("Snake finished. Score:", score)
`,

"stars.py":
`# A starfield. Click the canvas to throw in more stars.
import wcgame as g
import random

W = 320
H = 240
g.init(W, H)

stars = []
for i in range(90):
    stars.append([random.randint(0, W), random.randint(0, H), random.uniform(0.4, 2.6)])

while g.running():
    g.fill("#04060d")

    for s in stars:
        s[0] = s[0] - s[2]
        if s[0] < 0:
            s[0] = W
            s[1] = random.randint(0, H)
        shade = int(110 + s[2] * 50)
        colour = "rgb(" + str(shade) + "," + str(shade) + "," + str(min(255, shade + 45)) + ")"
        size = 1 if s[2] < 1.5 else 2
        g.rect(int(s[0]), int(s[1]), size, size, colour)

    if g.click():
        for i in range(12):
            stars.append([W, random.randint(0, H), random.uniform(0.4, 2.6)])
        g.beep(1200, 0.03)

    g.text("stars: " + str(len(stars)), 6, 6, "#40567a", 10)
    g.text("click for more", 6, H - 16, "#40567a", 10)
    g.flip()
`,
};

/* ---- shared: run a source string into a host element ---- */
function pyLaunch(host, source, o){
  o=o||{};
  host.innerHTML="";
  const stage=makePyStage(host,{appId:o.appId, setTitle:o.setTitle});
  const io={
    write:stage.write,
    error:stage.error,
    alive:stage.alive,
    readLine:stage.readLine,
    cwd:o.cwd||[...HOME_PATH,"Documents"],
    scriptName:o.scriptName||"untitled.py",
    done:(ok)=>{ stage.quit(); if(o.onDone) o.onDone(ok); },
  };
  const runner=pyRunSource(source, io, stage);
  return {runner, stage};
}

/* ============================ PYTHON IDE ============================ */
let PY_PENDING=null;
const PYIDE={loader:null};
function openPythonWith(pn){
  if(state.wins.python && PYIDE.loader){
    if(state.wins.python.min) toggleMin("python",false);
    focusWin("python"); PYIDE.loader(pn);
  } else { PY_PENDING=pn; openApp("python"); }
}
function buildPython(body,win){
  body.innerHTML=`<div class="pyide">
    <div class="py-bar">
      <button class="py-btn" data-a="new">New</button>
      <button class="py-btn" data-a="open">Open…</button>
      <button class="py-btn" data-a="import" title="Bring a .py file in from your real computer">Import…</button>
      <button class="py-btn" data-a="save">Save</button>
      <span class="py-sep"></span>
      <button class="py-btn go" data-a="run">▶ Run</button>
      <button class="py-btn stop" data-a="stop">■ Stop</button>
      <span class="py-sep"></span>
      <button class="py-btn" data-a="samples">Examples ▾</button>
      <button class="py-btn" data-a="help">Help</button>
      <span class="py-status"></span>
    </div>
    <div class="py-editwrap">
      <div class="py-gutter"></div>
      <textarea class="py-code" spellcheck="false" wrap="off" placeholder="# type Python here…"></textarea>
    </div>
    <div class="py-split" title="Drag to resize"></div>
    <div class="py-out"></div>
  </div>`;
  const ta=body.querySelector(".py-code");
  const gutter=body.querySelector(".py-gutter");
  const out=body.querySelector(".py-out");
  const status=body.querySelector(".py-status");
  const btnStop=body.querySelector('[data-a="stop"]');
  const editwrap=body.querySelector(".py-editwrap");
  let cur=null, live=null;

  const setTitle=()=>{ const t=win.querySelector(".tt"); if(t) t.textContent=(cur?cur.name:"Untitled")+" — Python"; };
  const setStatus=(t,cls)=>{ status.textContent=t||""; status.className="py-status"+(cls?" "+cls:""); };
  const reflect=()=>{ btnStop.disabled=!live; };

  function renderGutter(){
    const n=ta.value.split("\n").length;
    let s="";
    for(let i=1;i<=n;i++) s+=i+"\n";
    gutter.textContent=s;
    gutter.scrollTop=ta.scrollTop;
  }
  ta.addEventListener("input",renderGutter);
  ta.addEventListener("scroll",()=>{ gutter.scrollTop=ta.scrollTop; });
  ta.addEventListener("keydown",e=>{
    if(e.key==="Tab"){
      e.preventDefault();
      const s=ta.selectionStart, en=ta.selectionEnd;
      ta.value=ta.value.slice(0,s)+"    "+ta.value.slice(en);
      ta.selectionStart=ta.selectionEnd=s+4;
      renderGutter();
      return;
    }
    if(e.key==="Enter"){                       // keep the current indent, and add one after ":"
      const s=ta.selectionStart;
      const lineStart=ta.value.lastIndexOf("\n",s-1)+1;
      const line=ta.value.slice(lineStart,s);
      const indent=(/^[ \t]*/.exec(line)||[""])[0];
      const extra=/:\s*$/.test(line)?"    ":"";
      if(indent||extra){
        e.preventDefault();
        const ins="\n"+indent+extra;
        ta.value=ta.value.slice(0,s)+ins+ta.value.slice(ta.selectionEnd);
        ta.selectionStart=ta.selectionEnd=s+ins.length;
        renderGutter();
      }
      return;
    }
    if(e.key==="F5"){ e.preventDefault(); run(); }
  });

  function load(pn){
    const parent=nodeAt(pn.path), f=parent&&parent.children&&parent.children[pn.name];
    if(!f){ winDialog({icon:"❌",title:"Python",msg:"That file couldn't be found."}); return; }
    ta.value=String(f.content==null?"":f.content);
    cur={path:[...pn.path],name:pn.name};
    setTitle(); renderGutter(); setStatus("");
  }
  PYIDE.loader=load;

  function doSave(path,name){
    if(!/\.py$/i.test(name)) name+=".py";
    const parent=nodeAt(path);
    if(!parent||!parent.children) return;
    const ex=parent.children[name];
    if(ex&&ex.folder){ winDialog({icon:"❌",title:"Python",msg:"A folder with that name already exists."}); return; }
    parent.children[name]=Object.assign(ex||{icon:"🐍"},{content:ta.value});
    cur={path:[...path],name};
    setTitle(); saveFS(); refreshFX();
    setStatus("saved","ok");
    setTimeout(()=>{ if(status.textContent==="saved") setStatus(""); },1500);
  }

  /* pull real .py files off the user's computer into the virtual filesystem */
  function importPy(){
    const inp=document.createElement("input");
    inp.type="file"; inp.multiple=true;
    inp.accept=".py,.pyw,.txt,text/x-python,text/plain";
    inp.onchange=async()=>{
      const files=[...(inp.files||[])];
      if(!files.length) return;
      let destPath=cur?[...cur.path]:[...HOME_PATH,"Documents","Python"];
      let dest=nodeAt(destPath);
      if(!dest||!dest.children){                       // the Python folder may not exist yet
        const docs=nodeAt([...HOME_PATH,"Documents"]);
        if(!docs||!docs.children){ winDialog({icon:"⚠️",title:"Import",msg:"Couldn't find a folder to import into."}); return; }
        if(!docs.children["Python"]) docs.children["Python"]={folder:true,children:{}};
        destPath=[...HOME_PATH,"Documents","Python"];
        dest=docs.children["Python"];
      }
      let added=0, failed=0, last=null;
      for(const f of files){
        try{
          let nm=(f.name||"script.py").replace(/[\\/:*?"<>|]/g,"_");
          if(!/\.pyw?$/i.test(nm)) nm=nm.replace(/\.[^.]*$/,"")+".py";
          nm=uniqueName(dest,nm);
          dest.children[nm]={icon:"🐍",content:await f.text()};
          last=nm; added++;
        }catch(e){ failed++; }
      }
      saveFS(); refreshFX();
      if(last){
        load({path:destPath,name:last});
        setStatus("imported "+added+" file"+(added===1?"":"s"),"ok");
      }
      if(failed) winDialog({icon:"⚠️",title:"Import",msg:failed+" file(s) couldn't be read."});
      else if(added) notify({icon:"🐍",title:"Python",body:added+" script(s) imported into "+destPath[destPath.length-1]});
    };
    inp.click();
  }

  function stop(){
    if(live){ try{ live.runner.stop(); }catch(e){} try{ live.stage.quit(); }catch(e){} }
    live=null; reflect();
  }
  function run(){
    stop();
    setStatus("running…","run");
    live=pyLaunch(out, ta.value, {
      appId:"python",
      cwd:cur?cur.path:[...HOME_PATH,"Documents"],
      scriptName:cur?cur.name:"untitled.py",
      setTitle:(t)=>{ const e=win.querySelector(".tt"); if(e) e.textContent=t+" — Python"; },
      onDone:(ok)=>{ live=null; reflect(); setStatus(ok?"finished":"stopped — see the error above",ok?"ok":"bad"); },
    });
    reflect();
  }

  body.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.a;
    if(a==="new"){ stop(); ta.value=""; cur=null; setTitle(); renderGutter(); out.innerHTML=""; setStatus(""); }
    else if(a==="open") fileDialog({mode:"open",cb:(p,n)=>load({path:p,name:n})});
    else if(a==="import") importPy();
    else if(a==="save"){ if(cur) doSave(cur.path,cur.name); else fileDialog({mode:"save",cb:doSave}); }
    else if(a==="run") run();
    else if(a==="stop"){ stop(); setStatus("stopped"); }
    else if(a==="help") pyHelpDialog();
    else if(a==="samples"){
      const r=b.getBoundingClientRect();
      showCtx(r.left, r.bottom, Object.keys(PY_SAMPLES).map(nm=>({
        icon:"🐍", label:nm,
        action:()=>{ stop(); ta.value=PY_SAMPLES[nm]; cur=null; setTitle(); renderGutter(); out.innerHTML=""; setStatus("loaded "+nm); }
      })));
    }
  });

  /* drag the divider to resize the editor */
  const split=body.querySelector(".py-split");
  split.addEventListener("mousedown",e=>{
    e.preventDefault();
    const startY=e.clientY, startH=editwrap.offsetHeight;
    const mv=ev=>{
      const h=Math.max(80,Math.min(body.offsetHeight-120, startH+(ev.clientY-startY)));
      editwrap.style.flex="0 0 "+h+"px";
    };
    const up=()=>{ document.removeEventListener("mousemove",mv); document.removeEventListener("mouseup",up); };
    document.addEventListener("mousemove",mv);
    document.addEventListener("mouseup",up);
  });

  if(PY_PENDING){ load(PY_PENDING); PY_PENDING=null; }
  else { ta.value=PY_SAMPLES["hello.py"]; setTitle(); }
  renderGutter(); reflect();
}

/* ============================ PYTHON FILE RUNNER ============================ */
let PYRUN_PENDING=null;
const PYRUN={loader:null};
function openPyFile(pn){
  if(state.wins.pyrun && PYRUN.loader){
    if(state.wins.pyrun.min) toggleMin("pyrun",false);
    focusWin("pyrun"); PYRUN.loader(pn);
  } else { PYRUN_PENDING=pn; openApp("pyrun"); }
}
function buildPyRun(body,win){
  body.innerHTML=`<div class="pyide pyrunner">
    <div class="py-bar">
      <button class="py-btn go" data-a="again">⟳ Run again</button>
      <button class="py-btn stop" data-a="stop">■ Stop</button>
      <button class="py-btn" data-a="edit">📝 Edit</button>
      <span class="py-status"></span>
    </div>
    <div class="py-out"></div>
  </div>`;
  const out=body.querySelector(".py-out");
  const status=body.querySelector(".py-status");
  let cur=null, live=null;
  const setStatus=(t,cls)=>{ status.textContent=t||""; status.className="py-status"+(cls?" "+cls:""); };

  function stop(){
    if(live){ try{ live.runner.stop(); }catch(e){} try{ live.stage.quit(); }catch(e){} }
    live=null;
  }
  function start(){
    if(!cur) return;
    const parent=nodeAt(cur.path), f=parent&&parent.children&&parent.children[cur.name];
    if(!f){ out.innerHTML=""; setStatus("file not found","bad"); return; }
    if(f.web){
      out.innerHTML="";
      setStatus("blocked","bad");
      winDialog({icon:"🚫",title:cur.name,msg:"<b>"+esc(cur.name)+"</b> came from the internet.<br>WinClone won't run downloaded scripts."});
      return;
    }
    stop();
    setStatus("running…","run");
    const t=win.querySelector(".tt"); if(t) t.textContent=cur.name+" — Python";
    live=pyLaunch(out, String(f.content==null?"":f.content), {
      appId:"pyrun",
      cwd:[...cur.path],
      scriptName:cur.name,
      setTitle:(x)=>{ const e=win.querySelector(".tt"); if(e) e.textContent=x+" — Python"; },
      onDone:(ok)=>{ live=null; setStatus(ok?"finished":"stopped — see the error above",ok?"ok":"bad"); },
    });
  }
  function load(pn){ cur={path:[...pn.path],name:pn.name}; start(); }
  PYRUN.loader=load;

  body.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.a;
    if(a==="again") start();
    else if(a==="stop"){ stop(); setStatus("stopped"); }
    else if(a==="edit"){ if(cur) openPythonWith({path:cur.path,name:cur.name}); }
  });

  if(PYRUN_PENDING){ load(PYRUN_PENDING); PYRUN_PENDING=null; }
  else { setStatus("open a .py file from File Explorer"); }
}

function pyHelpDialog(){
  const d=winDialog({icon:"🐍",title:"Python in WinClone",msg:
    `<div style="line-height:1.6;font-size:12.5px;max-height:66vh;overflow:auto;padding-right:4px">
    <b>What works</b><br>
    Variables, <b>if / elif / else</b>, <b>while</b>, <b>for … in</b>, <b>def</b> (defaults, *args, **kwargs),
    <b>class</b> with inheritance, lambdas, list/dict/set comprehensions, f-strings,
    slicing, unpacking, <b>try / except / finally</b>, <b>import</b>, and the usual builtins
    (print, input, len, range, sum, sorted, enumerate, zip, map, filter…).<br>
    Modules: <b>math</b>, <b>random</b>, <b>time</b>, <b>sys</b>, <b>wcgame</b>, <b>winclone</b>.<br><br>

    <b>Your own .py files</b><br>
    <b>Import…</b> brings a real .py file in from your computer (File Explorer's
    <i>Import files…</i> takes them too). <code>import mymodule</code> then loads
    <code>mymodule.py</code> from the same folder as your script, or from
    <code>Documents\\Python</code> — so you can split a project across files.<br><br>

    <b>Drawing and games — <code>import wcgame as g</code></b><br>
    <code>g.init(w, h)</code> open a canvas · <code>g.width()</code> · <code>g.height()</code><br>
    <code>g.fill(colour)</code> clear the screen<br>
    <code>g.rect(x, y, w, h, colour)</code> · <code>g.circle(x, y, r, colour)</code><br>
    <code>g.line(x1, y1, x2, y2, colour)</code> · <code>g.poly(points, colour)</code><br>
    <span style="color:#9a9a9a">rect, circle, line and poly all take <code>fill=False</code> and <code>width=n</code> to outline instead</span><br>
    <code>g.text(s, x, y, colour, size)</code> · <code>g.beep(freq, seconds)</code><br>
    <code>g.key("left")</code> held down · <code>g.pressed("space")</code> just pressed ·
    <code>g.keys()</code> everything held<br>
    <code>g.mouse()</code> → (x, y) · <code>g.mouse_down()</code> · <code>g.click()</code><br>
    <code>g.flip()</code> show the frame and wait for the next · <code>g.wait(seconds)</code><br>
    <code>g.running()</code> False once the window closes · <code>g.quit()</code> stop early<br><br>

    <b>Talking to the OS — <code>import winclone</code></b><br>
    <code>winclone.notify(title, body)</code> · <code>winclone.beep()</code><br>
    <code>winclone.user()</code> · <code>winclone.set_user_name(name)</code> — renames the
    account everywhere<br>
    <code>winclone.version()</code> · <code>winclone.cwd()</code> · <code>winclone.apps()</code><br>
    <code>winclone.ls(folder)</code> · <code>winclone.read(name)</code> · <code>winclone.exists(name)</code><br>
    <code>winclone.write(name, text)</code> — if that name is taken it makes
    <code>name (2)</code> instead of replacing it, and returns the name it used<br>
    <code>winclone.write(name, text, overwrite=True)</code> — replace the existing one<br>
    <code>winclone.append(name, text)</code> — adds to the end, creates it if missing<br>
    <code>winclone.new_file(name, text)</code> — same as plain write, named for when
    making a new copy is the whole point<br>
    <code>winclone.del_file(name)</code> — to the Recycle Bin; add
    <code>permanent=True</code> to skip the bin and actually free the space, or
    <code>missing_ok=True</code> to shrug when it's already gone<br>
    <code>winclone.open_app(x)</code> (or <code>winclone.open</code>) — an app id opens the app,
    anything else opens that file or folder with whatever handles it<br><br>

    <b>Taking over the screen — <code>import winclone</code></b><br>
    <code>winclone.effect("melt")</code> — starts a screen effect. It runs over the
    <i>whole</i> desktop, not in this window, and keeps running after your script ends<br>
    <code>winclone.effect("melt", False)</code> — turn that one off again<br>
    <code>winclone.effect("all")</code> — every effect at once. You have been warned<br>
    <code>winclone.effects()</code> — the list of names ·
    <code>winclone.stop_effects()</code> — stop the lot<br>
    <span style="color:#9a9a9a">Ctrl+Alt+X is the panic button if a script leaves the screen
    unusable, and reloading the page always clears it.</span><br><br>

    <b>Catching problems</b><br>
    <code>ValueError</code>, <code>TypeError</code>, <code>NameError</code>, <code>IndexError</code>,
    <code>KeyError</code>, <code>ZeroDivisionError</code>, <code>AttributeError</code>,
    <code>AssertionError</code>, <code>ImportError</code><br>
    File ones: <code>FileNotFoundError</code>, <code>FileExistsError</code>,
    <code>PermissionError</code>, <code>IsADirectoryError</code> — or catch the lot with
    <code>OSError</code>. <code>Exception</code> catches everything.<br><br>

    <b>What doesn't</b><br>
    Ints and floats are the same thing here, so <code>4 / 2</code> prints <code>2</code>, not <code>2.0</code>.
    No generators/yield, no decorators, no real file or network access, no third-party
    packages — this interpreter was written from scratch inside WinClone.
    </div>`});
  if(d){                                   // the default dialog is too narrow for a cheat sheet
    d.style.maxWidth="580px";
    d.style.width="580px";
    d.style.left=Math.max(10,(innerWidth-580)/2)+"px";
    d.style.top =Math.max(10,(innerHeight-d.offsetHeight)/2)+"px";
  }
}

/* ============================ VIRTUAL FILESYSTEM (persistent) ============================ */
const FS_KEY="wc_fs", RC_KEY="wc_recycle", INF_KEY="wc_infect";
function defaultFS(){ return {
  "C:":{folder:true,children:{
    "Users":{folder:true,children:{
      "User":{folder:true,children:{
        "Desktop":{folder:true,children:{
          "WinClone.lnk":{icon:"🪟",lnk:true,target:"settings"},
          "notes.txt":{icon:"📄",content:"my secret plans:\n- build a pc\n- do NOT delete systemwinclone.sys\n- take over the world (later)"}}},
        "Documents":{folder:true,children:{
          "resume.docx":{icon:"📘",content:"USER — RESUME\n\nSkills: building an operating system out of one HTML file."},
          "budget.xlsx":{icon:"📗"},
          "Python":{folder:true,children:pySampleFiles()},
          "Projects":{folder:true,children:{"ideas.txt":{icon:"📄",content:"idea 1: winclone\nidea 2: winclone 2"}}}}},
        "Downloads":{folder:true,children:{
          "setup.exe":{icon:"⚙️",exe:true},
          "photo.png":{icon:"🖼️",art:{g:"linear-gradient(160deg,#88b6d0,#5a7b9c 55%,#324b66)",e:"🏔️"}},
          "movie.mp4":{icon:"🎬"}}},
        "Pictures":{folder:true,children:{
          "vacation.jpg":{icon:"🖼️",art:{g:"linear-gradient(160deg,#ffd194,#ff8a5c 55%,#4a90d9)",e:"🏖️"}},
          "screenshot.png":{icon:"🖼️",art:{g:"linear-gradient(160deg,#0a1c3a,#0c2f5c 60%,#050b16)",e:"🪟"}}}},
        "Music":{folder:true,children:{"song.mp3":{icon:"🎵"}}},
        "Videos":{folder:true,children:{}},
      }}
    }},
    "Windows":{folder:true,children:{
      "System":{folder:true,children:{
        "systemwinclone.sys":{icon:"⚙️",sys:true,critical:true},
        "SysWIW48.dll":{icon:"🧩",sys:true},
        "winclone_kernel.dll":{icon:"🧩",sys:true},
        "wclogon.exe":{icon:"🔐",sys:true,exe:true},
        "bootmgr.wc":{icon:"🥾",sys:true},
      }},
      "Fonts":{folder:true,children:{"segoe_clone.ttf":{icon:"🔤"}}},
    }},
    "Program Files":{folder:true,children:{
      "Cork Defender":{folder:true,children:{"corkdefender.exe":{icon:"🛡️",exe:true,app:"defender"}}},
      "WinClone Edge":{folder:true,children:{"edge.exe":{icon:"🌐",exe:true,app:"edge"}}},
    }},
  }}
};}
let VFS, RECYCLE, INFECTIONS;
function loadState(){
  try{ VFS=JSON.parse(localStorage.getItem(FS_KEY)) || defaultFS(); }catch(e){ VFS=defaultFS(); }
  try{ RECYCLE=JSON.parse(localStorage.getItem(RC_KEY)) || []; }catch(e){ RECYCLE=[]; }
  try{ INFECTIONS=JSON.parse(localStorage.getItem(INF_KEY)) || []; }catch(e){ INFECTIONS=[]; }
}
function saveFS(){ try{ localStorage.setItem(FS_KEY, JSON.stringify(VFS)); }catch(e){ try{ winDialog({icon:"⚠️",title:"Storage full",msg:"WinClone's storage is full (the browser's localStorage limit). Delete some imported images or large files to free space."}); }catch(_){} } }
function saveRecycle(){ localStorage.setItem(RC_KEY, JSON.stringify(RECYCLE)); }
function saveInfections(){ localStorage.setItem(INF_KEY, JSON.stringify(INFECTIONS)); }
loadState();
/* normalize legacy infection format (strings) -> {name,kind} */
INFECTIONS=(INFECTIONS||[]).map(x=>typeof x==="string"?{name:x,kind:"scareware"}:x).filter(x=>x&&x.kind);

const HOME_PATH=["C:","Users","User"];
function nodeAt(path){ let n={folder:true,children:VFS}; for(const k of path){ if(!n.children||!n.children[k]) return null; n=n.children[k]; } return n; }
/* migrate a legacy WinClone.lnk (created before shortcuts worked) into a real shortcut */
try{ const _d=nodeAt(["C:","Users","User","Desktop"]), _w=_d&&_d.children&&_d.children["WinClone.lnk"];
  if(_w && !_w.target && !_w.path){ _w.lnk=true; _w.target="settings"; saveFS(); } }catch(e){}
/* one-time: drop the example scripts into Documents\Python on installs that
   predate Python support (defaultFS only covers brand-new installs) */
try{
  if(!localStorage.getItem("wc_pysamples")){
    const _docs=nodeAt([...HOME_PATH,"Documents"]);
    if(_docs&&_docs.children){
      if(!_docs.children["Python"]) _docs.children["Python"]={folder:true,children:{}};
      const _pf=_docs.children["Python"];
      if(_pf.children) Object.keys(PY_SAMPLES).forEach(k=>{
        if(!_pf.children[k]) _pf.children[k]={icon:"🐍",content:PY_SAMPLES[k]};
      });
      saveFS();
    }
    localStorage.setItem("wc_pysamples","1");
  }
}catch(e){}

/* open explorer windows re-render when the FS changes */
const fxRefreshers=[];
function refreshFX(){ fxRefreshers.forEach(f=>{try{f()}catch(e){}}); try{renderDesktopIcons();}catch(e){} }

/* ---- account / username ---- */
function getUser(){ const n=localStorage.getItem("wc_user"); return (n&&n.trim())||"User"; }
function userInitial(){ return (getUser().trim()[0]||"U").toUpperCase(); }
function userEmail(){ return getUser().trim().toLowerCase().replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"")+"@winclone.local"; }
function setUser(name){
  name=(name||"").trim().slice(0,24);
  try{ if(name) localStorage.setItem("wc_user",name); else localStorage.removeItem("wc_user"); }catch(e){}
  applyUserUI();
}
function applyUserUI(){
  const n=getUser(), i=userInitial();
  document.querySelectorAll("#startmenu .avatar, #login .avatar-lg").forEach(e=>e.textContent=i);
  const ru=$("#rail-user"); if(ru) ru.title=n;
  document.querySelectorAll("#login .lg-name").forEach(e=>e.textContent=n);
}

/* ---- theme / accent (persisted) ---- */
function setAccent(a,solid){
  document.documentElement.style.setProperty("--accent",a);
  if(solid) document.documentElement.style.setProperty("--accent-solid",solid);
  try{ localStorage.setItem("wc_accent",a+"|"+(solid||"")); }catch(e){}
}

/* ---- file-type glyphs ---- */
const EXT_GLYPH={
  txt:"📄",log:"📄",md:"📝",rtf:"📃",ini:"🧾",cfg:"🧾",conf:"🧾",json:"🗂️",xml:"🗂️",yml:"🗂️",yaml:"🗂️",
  csv:"📊",tsv:"📊",xlsx:"📗",xls:"📗",docx:"📘",doc:"📘",wcdocs:"📘",wcdoc:"📘",pptx:"📙",ppt:"📙",pdf:"📕",
  png:"🖼️",jpg:"🖼️",jpeg:"🖼️",gif:"🖼️",bmp:"🖼️",webp:"🖼️",svg:"🖼️",ico:"🖼️",
  mp4:"🎬",webm:"🎬",mkv:"🎬",avi:"🎬",mov:"🎬",m4v:"🎬",
  mp3:"🎵",wav:"🎵",ogg:"🎵",m4a:"🎵",flac:"🎵",
  zip:"🗜️",rar:"🗜️","7z":"🗜️",tar:"🗜️",gz:"🗜️",
  exe:"⚙️",msi:"⚙️",scr:"⚙️",bat:"📜",ps1:"📜",sh:"📜",dll:"🧩",sys:"⚙️",
  html:"🌐",htm:"🌐",css:"🎨",js:"📜",ts:"📜",py:"🐍",lnk:"🔗",ttf:"🔤",otf:"🔤",
};
function extOf(name){ const m=/\.([a-z0-9]+)$/i.exec(name||""); return m?m[1].toLowerCase():""; }
function glyphFor(name,item){
  if(item&&item.folder) return "📁";
  if(item&&item.archive) return "🗜️";
  if(item&&item.icon) return item.icon;
  return EXT_GLYPH[extOf(name)] || "📄";
}

/* ---- shortcuts (.lnk) ---- */
function isLnk(name,item){ return !!(item&&item.lnk) || /\.lnk$/i.test(name||""); }
function openShortcut(name,item){
  if(item.target && APPS[item.target]){ openApp(item.target); return; }
  if(item.path && item.path.length){
    const node=nodeAt(item.path);
    if(!node){ winDialog({icon:"⚠️",title:name,msg:"The item this shortcut points to can't be found.<br><small style='color:#9a9a9a'>It may have been moved, renamed or deleted.</small>"}); return; }
    if(node.folder){ openExplorerAt(item.path); }
    else fsOpen(item.path.slice(0,-1), item.path[item.path.length-1], node);
    return;
  }
  winDialog({icon:"🔗",title:name,msg:"This shortcut doesn't point to anything."});
}
function createShortcut(srcPath,name,item,destPath){
  const dest=nodeAt(destPath); if(!dest||!dest.children) return;
  const base=name.replace(/\.[^.]+$/,"")+" - Shortcut.lnk";
  dest.children[uniqueName(dest,base)]={lnk:true, icon:glyphFor(name,item), path:[...srcPath,name]};
  saveFS(); refreshFX();
}
function addAppShortcutToDesktop(appId){
  const app=APPS[appId]; if(!app) return;
  const desk=nodeAt([...HOME_PATH,"Desktop"]); if(!desk||!desk.children) return;
  desk.children[uniqueName(desk, app.title+".lnk")]={lnk:true, icon:app.icon, target:appId};
  saveFS(); refreshFX();
}

/* ---- New-file templates ---- */
const NEW_TYPES=[
  {label:"Folder",              icon:"📁", base:"New folder",                 make:()=>({folder:true,children:{}})},
  {label:"Text Document",       icon:"📄", base:"New Text Document.txt",      make:()=>({icon:"📄",content:""})},
  {label:"HTML Document",       icon:"🌐", base:"New HTML Document.html",     make:()=>({icon:"🌐",content:"<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <title>New Page</title>\n  <style>body{font-family:Segoe UI,sans-serif;padding:30px;color:#222}h1{color:#0067c0}</style>\n</head>\n<body>\n  <h1>Hello from WinClone</h1>\n  <p>Edit me in Notepad, then double-click to render.</p>\n</body>\n</html>"})},
  {label:"WinClone Document",   icon:"📘", base:"New Document.wcdocs",        make:()=>({icon:"📘",doc:true,html:"<p><br></p>",content:""})},
  {label:"Rich Text Document",  icon:"📃", base:"New Rich Text Document.rtf", make:()=>({icon:"📃",content:""})},
  {label:"Spreadsheet (CSV)",   icon:"📊", base:"New Spreadsheet.csv",        make:()=>({icon:"📊",content:"name,value\n,"})},
  {label:"Config (INI)",        icon:"🧾", base:"New Config.ini",             make:()=>({icon:"🧾",content:"[settings]\n"})},
  {label:"Markdown Document",   icon:"📝", base:"New Markdown.md",            make:()=>({icon:"📝",content:"# Title\n\n"})},
  {label:"JSON File",           icon:"🗂️", base:"New File.json",              make:()=>({icon:"🗂️",content:"{\n  \n}"})},
  {label:"Log File",            icon:"📄", base:"New Log File.log",           make:()=>({icon:"📄",content:""})},
  {label:"Batch Script",        icon:"📜", base:"New Batch Script.bat",       make:()=>({icon:"📜",content:"@echo off\n"})},
  {label:"Python Script",       icon:"🐍", base:"New Python Script.py",       make:()=>({icon:"🐍",content:"# A new Python script.\n# Double-click to run it, or right-click ‣ Edit to open it in Python.\n\nprint(\"hello from Python\")\n"})},
  {label:"Bitmap Image",        icon:"🖼️", base:"New Bitmap Image.bmp",       make:()=>({icon:"🖼️"})},
  {label:"ZIP Archive",         icon:"🗜️", base:"New Archive.zip",            make:()=>({icon:"🗜️",archive:true,children:{}})},
  {label:"RAR Archive",         icon:"🗜️", base:"New Archive.rar",            make:()=>({icon:"🗜️",archive:true,children:{}})},
];
function uniqueName(node,base){
  if(!node.children[base]) return base;
  const dot=base.lastIndexOf("."), stem=dot>0?base.slice(0,dot):base, ext=dot>0?base.slice(dot):"";
  let i=2; while(node.children[stem+" ("+i+")"+ext]) i++;
  return stem+" ("+i+")"+ext;
}
function createIn(path,type){
  const node=nodeAt(path); if(!node||!node.children) return;
  node.children[uniqueName(node,type.base)]=type.make();
  saveFS(); refreshFX();
}
function newMenu(x,y,path){
  showCtx(x,y, NEW_TYPES.map(t=>({icon:t.icon,label:t.label,action:()=>createIn(path,t)})));
}

/* ---- clipboard ---- */
let CLIP=null; // {mode, name, item, from}
function clipCopy(path,name,item){ CLIP={mode:"copy",name,item:JSON.parse(JSON.stringify(item)),from:[...path]}; }
function clipCut(path,name,item){ CLIP={mode:"cut",name,item,from:[...path]}; }
function clipPaste(path){
  if(!CLIP) return;
  const node=nodeAt(path); if(!node||!node.children) return;
  const name=uniqueName(node,CLIP.name);
  node.children[name]=CLIP.mode==="copy"?JSON.parse(JSON.stringify(CLIP.item)):CLIP.item;
  if(CLIP.mode==="cut"){ const src=nodeAt(CLIP.from); if(src&&src.children) delete src.children[CLIP.name]; CLIP=null; }
  saveFS(); refreshFX();
}
/* ---- drag & drop move ---- */
let DRAG=null; // {path, name, item}
function moveItem(fromPath,name,toPath){
  if(!DRAG&&!name) return;
  if(fromPath.join("/")===toPath.join("/")) return; // same folder, no-op
  const src=nodeAt(fromPath); if(!src||!src.children||!src.children[name]) return;
  const item=src.children[name];
  const srcFull=[...fromPath,name].join("/"), toStr=toPath.join("/");
  if((item.folder||item.archive) && (toStr===srcFull || toStr.startsWith(srcFull+"/"))) return; // into itself
  const dest=nodeAt(toPath); if(!dest||!dest.children) return;
  dest.children[uniqueName(dest,name)]=item;
  delete src.children[name];
  saveFS(); refreshFX();
}
function makeDragSource(el2,path,name,item){
  el2.draggable=true;
  el2.addEventListener("dragstart",e=>{ DRAG={path:[...path],name,item}; e.dataTransfer.effectAllowed="move"; try{e.dataTransfer.setData("text/plain",name);}catch(_){} el2.classList.add("dragging"); });
  el2.addEventListener("dragend",()=>{ DRAG=null; el2.classList.remove("dragging"); document.querySelectorAll(".drop-hover,.recycle-hot,.drop-target").forEach(x=>x.classList.remove("drop-hover","recycle-hot","drop-target")); });
}
function makeDropTarget(el2,getToPath,hoverClass){
  el2.addEventListener("dragover",e=>{ if(!DRAG) return; const to=getToPath(); if(!to) return; if(DRAG.path.join("/")===to.join("/")&&!to.includes(DRAG.name)){} e.preventDefault(); el2.classList.add(hoverClass||"drop-hover"); });
  el2.addEventListener("dragleave",()=>el2.classList.remove(hoverClass||"drop-hover"));
  el2.addEventListener("drop",e=>{ if(!DRAG) return; e.preventDefault(); e.stopPropagation(); el2.classList.remove(hoverClass||"drop-hover"); const to=getToPath(); if(to) moveItem(DRAG.path,DRAG.name,to); });
}
function compressToArchive(path,name,item){
  const node=nodeAt(path); if(!node||!node.children) return;
  const stem=name.replace(/\.[^.]+$/,"");
  const arcName=uniqueName(node,stem+".zip");
  node.children[arcName]={icon:"🗜️",archive:true,children:{[name]:JSON.parse(JSON.stringify(item))}};
  saveFS(); refreshFX();
  malInfo("🗜️","Compressed",name+" → "+arcName);
}
/* ---- Notification Center ---- */
let NOTIFS=[]; try{ NOTIFS=JSON.parse(localStorage.getItem("wc_notifs"))||[]; }catch(e){ NOTIFS=[]; }
let notifUnseen=0;
function saveNotifs(){ try{ localStorage.setItem("wc_notifs",JSON.stringify(NOTIFS.slice(0,50))); }catch(e){} }
function notifTimeAgo(ts){ const s=Math.floor((Date.now()-ts)/1000); if(s<60)return "just now"; const m=Math.floor(s/60); if(m<60)return m+"m ago"; const h=Math.floor(m/60); if(h<24)return h+"h ago"; return Math.floor(h/24)+"d ago"; }
function notifBadge(){ const b=$("#notif-badge"); if(!b) return; b.textContent=notifUnseen>9?"9+":notifUnseen; b.style.display=notifUnseen>0?"grid":"none"; }
function showToast(n){
  const wrap=$("#toasts"); if(!wrap) return;
  sfx("notify");
  const t=el("div","toast",`<span class="ti">${n.icon}</span><div class="tc"><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div>`);
  wrap.appendChild(t);
  setTimeout(()=>t.classList.add("in"),20);   // setTimeout (not rAF) so it shows even if fired in a background tab
  const kill=()=>{ t.classList.remove("in"); setTimeout(()=>t.remove(),260); };
  t.onclick=kill; setTimeout(kill,5000);
}
function notify(o){
  const n={icon:(o&&o.icon)||"🔔",title:(o&&o.title)||"WinClone",body:(o&&(o.body||o.msg))||"",ts:Date.now()};
  NOTIFS.unshift(n); NOTIFS=NOTIFS.slice(0,50); saveNotifs();
  showToast(n);
  if($("#notif") && $("#notif").classList.contains("open")) renderNotif();
  else { notifUnseen++; notifBadge(); }
}
function renderNotif(){
  const list=$("#notif-list"); if(!list) return;
  if(!NOTIFS.length){ list.innerHTML=`<div class="notif-empty">🔔 No notifications</div>`; return; }
  list.innerHTML="";
  NOTIFS.forEach(n=>list.appendChild(el("div","notif-item",`<span class="ni">${n.icon}</span><div class="nc"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><small>${notifTimeAgo(n.ts)}</small></div>`)));
}
function malInfo(icon,title,msg){ try{ notify({icon,title,body:msg}); }catch(e){ try{ malToast(icon,title,msg); }catch(_){} } }

/* ---- small input dialog (rename / save-as name) ---- */
function inputDialog(o){
  const d=el("div","dlg"); d.style.width="360px";
  d.innerHTML=`<div class="dlg-head"><span>${o.title||"Rename"}</span><button class="x">✕</button></div>
    <div style="padding:16px 16px 6px"><input class="fdlg-name" spellcheck="false"></div>
    <div class="dlg-foot"><button class="dlg-btn pri" data-ok>${o.ok||"OK"}</button><button class="dlg-btn" data-cancel>Cancel</button></div>`;
  document.body.appendChild(d);
  d.style.left=Math.max(10,(innerWidth-360)/2)+"px"; d.style.top=Math.max(10,(innerHeight-160)/2)+"px";
  d.style.zIndex=60000+(++state.z);
  const inp=d.querySelector("input"); inp.value=o.value||"";
  setTimeout(()=>{ inp.focus(); const dot=inp.value.lastIndexOf("."); inp.setSelectionRange(0, dot>0?dot:inp.value.length); },30);
  const done=()=>{ const v=inp.value.trim(); d.remove(); if(v&&o.cb) o.cb(v); };
  d.querySelector("[data-ok]").onclick=done;
  d.querySelector("[data-cancel]").onclick=()=>d.remove();
  d.querySelector(".x").onclick=()=>d.remove();
  inp.addEventListener("keydown",e=>{ if(e.key==="Enter") done(); if(e.key==="Escape") d.remove(); });
}
function renameItem(path,name,item){
  inputDialog({title:"Rename",value:name,ok:"Rename",cb:nv=>{
    if(nv===name) return;
    if(/^(__proto__|prototype|constructor)$/.test(nv)){ winDialog({icon:"⚠️",title:"Rename",msg:"That name is reserved by the system."}); return; }
    const node=nodeAt(path); if(!node||!node.children) return;
    if(node.children[nv]){ winDialog({icon:"⚠️",title:"Rename",msg:"An item named <b>"+esc(nv)+"</b> already exists here."}); return; }
    node.children[nv]=item; delete node.children[name];
    saveFS(); refreshFX();
  }});
}

/* ---- universal open router ---- */
function fsOpen(path,name,item){
  if(item.locked){ winDialog({icon:"🔒",title:name,msg:"This file is encrypted by BitCork ransomware and can't be opened. Run <b>Cork Defender</b> to decrypt it."}); return; }
  if(isLnk(name,item)){ openShortcut(name,item); return; }
  if(item.archive){ openArchive({path:[...path],name}); return; }
  if(item.folder){ openExplorerAt([...path,name]); return; }
  const lo=name.toLowerCase();
  const isImg=/\.(png|jpe?g|gif|bmp|webp|svg|ico)$/.test(lo);
  const isVid=/\.(mp4|webm|mkv|avi|mov|m4v)$/.test(lo);
  const isAud=/\.(mp3|wav|ogg|m4a|flac)$/.test(lo);
  // Files pulled off the real web are inert: only images and videos may open.
  if(item.web && !isImg && !isVid){
    winDialog({icon:"🚫",title:name,msg:`<b>${esc(name)}</b> was downloaded from the internet.<br>WinClone won't run files from the web — only images and videos will open.`});
    return;
  }
  if(/\.html?$/.test(lo)) openHtml({path:[...path],name});
  else if(isImg) openImageInPhotos({path:[...path],name});
  else if(isVid || isAud) openMediaIn({path:[...path],name});
  else if(/\.(wcdocs?|docx?|odt|rtf)$/.test(lo)) openDocs({path:[...path],name});
  else if(/\.(bat|cmd)$/.test(lo)) openBatch({path:[...path],name});
  else if(/\.py$/.test(lo)) openPyFile({path:[...path],name});
  else if(item.exe||item.malware||lo.endsWith(".exe")) runFile(name,item);
  else openFileInNotepad({path:[...path],name}); // txt, md, json, log, rtf, csv, ini, bat, unknown-with-content
}
/* context menu for a file/folder, reused by Explorer + Desktop */
function fsItemMenu(x,y,path,name,item,extra){
  const items=[{icon:"📂",label:"Open",action:()=>fsOpen(path,name,item)}];
  if(/\.(bat|cmd)$/i.test(name) && !item.web)
    items.push({icon:"📝",label:"Edit",action:()=>openFileInNotepad({path:[...path],name})});
  if(/\.py$/i.test(name) && !item.web)
    items.push({icon:"🐍",label:"Edit in Python",action:()=>openPythonWith({path:[...path],name})});
  if(!item.sys) items.push({icon:"📤",label:"Export (save to computer)…",action:()=>exportFile(path,name,item)});
  if(/\.(png|jpe?g|gif|bmp)$/i.test(name) && !item.locked)
    items.push({icon:"🖼️",label:"Set as wallpaper",action:()=>setWallpaper(artFor(name,item).g)});
  if(item.archive) items.push({icon:"📦",label:"Extract all here",action:()=>extractArchive(path,name,item)});
  if(!isLnk(name,item)){
    items.push({icon:"🔗",label:"Create shortcut",action:()=>createShortcut(path,name,item,path)});
    if(path.join("/")!==[...HOME_PATH,"Desktop"].join("/"))
      items.push({icon:"🖥️",label:"Send to Desktop",action:()=>createShortcut(path,name,item,[...HOME_PATH,"Desktop"])});
  }
  items.push("sep",
    {icon:"✂️",label:"Cut",action:()=>clipCut(path,name,item)},
    {icon:"📋",label:"Copy",action:()=>clipCopy(path,name,item)},
    {icon:"✏️",label:"Rename",action:()=>renameItem(path,name,item)});
  if(!item.folder && !item.archive && !item.sys && !isLnk(name,item))
    items.push({icon:"🗜️",label:"Compress to ZIP",action:()=>compressToArchive(path,name,item)});
  items.push("sep",{icon:"🗑️",label:"Delete",action:()=>(extra&&extra.del?extra.del():deleteAt(path,name))});
  showCtx(x,y,items);
}
function extractArchive(path,name,item){
  const node=nodeAt(path); if(!node||!node.children||!item.children) return;
  Object.keys(item.children).forEach(k=>{ node.children[uniqueName(node,k)]=JSON.parse(JSON.stringify(item.children[k])); });
  saveFS(); refreshFX();
  malInfo("📦","Extracted",name+" → "+path[path.length-1]);
}

/* ---- windowed openers that reuse an existing window ---- */
let EXP_PENDING=null; const EXP={goto:null};
function openExplorerAt(p){
  if(state.wins.explorer && EXP.goto){ if(state.wins.explorer.min) toggleMin("explorer",false); focusWin("explorer"); EXP.goto(p); }
  else { EXP_PENDING=[...p]; openApp("explorer"); }
}
let ARC_PENDING=null; const ARC={loader:null};
function openArchive(pn){
  if(state.wins.archive && ARC.loader){ if(state.wins.archive.min) toggleMin("archive",false); focusWin("archive"); ARC.loader(pn); }
  else { ARC_PENDING=pn; openApp("archive"); }
}
let HV_PENDING=null; const HV={loader:null};
function openHtml(pn){
  if(state.wins.htmlview && HV.loader){ if(state.wins.htmlview.min) toggleMin("htmlview",false); focusWin("htmlview"); HV.loader(pn); }
  else { HV_PENDING=pn; openApp("htmlview"); }
}

function deleteAt(path,name){
  const parent=nodeAt(path); if(!parent||!parent.children[name]) return;
  RECYCLE.push({name, path, item:parent.children[name], when:Date.now()});
  delete parent.children[name];
  saveFS(); saveRecycle(); refreshFX(); applySystemHealth();
}
function restoreFromRecycle(idx){
  const r=RECYCLE[idx]; if(!r) return;
  const parent=nodeAt(r.path);
  if(parent&&parent.children) parent.children[r.name]=r.item;
  RECYCLE.splice(idx,1);
  saveFS(); saveRecycle(); refreshFX(); applySystemHealth();
}

/* ============================ PATH RESOLUTION (for del / batch) ============================ */
/* cwd is a drive-rooted segment array, e.g. ["C:","Users","User","Desktop"].
   Returns a normalized drive-rooted segment array for a cmd-style path argument. */
function batResolve(cwd, arg){
  arg=String(arg||"").trim().replace(/^"(.*)"$/,"$1").replace(/[\\/]+$/,"");
  const split=s=>s.split(/[\\/]+/).filter(x=>x!=="");
  let segs;
  if(/^[A-Za-z]:/.test(arg))      segs=[arg.slice(0,2).toUpperCase(), ...split(arg.slice(2))]; // absolute w/ drive
  else if(/^[\\/]/.test(arg))     segs=[cwd[0], ...split(arg)];                                 // drive-root relative
  else                            segs=[...cwd, ...split(arg)];                                 // cwd relative
  const out=[];
  for(const s of segs){ if(s==="."||s==="") continue; else if(s===".."){ if(out.length>1) out.pop(); } else out.push(s); }
  return out.length?out:[cwd[0]];
}
function wildRe(pat){
  return new RegExp("^"+pat.split("").map(ch=> ch==="*"?".*":ch==="?"?".":ch.replace(/[.+^${}()|[\]\\]/g,"\\$&")).join("")+"$","i");
}
/* Delete file(s) matching a cmd-style target. Routes through deleteAt (recycles + system-health/BSOD). */
function batDelete(cwd, rawArg){
  const segs=batResolve(cwd, rawArg);
  const name=segs[segs.length-1], parentPath=segs.slice(0,-1);
  const parent=nodeAt(parentPath);
  if(!parent||!parent.children) return {err:"path"};
  const all=/^\*(\.\*)?$/.test(name);
  const re=all?null:wildRe(name);
  const victims=Object.keys(parent.children).filter(k=>{ const it=parent.children[k]; return !it.folder && (all||re.test(k)); });
  if(!victims.length) return {err:"notfound"};
  victims.forEach(k=>deleteAt(parentPath,k));
  return {deleted:victims};
}
/* Remove a folder (rd / rmdir). /s allows non-empty removal. */
function batRmdir(cwd, rawArg, recursive){
  const segs=batResolve(cwd, rawArg);
  const name=segs[segs.length-1], parentPath=segs.slice(0,-1);
  const parent=nodeAt(parentPath), it=parent&&parent.children&&parent.children[name];
  if(!it||!it.folder) return {err:"notdir"};
  if(!recursive && it.children && Object.keys(it.children).length) return {err:"notempty"};
  deleteAt(parentPath,name);
  return {ok:true};
}

/* ============================ DIALOG ENGINE ============================ */
function winDialog(o){
  if(/⚠|❌|🛑|🚫/.test(o.icon||"")) sfx("error");
  const d=el("div","dlg"+(o.ad?" ad":""));
  d.innerHTML=`<div class="dlg-head"><span>${esc(o.title||"WinClone")}</span><button class="x">✕</button></div>
    <div class="dlg-body"><span class="big">${o.icon||"ℹ️"}</span><div>${o.msg||""}</div></div>
    <div class="dlg-foot"></div>`;
  const foot=d.querySelector(".dlg-foot");
  (o.buttons||[{label:"OK",primary:true}]).forEach(b=>{
    const btn=el("button","dlg-btn"+(b.primary?" pri":""),b.label);
    btn.onclick=()=>{ d.remove(); if(b.action)b.action(); };
    foot.appendChild(btn);
  });
  d.querySelector(".x").onclick=()=>d.remove();
  document.body.appendChild(d);
  const W=d.offsetWidth,H=d.offsetHeight;
  d.style.left=(o.x!=null?Math.min(o.x,innerWidth-W-10):Math.max(10,(innerWidth-W)/2+(Math.random()*60-30)))+"px";
  d.style.top =(o.y!=null?Math.min(o.y,innerHeight-H-10):Math.max(10,(innerHeight-H)/2+(Math.random()*40-20)))+"px";
  d.style.zIndex=60000+(++state.z);
  return d;
}

/* ============================ SYSTEM HEALTH / BSOD ============================ */
let glitchTimer=null, bsodTimer=null;
function systemStatus(){
  const sys=nodeAt(["C:","Windows","System"]);
  if(!sys) return {missing:["C:\\Windows\\System"], damaged:true, critical:true};
  const missing=[];
  ["systemwinclone.sys","SysWIW48.dll","winclone_kernel.dll","wclogon.exe","bootmgr.wc"]
    .forEach(f=>{ if(!sys.children[f]) missing.push(f); });
  return {missing, damaged:missing.length>0, critical:missing.includes("systemwinclone.sys")};
}
function applySystemHealth(){
  const st=systemStatus();
  document.body.classList.toggle("glitch", st.damaged);
  clearInterval(glitchTimer); glitchTimer=null;
  clearTimeout(bsodTimer); bsodTimer=null;
  if(st.damaged){
    glitchTimer=setInterval(()=>{
      if(!$("#login").classList.contains("hide")) return;
      const f=st.missing[Math.floor(Math.random()*st.missing.length)];
      winDialog({icon:"❌",title:"WinClone — System Error",
        msg:`<b>${f}</b> was not found.<br>A required system component is missing and WinClone is unstable.<br><small style="color:#9a9a9a">Restore it from the Recycle Bin, or factory-reset from the BIOS (sign-in screen).</small>`});
    }, 25000);
  }
  if(st.critical && $("#login").classList.contains("hide")){
    bsodTimer=setTimeout(()=>triggerBSOD("SYSTEM_FILE_MISSING","systemwinclone.sys"), 45000+Math.random()*20000);
  }
}
function triggerBSOD(code,what){
  closeFlyouts(); $("#ctx").style.display="none"; stopAllEffectsUI();
  document.querySelectorAll(".dlg").forEach(d=>d.remove());
  const b=$("#bsod"); b.style.display="flex";
  $("#bsod-code").textContent=code; $("#bsod-what").textContent=what;
  let p=0; $("#bsod-pct").textContent="0";
  const iv=setInterval(()=>{
    p+=Math.floor(Math.random()*14)+3;
    if(p>=100){ p=100; clearInterval(iv);
      setTimeout(()=>{
        b.style.display="none";
        Object.keys(state.wins).forEach(closeWin);
        $("#login").classList.remove("hide"); lgReset();
        if(systemStatus().critical) bootRecovery();
        else applySystemHealth();
      },1300);
    }
    $("#bsod-pct").textContent=p;
  },420);
}

/* ============================ MALWARE FX (all simulated / cosmetic) ============================ */
/* EDUCATIONAL SIMULATION ONLY — none of this is real malware. Every "infection" is a
   harmless visual effect confined to this HTML page and fully reversible via Cork Defender
   or a recovery/BIOS reset. No files leave the sandbox; nothing touches the real machine. */
const MALWARE={
  scareware:{family:"Adware",    name:"Adware.Scareware", reveal:"📢", onMsg:"You installed adware. Enjoy the endless popups. Cork Defender can remove it."},
  trojan:   {family:"Trojan",    name:"Trojan.Horse",     reveal:"🐴", onMsg:"Looked legit — wasn't. This Trojan is now quietly dropping <b>more</b> malware in the background…"},
  ransomware:{family:"Ransom",   name:"Ransom.BitCork",   reveal:"🔒", onMsg:"Your files are being <b>encrypted</b>. Should've read the reviews. Cork Defender can decrypt them for free."},
  backdoor: {family:"Backdoor",  name:"Backdoor.RAT",     reveal:"🚪", onMsg:"A <b>backdoor</b> is open. Someone just connected to your PC remotely — watch the shell (bottom-left)."},
  worm:     {family:"Worm",      name:"Worm.Replika",     reveal:"🪱", onMsg:"A <b>worm</b> is loose — it's copying itself across your folders and won't stop on its own."},
  miner:    {family:"CoinMiner", name:"CoinMiner.BitCork",reveal:"⛏️", onMsg:"A <b>crypto miner</b> is now pegging your CPU to mine ₿Cork for someone else (top-right)."},
  keylogger:{family:"Spyware",   name:"Spyware.Keylog",   reveal:"⌨️", onMsg:"A <b>keylogger</b> is recording everything you type. Watch the bar at the bottom of the screen."},
  spyware:  {family:"Spyware",   name:"Spyware.PeepCam",  reveal:"👁️", onMsg:"<b>Spyware</b> just switched on your camera and mic. Say cheese."},
  joke:     {family:"Joke",      name:"Joke.SalineClone", reveal:"🤡", onMsg:"That wasn't a screensaver. Your <b>screen</b> is the toy now — it'll keep finding new ways to mess with itself and it won't stop on its own. Ctrl+Alt+X buys you a few seconds; Cork Defender actually removes it."},
};
const ADS=[
  {icon:"🎉",title:"CONGRATULATIONS!!!",msg:"You are the <b>1,000,000th</b> WinClone user! Click OK to claim your free cruise 🚢"},
  {icon:"🧠",title:"RAM Doubler PRO",msg:"Optimizing your RAM… <b>384% complete.</b> Do not turn off your computer."},
  {icon:"🔥",title:"HOT DEAL",msg:"Local singles in your Recycle Bin want to meet YOU."},
  {icon:"🦠",title:"Totally Real Antivirus",msg:"We found <b>1,432 viruses!</b> Send $500 in gift cards to remove them."},
  {icon:"🐮",title:"FREE COW CLICKER",msg:"Your cow is HUNGRY. Click now or it will be sad forever."},
  {icon:"📉",title:"FPS Booster 9000",msg:"Your FPS has been boosted to <b>-3</b>. You're welcome."},
];
const RANSOM_NOTE=`!!! YOUR FILES HAVE BEEN ENCRYPTED !!!\n\nAll your documents, pictures and downloads are now locked with Cork-256 encryption.\nTo recover them, send 0.5 BitCork to the address in the ransom window.\n\n(This is a SIMULATION for education. Run Cork Defender to decrypt everything for free.)`;
const rnd=n=>Math.floor(Math.random()*n);
const loggedIn=()=>$("#login").classList.contains("hide") && $("#recovery").style.display!=="flex" && $("#bsod").style.display!=="flex";
function infected(){ return INFECTIONS.length>0; }
function hasKind(k){ return INFECTIONS.some(i=>i.kind===k); }

/* ---- scareware popups ---- */
let adTimer=null;
function spawnAd(){
  if(!hasKind("scareware") || !loggedIn()) return;
  const a=ADS[rnd(ADS.length)];
  const again=()=>{ if(Math.random()<0.4) setTimeout(spawnAd,400); };
  winDialog({icon:a.icon,title:a.title,msg:a.msg,ad:true,
    x:40+Math.random()*Math.max(100,innerWidth-520),
    y:40+Math.random()*Math.max(80,innerHeight-340),
    buttons:[{label:"OK",primary:true,action:again},{label:"No thanks",action:again}]});
  if(Math.random()<0.35){ document.body.classList.add("flashinv"); setTimeout(()=>document.body.classList.remove("flashinv"),160); }
}

/* ---- toast helper ---- */
function malToast(icon,title,msg){
  const t=el("div","mal-toast",`<b>${icon} ${esc(title)}</b><br><span style="color:#bbb">${esc(msg)}</span>`);
  const n=document.querySelectorAll(".mal-toast").length;
  t.style.bottom=(60+n*70)+"px";
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.transition="opacity .3s"; t.style.opacity="0"; setTimeout(()=>t.remove(),320); },3400);
}

/* ---- backdoor / RAT ---- */
let bdTimer=null;
function startBackdoor(){
  if(!$("#backdoor-w")){
    const w=el("div","mal-widget"); w.id="backdoor-w";
    w.innerHTML=`<div class="bd-head">● remote shell — 45.13.${rnd(255)}.${rnd(255)} connected</div><div class="bd-log"></div>`;
    document.body.appendChild(w);
  }
  const log=$("#backdoor-w").querySelector(".bd-log");
  const lines=["root@winclone:~# whoami","user (administrator)",
    "root@winclone:~# ls ~/Documents","resume.docx  budget.xlsx  Projects/",
    "root@winclone:~# cat ~/Documents/passwords.txt","exfiltrating 4.2 KB … done",
    "root@winclone:~# enable persistence","installed to startup ✓",
    "root@winclone:~# webcam --snap","uploaded selfie.jpg → 45.13.x.x",
    "root@winclone:~# echo 'thanks for the files :)'","thanks for the files :)"];
  let i=0;
  clearTimeout(bdTimer);
  (function type(){
    if(!$("#backdoor-w")) return;
    log.querySelectorAll(".bd-cursor").forEach(c=>c.remove());
    const d=el("div"); d.innerHTML=lines[i%lines.length]+' <span class="bd-cursor"></span>';
    log.appendChild(d);
    while(log.children.length>7) log.removeChild(log.firstChild);
    i++; bdTimer=setTimeout(type, 1000+Math.random()*900);
  })();
}
function stopBackdoor(){ clearTimeout(bdTimer); bdTimer=null; const w=$("#backdoor-w"); if(w) w.remove(); }

/* ---- crypto miner ---- */
let minerTimer=null;
function startMiner(){
  if(!$("#miner-w")){
    const w=el("div","mal-widget"); w.id="miner-w";
    w.innerHTML=`<div><b>⛏️ BitCork Miner</b> — mining</div>
      <div class="cpu">CPU <span data-cpu>100</span>% &nbsp; 🌡️ <span data-temp>93</span>°C</div>
      <div class="bar"><i></i></div>
      <div class="mh">Hashrate <span data-hr>0.0</span> MH/s</div>
      <div style="color:#7cff6b">Earned ₿ <span data-earn>0.00000</span> <small style="color:#666">(for someone else)</small></div>`;
    document.body.appendChild(w);
  }
  $("#heat").style.display="block"; document.body.classList.add("laggy");
  clearInterval(minerTimer); let earn=0;
  minerTimer=setInterval(()=>{
    const w=$("#miner-w"); if(!w) return;
    earn+=0.00001+Math.random()*0.00002;
    w.querySelector("[data-hr]").textContent=(27+Math.random()*10).toFixed(1);
    w.querySelector("[data-cpu]").textContent=(97+rnd(4));
    w.querySelector("[data-temp]").textContent=(90+rnd(8));
    w.querySelector("[data-earn]").textContent=earn.toFixed(5);
  },700);
}
function stopMiner(){ clearInterval(minerTimer); minerTimer=null; const w=$("#miner-w"); if(w) w.remove(); $("#heat").style.display="none"; document.body.classList.remove("laggy"); }

/* ---- keylogger ---- */
let klBuf=[], klHandler=null;
function startKeylogger(){
  if(!$("#keylog-w")){
    const w=el("div","mal-widget"); w.id="keylog-w";
    w.innerHTML=`<b>⌨ keylogger</b> ▸ <span data-keys>listening…</span>`;
    document.body.appendChild(w);
  }
  if(!klHandler){
    klHandler=e=>{
      const box=$("#keylog-w"); if(!box) return;
      let k=e.key;
      if(k===" ") k="␣"; else if(k==="Enter") k="⏎"; else if(k==="Backspace") k="⌫"; else if(k.length>1) return;
      klBuf.push(k); if(klBuf.length>44) klBuf.shift();
      const s=box.querySelector("[data-keys]"); if(s) s.textContent=klBuf.join(" ");
    };
    document.addEventListener("keydown", klHandler, true);
  }
}
function stopKeylogger(){ if(klHandler){ document.removeEventListener("keydown",klHandler,true); klHandler=null; } klBuf=[]; const w=$("#keylog-w"); if(w) w.remove(); }

/* ---- spyware / webcam ---- */
let spyTimer=null;
function startSpyware(){
  if(!$("#spy-w")){
    const w=el("div"); w.id="spy-w";
    w.innerHTML=`<span class="dot"></span> 🔴 REC — camera &amp; microphone active`;
    document.body.appendChild(w);
  }
  clearInterval(spyTimer);
  spyTimer=setInterval(()=>{ if(loggedIn() && Math.random()<0.5) malToast("📸","Spyware","Snapshot uploaded to unknown server ("+(rnd(900)+120)+" KB)"); },16000);
}
function stopSpyware(){ clearInterval(spyTimer); spyTimer=null; const w=$("#spy-w"); if(w) w.remove(); }

/* ---- worm (self-replication) ---- */
let wormTimer=null;
function wormCount(){ let c=0; (function w(n){const k=n.children||{};Object.keys(k).forEach(x=>{if(x.startsWith("wcworm_"))c++;if(k[x].folder)w(k[x]);});})({children:VFS}); return c; }
function wormSpread(){
  if(!loggedIn() || !hasKind("worm")) return;
  if(wormCount()>=28) return;
  const folders=[[...HOME_PATH,"Documents"],[...HOME_PATH,"Downloads"],[...HOME_PATH,"Desktop"],[...HOME_PATH,"Pictures"],["C:","Windows","System"]];
  const p=folders[rnd(folders.length)], node=nodeAt(p);
  if(!node||!node.children) return;
  const nm="wcworm_"+String(Date.now()).slice(-5)+".exe";
  node.children[nm]={icon:"🪱",exe:true,malware:true,kind:"worm",runMsg:"the worm wriggles menacingly."};
  saveFS(); refreshFX();
  if(Math.random()<0.4) malToast("🪱","Worm","Replicated to "+p.join("\\"));
}

/* ---- ransomware ---- */
function ransomTargets(){ return [[...HOME_PATH,"Documents"],[...HOME_PATH,"Desktop"],[...HOME_PATH,"Pictures"],[...HOME_PATH,"Downloads"]]; }
function encryptFiles(){
  ransomTargets().forEach(p=>{
    const n=nodeAt(p); if(!n||!n.children) return;
    Object.keys(n.children).forEach(name=>{
      const it=n.children[name];
      if(it.folder||it.locked||it.malware||name.endsWith(".wcrypt")) return;
      it.origName=name; it.origIcon=it.icon||"📄"; it.locked=true; it.icon="🔒";
      n.children[name+".wcrypt"]=it; delete n.children[name];
    });
  });
  const dt=nodeAt([...HOME_PATH,"Desktop"]);
  if(dt&&dt.children) dt.children["READ_ME_TO_DECRYPT.txt"]={icon:"⚠️",content:RANSOM_NOTE,ransomNote:true};
  saveFS(); refreshFX();
}
function decryptFiles(){
  (function walk(node){
    const kids=node.children||{};
    Object.keys(kids).forEach(k=>{
      const it=kids[k];
      if(it.folder){ walk(it); return; }
      if(it.ransomNote){ delete kids[k]; return; }
      if(it.locked){
        const orig=it.origName||k.replace(/\.wcrypt$/,"");
        it.icon=it.origIcon||"📄"; delete it.locked; delete it.origName; delete it.origIcon;
        delete kids[k]; kids[orig]=it;
      }
    });
  })({children:VFS});
  saveFS(); refreshFX();
}
let ransomCd=null;
function showRansom(){
  const R=$("#ransom");
  if(R.style.display==="flex") return;
  R.style.display="flex";
  R.innerHTML=`<div class="skull">💀</div>
    <h1>Your files have been encrypted</h1>
    <div class="rmsg">All your documents, photos and downloads have been locked with <b>Cork-256</b> encryption by <b>BitCork Ransomware</b>. Pay the ransom before the timer hits zero or your files are gone forever.*
      <br><small>*This is a simulation. Cork Defender can decrypt everything for free — nothing was actually harmed.</small></div>
    <div class="rbox">
      <div>Time left until your files are destroyed:</div>
      <div class="rtimer" data-timer>71:59:59</div>
      <div>Send exactly <b>0.5 ₿Cork</b> to:</div>
      <div class="raddr">bc1q-w1nclone-f4ke-addr-n0t-real-c0rk-x9z2</div>
    </div>
    <div class="rbtns">
      <button class="rbtn pay" data-pay>I paid — decrypt my files</button>
      <button class="rbtn dec" data-def>🛡️ Decrypt with Cork Defender</button>
      <button class="rbtn x" data-x>Hide for now ✕</button>
    </div>`;
  let t=72*3600-1;
  clearInterval(ransomCd);
  ransomCd=setInterval(()=>{
    const e2=R.querySelector("[data-timer]"); if(!e2){ clearInterval(ransomCd); return; }
    t=Math.max(0,t-1);
    e2.textContent=`${String(Math.floor(t/3600)).padStart(2,"0")}:${String(Math.floor(t%3600/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
  },1000);
  R.querySelector("[data-pay]").onclick=()=>winDialog({icon:"💸",title:"Payment",msg:"Transaction failed: you have 0 ₿Cork — and even if you paid, real ransomware operators usually don't give your files back. That's the whole lesson. Use Cork Defender instead."});
  R.querySelector("[data-def]").onclick=()=>{ hideRansom(true); openApp("defender"); };
  R.querySelector("[data-x]").onclick=()=>hideRansom(true);
}
function hideRansom(temp){
  const R=$("#ransom"); R.style.display="none"; clearInterval(ransomCd); ransomCd=null;
  if(temp && hasKind("ransomware")) setTimeout(()=>{ if(hasKind("ransomware")&&loggedIn()) showRansom(); },40000);
}

/* ---- joke virus: drives the Screen FX engine ----
   Picks a couple of effects, lives with them for a bit, then picks again. The
   strobe is left out — nothing gets to inflict full-screen flashing on you
   unless you switch it on yourself in Screen FX. */
let jokeTimer=null;
function startJokeFx(){
  clearInterval(jokeTimer);
  const roll=()=>{
    if(!hasKind("joke")||!loggedIn()) return;
    sfxStopAll();
    const pool=SFX_LIST.filter(e=>e.tame);
    const n=1+rnd(2);
    for(let i=0;i<n;i++) sfxSet(pool[rnd(pool.length)].id,true);
  };
  setTimeout(roll,1200);
  jokeTimer=setInterval(roll,9000);
}
function stopJokeFx(){ clearInterval(jokeTimer); jokeTimer=null; }

/* ---- master effect controller ---- */
function refreshInfectionFX(){
  const on=loggedIn();
  clearInterval(adTimer); adTimer=null;
  if(on && hasKind("scareware")){ setTimeout(spawnAd,1400); adTimer=setInterval(spawnAd,11000); }
  (on&&hasKind("backdoor"))?startBackdoor():stopBackdoor();
  (on&&hasKind("miner"))?startMiner():stopMiner();
  (on&&hasKind("keylogger"))?startKeylogger():stopKeylogger();
  (on&&hasKind("spyware"))?startSpyware():stopSpyware();
  (on&&hasKind("joke"))?startJokeFx():stopJokeFx();
  clearInterval(wormTimer); wormTimer=null;
  if(on && hasKind("worm")) wormTimer=setInterval(wormSpread,9000);
  if(on && hasKind("ransomware")) showRansom(); else if(!hasKind("ransomware")) hideRansom(false);
}
function stopAllEffectsUI(){
  clearInterval(adTimer); adTimer=null;
  stopBackdoor(); stopMiner(); stopKeylogger(); stopSpyware();
  stopJokeFx(); sfxStopAll();
  clearInterval(wormTimer); wormTimer=null;
  hideRansom(false);
  document.querySelectorAll(".dlg.ad,.mal-toast").forEach(d=>d.remove());
}
function infect(name,kind){
  kind=kind||"scareware";
  if(!INFECTIONS.some(i=>i.name===name&&i.kind===kind)) INFECTIONS.push({name,kind});
  saveInfections();
  if(kind==="ransomware") encryptFiles();
  if(kind==="trojan"){
    setTimeout(()=>{
      if(!hasKind("trojan")) return;
      malToast("🐴","Trojan","Payload deployed — dropping more malware…");
      ["backdoor","miner","scareware"].forEach((d,i)=>setTimeout(()=>infect("trojan.payload."+d,d),i*1400));
    },3500);
  }
  refreshInfectionFX();
}
function disinfect(){
  INFECTIONS=[]; saveInfections();
  stopAllEffectsUI();
  (function walk(node){
    const kids=node.children||{};
    Object.keys(kids).forEach(k=>{ const it=kids[k];
      if(it.folder){ walk(it); return; }
      if(k.startsWith("wcworm_")||it.ransomNote){ delete kids[k]; }
    });
  })({children:VFS});
  decryptFiles();
}

/* run an exe from the filesystem */
function runFile(name,item){
  if(item.app){ openApp(item.app); return; }
  if(item.locked){ winDialog({icon:"🔒",title:name,msg:"This file is encrypted by BitCork ransomware and can't be opened. Run <b>Cork Defender</b> to decrypt it."}); return; }
  if(item.malware){
    const kind=item.kind||"scareware", meta=MALWARE[kind]||MALWARE.scareware;
    winDialog({icon:"⏳",title:name,msg:"Installing "+esc(name)+"…"});
    setTimeout(()=>{
      infect(name,kind);
      winDialog({icon:meta.reveal,title:name+" — "+meta.family,msg:meta.onMsg+`<br><small style="color:#9a9a9a">(Simulated ${kind}. Cork Defender or a recovery reset removes it.)</small>`});
    },1400);
    return;
  }
  if(item.runMsg){ winDialog({icon:item.icon||"⚙️",title:name,msg:item.runMsg}); return; }
  if(item.exe){ winDialog({icon:item.icon||"⚙️",title:name,msg:name+" ran successfully. It did absolutely nothing, beautifully."}); }
}

/* ============================ IMAGES / WALLPAPER ============================ */
function artFor(name,item){
  if(item&&item.img) return {g:`center/cover no-repeat url('${item.img}')`, e:""};
  if(item&&item.art) return item.art;
  let h=0; for(const ch of name) h=(h*31+ch.charCodeAt(0))>>>0;
  const hue=h%360, hue2=(hue+60+h%90)%360;
  const emojis=["🌄","🌅","🏞️","🌌","🌇","🗻","🌊","🌲","🏜️","🌃"];
  return {g:`linear-gradient(135deg,hsl(${hue},65%,52%),hsl(${hue2},70%,30%))`,e:emojis[h%emojis.length]};
}
function allImages(){
  const out=[];
  (function walk(node,path){
    const kids=node.children||{};
    Object.keys(kids).forEach(k=>{
      const it=kids[k];
      if(it.folder) walk(it,[...path,k]);
      else if(/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(k)) out.push({name:k,path:[...path],item:it});
    });
  })({children:VFS},[]);
  return out;
}
const WALLPAPERS=[
  {n:"Aurora Night",  g:"linear-gradient(160deg,#0b1026 0%,#16305c 40%,#2b8c67 75%,#7fe3a0 100%)"},
  {n:"Sunset Dunes",  g:"linear-gradient(160deg,#2d1b4e,#b34a67 55%,#ff9d5c)"},
  {n:"Deep Ocean",    g:"radial-gradient(120% 120% at 50% 20%,#0b3c5d,#03151f 80%)"},
  {n:"Cotton Candy",  g:"linear-gradient(135deg,#89f7fe,#f6a6ff)"},
  {n:"Lava Flow",     g:"linear-gradient(150deg,#1a0000,#7a1010 55%,#ff7a18)"},
  {n:"Hacker Green",  g:"linear-gradient(180deg,#001800,#003300 60%,#00aa44)"},
  {n:"Winter Peak",   g:"linear-gradient(160deg,#c9dff2,#7fa8cc 50%,#40608c)"},
  {n:"Void Purple",   g:"radial-gradient(100% 100% at 50% 30%,#3c1361,#0d0221 80%)"},
];
function applyWallpaper(css){
  const d=$("#desktop");
  d.style.background=""; d.style.backgroundImage="";
  d.classList.toggle("custom-wall", !!css);   // hides the Hero logo on custom wallpapers
  if(!css) return;
  if(/url\(/.test(css)) d.style.background=css+", #05070d";  // real image (cover shorthand)
  else d.style.backgroundImage=css;                          // gradient
}
function setWallpaper(css){ applyWallpaper(css); try{ localStorage.setItem("wc_wall",css); }catch(e){} }
function clearWallpaper(){ applyWallpaper(""); localStorage.removeItem("wc_wall"); }

/* ---- import real images from the user's computer ---- */
function loadScaledDataURL(file,maxDim,cb){
  const r=new FileReader();
  r.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      const scale=Math.min(1, maxDim/Math.max(w,h));
      w=Math.max(1,Math.round(w*scale)); h=Math.max(1,Math.round(h*scale));
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      try{ cb(c.toDataURL("image/jpeg",0.85)); }catch(e){ cb(null); }
    };
    img.onerror=()=>cb(null);
    img.src=r.result;
  };
  r.onerror=()=>cb(null);
  r.readAsDataURL(file);
}
function importImages(targetPath,done){
  const inp=$("#fileimport"); if(!inp) return;
  inp.value="";
  inp.onchange=()=>{
    const files=[...inp.files]; if(!files.length) return;
    let pending=files.length, added=0;
    files.forEach(f=>{
      loadScaledDataURL(f,1920,data=>{
        if(data){
          const node=nodeAt(targetPath);
          if(node&&node.children){
            let nm=(f.name||"image").replace(/[\\/:*?"<>|]/g,"_");
            if(!/\.(png|jpe?g|gif|bmp|webp)$/i.test(nm)) nm+=".jpg";
            node.children[uniqueName(node,nm)]={icon:"🖼️",img:data};
            added++;
          }
        }
        if(--pending===0){
          saveFS(); refreshFX();
          if(added) malInfo("🖼️","Imported",added+" image(s) added to "+targetPath[targetPath.length-1]);
          else winDialog({icon:"⚠️",title:"Import",msg:"Couldn't import those files. Storage may be full — try smaller or fewer images."});
          if(done) done();
        }
      });
    });
  };
  inp.click();
}

/* ============================ IMPORT / EXPORT ============================ */
/* Bridge between the user's real computer and WinClone's virtual filesystem. */
const IE_TEXT_EXTS=["txt","html","htm","rtf","csv","ini","md","json","log","bat","py","js","css","xml","yml","yaml","cfg","conf"];
const IE_ACCEPT=".txt,.html,.htm,.docx,.wcdocs,.rtf,.csv,.ini,.md,.json,.log,.bat,.py,.js,.css,.xml,.yml,.yaml,.cfg,.conf,.bmp,.zip,.rar";

/* --- byte / base64 helpers --- */
function ieB64(bytes){ let s="",CH=0x8000; for(let i=0;i<bytes.length;i+=CH) s+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH)); return btoa(s); }
function ieUnB64(b64){ const s=atob(b64),a=new Uint8Array(s.length); for(let i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a; }
function ieDataURLBytes(u){ return ieUnB64(u.slice(u.indexOf(",")+1)); }
function ieFileDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(file); }); }
function ieDownload(blob,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }

/* --- minimal ZIP writer (STORED / no compression — reads fine in Word, Explorer, etc.) --- */
const IE_CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function ieCrc32(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=IE_CRC[(c^b[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function ieBuildZip(files){
  const enc=new TextEncoder(), u16=n=>[n&255,(n>>8)&255], u32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255];
  const parts=[], central=[]; let off=0;
  files.forEach(f=>{
    const nb=enc.encode(f.name), d=f.bytes, crc=ieCrc32(d);
    const lh=[].concat(u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(d.length),u32(d.length),u16(nb.length),u16(0));
    parts.push(new Uint8Array(lh),nb,d);
    central.push({nb,crc,size:d.length,off}); off+=30+nb.length+d.length;
  });
  const cdStart=off, cd=[];
  central.forEach(c=>{ const r=[].concat(u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(c.crc),u32(c.size),u32(c.size),u16(c.nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(c.off)); cd.push(new Uint8Array(r),c.nb); });
  let cdLen=0; cd.forEach(c=>cdLen+=c.length);
  const eocd=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(cdLen),u32(cdStart),u16(0)));
  return new Blob([...parts,...cd,eocd],{type:"application/zip"});
}

/* --- ZIP reader (STORED + DEFLATE via the browser's DecompressionStream) --- */
async function ieInflate(bytes){
  const ds=new DecompressionStream("deflate-raw");
  const buf=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}
async function ieReadZip(bytes){
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let p=-1; for(let i=bytes.length-22;i>=0;i--){ if(dv.getUint32(i,true)===0x06054b50){ p=i; break; } }
  if(p<0) throw new Error("not a zip");
  const count=dv.getUint16(p+10,true); let o=dv.getUint32(p+16,true);
  const out={};
  for(let n=0;n<count;n++){
    if(dv.getUint32(o,true)!==0x02014b50) break;
    const method=dv.getUint16(o+10,true), comp=dv.getUint32(o+20,true);
    const nl=dv.getUint16(o+28,true), el=dv.getUint16(o+30,true), cl=dv.getUint16(o+32,true), lho=dv.getUint32(o+42,true);
    const nm=new TextDecoder().decode(bytes.subarray(o+46,o+46+nl));
    const lnl=dv.getUint16(lho+26,true), lel=dv.getUint16(lho+28,true), dstart=lho+30+lnl+lel;
    const cbytes=bytes.subarray(dstart,dstart+comp);
    if(!nm.endsWith("/")){
      if(method===0) out[nm]=cbytes;
      else if(method===8){ try{ out[nm]=await ieInflate(cbytes); }catch(e){} }
    }
    o+=46+nl+el+cl;
  }
  return out;
}

/* --- .wcdocs custom format:  line 1 = magic "WCDOCS/1",  rest = JSON {title,html,text} --- */
function wcdocsSerialize(item){ return "WCDOCS/1\n"+JSON.stringify({title:item.title||"", html:item.html||"", text:item.content||""}); }
function wcdocsParse(text){
  if(/^WCDOCS\/1\r?\n/.test(text)){ try{ const o=JSON.parse(text.slice(text.indexOf("\n")+1)); return {icon:"📘",doc:true,html:o.html||docTextToHtml(o.text||""),content:o.text||""}; }catch(e){} }
  return {icon:"📘",doc:true,html:docTextToHtml(text),content:text};
}

/* --- .docx (Office Open XML) read/write --- */
function ieXmlDecode(s){ return s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&"); }
function ieXmlEnc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
async function ieDocxToDoc(bytes){
  const files=await ieReadZip(bytes), xb=files["word/document.xml"];
  if(!xb) throw new Error("no document.xml");
  const xml=new TextDecoder().decode(xb);
  const paras=xml.split(/<w:p[ >\/]/).slice(1).map(seg=>ieXmlDecode([...seg.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join("")));
  return { html: paras.map(p=>"<p>"+(p?esc(p):"<br>")+"</p>").join("")||"<p><br></p>", text: paras.join("\n") };
}
function ieDocToDocx(paras){
  const enc=new TextEncoder();
  const body=paras.map(p=>`<w:p><w:r><w:t xml:space="preserve">${ieXmlEnc(p)}</w:t></w:r></w:p>`).join("")||"<w:p/>";
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return ieBuildZip([
    {name:"[Content_Types].xml",bytes:enc.encode(ct)},
    {name:"_rels/.rels",bytes:enc.encode(rels)},
    {name:"word/document.xml",bytes:enc.encode(doc)},
  ]);
}

/* --- IMPORT --- */
function importFilesTo(destPath,done){
  const inp=document.createElement("input"); inp.type="file"; inp.multiple=true; inp.accept=IE_ACCEPT;
  inp.onchange=async()=>{
    const files=[...(inp.files||[])]; if(!files.length) return;
    const dest=nodeAt(destPath); if(!dest||!dest.children){ winDialog({icon:"⚠️",title:"Import",msg:"That folder can't be found."}); return; }
    let ok=0, fail=0;
    for(const f of files){ try{ await ieImportOne(dest,f); ok++; }catch(e){ fail++; } }
    try{ saveFS(); }catch(e){}
    refreshFX();
    winDialog({icon:"📥",title:"Import",msg:`${ok} file(s) imported to <b>${esc(destPath[destPath.length-1])}</b>.${fail?`<br><small style="color:#9a9a9a">${fail} couldn't be read.</small>`:""}`});
    if(done) done();
  };
  inp.click();
}
async function ieImportOne(dest,file){
  const name=uniqueName(dest,(file.name||"file").replace(/[\\/:*?"<>|]/g,"_"));
  const ext=extOf(name); let item;
  if(IE_TEXT_EXTS.includes(ext)){ item={icon:glyphFor(name,{}),content:await file.text()}; }
  else if(ext==="wcdocs"){ item=wcdocsParse(await file.text()); }
  else if(ext==="docx"){
    try{ const d=await ieDocxToDoc(new Uint8Array(await file.arrayBuffer())); item={icon:"📘",doc:true,html:d.html,content:d.text}; }
    catch(e){ item={icon:"📘",doc:true,html:"<p>[Imported Word document — its text couldn't be read.]</p>",content:""}; }
  }
  else if(ext==="bmp"){ item={icon:"🖼️",img:await ieFileDataURL(file)}; }
  else if(ext==="zip"||ext==="rar"){
    const bytes=new Uint8Array(await file.arrayBuffer());
    item={icon:"🗜️",archive:true,raw:ieB64(bytes),mime:file.type||(ext==="zip"?"application/zip":"application/x-rar-compressed"),children:{}};
    if(ext==="zip"){ try{
      const map=await ieReadZip(bytes), kids={};
      Object.keys(map).forEach(k=>{ const bn=uniqueName({children:kids},k.split("/").pop()||"file"), e2=extOf(bn);
        kids[bn]= IE_TEXT_EXTS.includes(e2) ? {icon:glyphFor(bn,{}),content:new TextDecoder().decode(map[k])}
                : /^(png|jpe?g|gif|bmp|webp)$/.test(e2) ? {icon:"🖼️",img:"data:image/"+(e2==="jpg"?"jpeg":e2)+";base64,"+ieB64(map[k])}
                : {icon:glyphFor(bn,{}),raw:ieB64(map[k]),mime:"application/octet-stream"};
      });
      item.children=kids;
    }catch(e){} }
  }
  else { item={icon:glyphFor(name,{}),content:await file.text()}; }
  dest.children[name]=item;
}

/* --- EXPORT (download the selected WinClone file to the real computer) --- */
function ieFileBytes(name,item){
  const enc=new TextEncoder();
  if(item.raw) return ieUnB64(item.raw);
  if(item.img){ try{ return ieDataURLBytes((item.img.match(/data:[^)'"]+/)||[item.img])[0]); }catch(e){ return new Uint8Array(); } }
  if(item.doc) return enc.encode(wcdocsSerialize(item));
  return enc.encode(item.content||"");
}
function exportFile(path,name,item){
  try{
    const ext=extOf(name); let blob, out=name;
    if(item.folder && !item.archive){
      const files=[]; (function walk(node,pre){ Object.keys(node.children||{}).forEach(k=>{ const it=node.children[k]; if(it.folder&&!it.archive) walk(it,pre+k+"/"); else files.push({name:pre+k,bytes:ieFileBytes(k,it)}); }); })(item,"");
      blob=ieBuildZip(files); out=name+".zip";
    }
    else if(ext==="wcdocs") blob=new Blob([wcdocsSerialize(item)],{type:"application/octet-stream"});
    else if(ext==="docx") blob=ieDocToDocx((item.content||"").split(/\r?\n/));
    else if(item.raw) blob=new Blob([ieUnB64(item.raw)],{type:item.mime||"application/octet-stream"});
    else if(item.img){ const u=(item.img.match(/data:[^)'"]+/)||[item.img])[0]; blob=new Blob([ieDataURLBytes(u)],{type:(u.match(/data:([^;]+)/)||[])[1]||"image/png"}); if(!/\.[a-z0-9]+$/i.test(out)) out+=".png"; }
    else if(item.archive){ const files=[]; Object.keys(item.children||{}).forEach(k=>{ const it=item.children[k]; if(!it.folder) files.push({name:k,bytes:ieFileBytes(k,it)}); }); blob=ieBuildZip(files); if(!/\.(zip|rar)$/i.test(out)) out+=".zip"; }
    else blob=new Blob([item.content||""],{type:"text/plain"});
    ieDownload(blob,out);
    malInfo("📤","Exported","Saved "+out+" to your computer");
  }catch(e){ winDialog({icon:"⚠️",title:"Export failed",msg:"Couldn't export <b>"+esc(name)+"</b>."}); }
}

function buildExplorer(body){
  body.innerHTML=`<div class="fx">
    <div class="fx-side">
      <div class="grp">Quick access</div>
      <div class="item act" data-nav="home"><span>🏠</span> Home</div>
      <div class="item" data-nav="Desktop"><span>🖥️</span> Desktop</div>
      <div class="item" data-nav="Downloads"><span>⬇️</span> Downloads</div>
      <div class="item" data-nav="Documents"><span>📄</span> Documents</div>
      <div class="item" data-nav="Pictures"><span>🖼️</span> Pictures</div>
      <div class="grp">This PC</div>
      <div class="item" data-nav="cdrive"><span>💽</span> Local Disk (C:)</div>
      <div class="item" data-nav="system"><span>🧩</span> Windows › System</div>
    </div>
    <div class="fx-main">
      <div class="fx-bar">
        <button class="edge-nav" data-b="back">←</button>
        <button class="edge-nav" data-b="up">↑</button>
        <div class="fx-crumb">Home</div>
      </div>
      <div class="fx-grid"></div>
    </div></div>`;
  const grid=body.querySelector(".fx-grid"), crumb=body.querySelector(".fx-crumb");
  let path = EXP_PENDING ? EXP_PENDING : [...HOME_PATH];
  EXP_PENDING=null;
  function render(){
    if(!grid.isConnected) return;
    grid.innerHTML="";
    const node=nodeAt(path);
    if(!node){ path=[...HOME_PATH]; }
    crumb.textContent="This PC › "+path.join(" › ");
    const kids=(nodeAt(path)||{}).children||{};
    if(Object.keys(kids).length===0){ grid.innerHTML=`<div style="color:#888;padding:20px">This folder is empty. Right-click to create something.</div>`; return; }
    Object.keys(kids).forEach(name=>{
      const item=kids[name];
      const t=el("div","fx-tile"+(isLnk(name,item)?" is-lnk":""));
      t.innerHTML=`<span class="gl">${glyphFor(name,item)}</span><span class="nm">${esc(name)}</span>`;
      t.onclick=e=>{ e.stopPropagation(); grid.querySelectorAll(".sel").forEach(x=>x.classList.remove("sel")); t.classList.add("sel"); };
      t.ondblclick=()=>openItem(name,item);
      t.oncontextmenu=e=>{ e.preventDefault(); e.stopPropagation();
        fsItemMenu(e.clientX,e.clientY,[...path],name,item,{del:()=>tryDelete(name,item)});
      };
      makeDragSource(t,path,name,item);
      if(item.folder) makeDropTarget(t,()=>[...path,name]);
      grid.appendChild(t);
    });
  }
  function openItem(name,item){
    if(item.archive || !item.folder){ fsOpen([...path],name,item); return; }
    if(item.locked){ winDialog({icon:"🔒",title:name,msg:"This file is encrypted by BitCork ransomware."}); return; }
    path=[...path,name]; render(); // folders navigate in-window
  }
  EXP.goto=p=>{ path=[...p]; render(); };
  function tryDelete(name,item){
    const p=[...path];
    if(item.critical){
      winDialog({icon:"🛑",title:"Delete protected system file?",
        msg:`<b>${esc(name)}</b> is REQUIRED for WinClone to run.<br>Deleting it <b>will destroy this installation.</b> Are you absolutely sure?`,
        buttons:[{label:"Delete anyway",action:()=>doDelete(p,name,true)},{label:"Cancel",primary:true}]});
    } else if(item.sys){
      winDialog({icon:"⚠️",title:"Delete protected system file?",
        msg:`You need permission from TrustedInstaller… just kidding, you're the admin.<br><b>${esc(name)}</b> is a system file — WinClone may become unstable.`,
        buttons:[{label:"Delete",action:()=>doDelete(p,name,false)},{label:"Cancel",primary:true}]});
    } else {
      winDialog({icon:"🗑️",title:"Delete file",
        msg:`Are you sure you want to move <b>${esc(name)}</b> to the Recycle Bin?`,
        buttons:[{label:"Yes",primary:true,action:()=>doDelete(p,name,false)},{label:"No"}]});
    }
  }
  function doDelete(p,name,critical){
    deleteAt(p,name);
    if(critical){
      setTimeout(()=>winDialog({icon:"❌",title:"wclogon.exe — Application Error",msg:"The instruction at 0x00007FFA referenced memory at 0x00000000. The memory could not be read."}),900);
      setTimeout(()=>winDialog({icon:"❌",title:"explorer.exe",msg:"A critical system process has stopped unexpectedly."}),2000);
      setTimeout(()=>triggerBSOD("SYSTEM_FILE_MISSING","systemwinclone.sys"),3800);
    }
  }
  grid.oncontextmenu=e=>{
    if(e.target.closest(".fx-tile")) return;
    e.preventDefault(); e.stopPropagation();
    const menu=[{icon:"📄",label:"New", arrow:true, action:()=>newMenu(e.clientX,e.clientY,[...path])}];
    if(CLIP) menu.push({icon:"📋",label:"Paste",action:()=>clipPaste([...path])});
    menu.push({icon:"📥",label:"Import image from computer…",action:()=>importImages([...path])});
    menu.push({icon:"📎",label:"Import files from computer…",action:()=>importFilesTo([...path])});
    menu.push("sep",{icon:"🔄",label:"Refresh",action:render});
    showCtx(e.clientX,e.clientY,menu);
  };
  const navPath=nav=> nav==="home"?[...HOME_PATH] : nav==="cdrive"?["C:"] : nav==="system"?["C:","Windows","System"] : [...HOME_PATH,nav];
  body.querySelectorAll(".fx-side .item").forEach(it=>{
    it.onclick=()=>{
      body.querySelectorAll(".fx-side .item").forEach(x=>x.classList.remove("act"));
      it.classList.add("act");
      path=navPath(it.dataset.nav); render();
    };
    makeDropTarget(it,()=>navPath(it.dataset.nav));
  });
  // drop onto empty grid = move into the current folder
  grid.addEventListener("dragover",e=>{ if(DRAG){ e.preventDefault(); } });
  grid.addEventListener("drop",e=>{ if(!DRAG) return; if(e.target.closest(".fx-tile")) return; e.preventDefault(); e.stopPropagation(); moveItem(DRAG.path,DRAG.name,[...path]); });
  body.querySelector('[data-b="up"]').onclick=()=>{ if(path.length>1){ path=path.slice(0,-1); render(); } };
  body.querySelector('[data-b="back"]').onclick=()=>{ if(path.length>1){ path=path.slice(0,-1); render(); } };
  fxRefreshers.push(render);
  render();
}

let SETTINGS_PENDING=null;
const SETTINGS_ACCENTS=[["#4cc2ff","#0067c0"],["#5cd68a","#107c41"],["#ff8c42","#c4501a"],["#c58af9","#8a3ffc"],["#ff6b81","#c42b4a"],["#ffd166","#c79100"],["#38bdf8","#0284c7"],["#f472b6","#be185d"],["#818cf8","#4338ca"],["#a3a3a3","#525252"]];
const SETTINGS_SOLIDS=["#0f172a","#1e293b","#312e81","#4c1d95","#7f1d1d","#064e3b","#134e4a","#3f3f46"];
function pickWallpaperPhoto(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return;
    loadScaledDataURL(f,1920,url=>{ if(url) setWallpaper(`center/cover no-repeat url('${url}')`); else winDialog({icon:"⚠️",title:"Background",msg:"Couldn't load that image."}); }); };
  inp.click();
}
function buildSettings(body){
  const curAccent=(localStorage.getItem("wc_accent")||"|").split("|")[0]||"#4cc2ff";
  const curWall=localStorage.getItem("wc_wall")||"";
  const isDark=()=>$("#desktop").classList.contains("dark");
  const sw=([a,s])=>`<div class="sw big${a===curAccent?" sel":""}" style="background:${a}" data-a="${a}|${s}"></div>`;
  const solidCss=c=>`linear-gradient(${c},${c})`;
  const wc=(g,label)=>`<div class="wp-swatch${curWall===g?" sel":""}" style="background:${g}" data-wall="${esc(g)}"><span class="wl">${esc(label)}</span></div>`;
  const pages = {
    system:`<h2>System</h2>
      <div class="st-card"><div class="l"><span class="gl">🎨</span><div class="t"><b>Dark mode</b><small>Change the desktop color scheme</small></div></div><div class="toggle ${isDark()?'on':''}" data-t="theme"></div></div>
      <div class="st-card"><div class="l"><span class="gl">💾</span><div class="t"><b>Storage</b><small>Local Disk (C:) — 214 GB of 512 GB used</small></div></div></div>
      <div class="st-card"><div class="l"><span class="gl">🔔</span><div class="t"><b>Notifications</b><small>Notify me from apps and the system</small></div></div><div class="toggle on"></div></div>
      <div class="st-card"><div class="l"><span class="gl">🔋</span><div class="t"><b>Power &amp; battery</b><small>Balanced — screen off after 10 min</small></div></div></div>`,
    personal:`<h2>Personalization</h2>
      <div class="st-card"><div class="l"><span class="gl">🌗</span><div class="t"><b>Dark mode</b><small>Light or dark desktop</small></div></div><div class="toggle ${isDark()?'on':''}" data-t="theme"></div></div>
      <div class="st-card"><div class="l"><span class="gl">🖥️</span><div class="t"><b>Screen saver</b><small>Bouncing logo after 1 minute idle</small></div></div><div class="toggle ${localStorage.getItem('wc_screensaver')!=='off'?'on':''}" data-t="ss"></div></div>
      <div class="st-card" style="flex-direction:column;align-items:stretch;gap:12px">
        <div class="l"><span class="gl">🎯</span><div class="t"><b>Accent color</b><small>Highlights, buttons and the taskbar</small></div></div>
        <div class="swatches" style="flex-wrap:wrap">${SETTINGS_ACCENTS.map(sw).join("")}</div>
      </div>
      <div class="st-card" style="flex-direction:column;align-items:stretch;gap:12px">
        <div class="l"><span class="gl">🖼️</span><div class="t"><b>Background</b><small>Pick a wallpaper, a solid color, or a photo</small></div></div>
        <div class="wp-pick">
          ${WALLPAPERS.map(w=>wc(w.g,w.n)).join("")}
          ${SETTINGS_SOLIDS.map(c=>wc(solidCss(c),"Solid")).join("")}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="st-btn" data-wdefault>Use default bloom</button>
          <button class="st-btn" data-wimport>Choose a photo…</button>
        </div>
      </div>`,
    accounts:`<h2>Accounts</h2>
      <div class="st-card" style="flex-direction:column;align-items:stretch;gap:14px">
        <div class="acct-hero"><div class="acct-av" data-avatar>${esc(userInitial())}</div>
          <div><b style="font-size:15px" data-uname>${esc(getUser())}</b><br><small style="color:#9a9a9a" data-umail>${esc(userEmail())}</small></div></div>
        <div class="t"><b>Your name</b><small style="color:#9a9a9a;display:block;margin-top:2px">Shown on the sign-in screen, the Start menu and here.</small></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input class="st-input" data-uinput maxlength="24" value="${esc(getUser())}" placeholder="Enter a username" spellcheck="false">
          <button class="st-btn pri" data-usave>Save</button>
        </div>
        <small style="color:#7d7d7d">Stored only in this browser. Leave blank to reset to “User”.</small>
      </div>`,
    about:`<h2>About</h2>
      <div class="st-card" style="flex-direction:column;align-items:flex-start;gap:6px">
        <div style="font-size:15px"><b>WINCLONE-PC</b></div>
        <div style="color:#9a9a9a;font-size:12.5px;line-height:1.9">
          Device name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WINCLONE-PC<br>
          Processor&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WinClone Core i9 @ 3.60 GHz<br>
          Installed RAM&nbsp;&nbsp;&nbsp;32.0 GB<br>
          System type&nbsp;&nbsp;&nbsp;&nbsp;64-bit OS, x64-based processor<br>
          Edition&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WinClone 12 Pro<br>
          Version&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;24H2 &nbsp; Build 26100
        </div>
      </div>
      <div class="st-card"><div class="l"><span class="gl">✅</span><div class="t"><b>Windows is activated</b><small>with a digital license</small></div></div></div>
      <div class="st-card" style="flex-direction:column;align-items:flex-start;gap:6px;border-color:#f7a233">
        <div style="font-size:15px"><b style="color:#f7a233">FANMADE / CONCEPT</b></div>
        <div style="color:#9a9a9a;font-size:12.5px;line-height:1.75">
          WinClone is a <b style="color:#eaeaea">fan-made concept project</b> by
          <b style="color:#eaeaea">thisisuhhplanetring</b> — a hobby tribute to desktop operating
          systems, written from scratch for fun and for learning.<br><br>
          It is <b style="color:#eaeaea">not</b> a real operating system, and
          <b style="color:#eaeaea">not</b> Microsoft Windows. It contains no Microsoft
          code, artwork or assets. It is not affiliated with, endorsed by, sponsored by
          or connected to Microsoft Corporation, and it is free and never sold.
          "Windows" and "Microsoft" are trademarks of their respective owners.
        </div>
      </div>
      <div class="st-card" style="flex-direction:column;align-items:flex-start;gap:6px">
        <div style="font-size:15px"><b>©</b> Copyright and licence</div>
        <div style="color:#9a9a9a;font-size:12.5px;line-height:1.75">
          © 2026 thisisuhhplanetring. All rights reserved.<br><br>
          You may run it, read the source, modify your own private copy, and fork it
          on GitHub. Rehosting it as a site of your own, stripping the attribution,
          passing it off as your work or selling it is prohibited. Full terms are in
          <b style="color:#eaeaea">LICENSE.txt</b>, or type
          <b style="color:#eaeaea">license</b> in the Terminal.
        </div>
      </div>`,
    bt:`<h2>Bluetooth & devices</h2>
      <div class="st-card"><div class="l"><span class="gl">🖱️</span><div class="t"><b>Mouse</b><small>WinClone Precision Mouse</small></div></div><small style="color:#5cd68a">Connected</small></div>
      <div class="st-card"><div class="l"><span class="gl">⌨️</span><div class="t"><b>Keyboard</b><small>WinClone Keys</small></div></div><small style="color:#5cd68a">Connected</small></div>
      <div class="st-card"><div class="l"><span class="gl">🎧</span><div class="t"><b>Headphones</b><small>WinBuds Pro</small></div></div><small style="color:#9a9a9a">Not paired</small></div>`,
    net:`<h2>Network & internet</h2>
      <div class="st-card"><div class="l"><span class="gl">📶</span><div class="t"><b>Wi-Fi — HOME-5G</b><small>Connected, secured</small></div></div><div class="toggle on"></div></div>
      <div class="st-card"><div class="l"><span class="gl">✈️</span><div class="t"><b>Airplane mode</b><small>Stop wireless communication</small></div></div><div class="toggle"></div></div>`,
  };
  const NAV=[["system","🖥️","System"],["personal","🎨","Personalization"],["accounts","👤","Accounts"],["bt","🔵","Bluetooth &amp; devices"],["net","🌐","Network &amp; internet"],["about","ℹ️","About"]];
  const start=(SETTINGS_PENDING&&pages[SETTINGS_PENDING])?SETTINGS_PENDING:"system"; SETTINGS_PENDING=null;
  body.innerHTML=`<div class="settings">
    <div class="st-side">
      <div class="st-user"><div class="avatar" data-avatar>${esc(userInitial())}</div><div><b style="font-size:13px" data-uname>${esc(getUser())}</b><br><small style="color:#9a9a9a;font-size:11px" data-umail>${esc(userEmail())}</small></div></div>
      ${NAV.map(([p,ic,lbl])=>`<div class="st-nav${p===start?' act':''}" style="position:relative" data-p="${p}"><span class="gl">${ic}</span> ${lbl}</div>`).join("")}
    </div>
    <div class="st-main">${pages[start]}</div>
  </div>`;
  const main=body.querySelector(".st-main");
  function refreshUser(){
    const n=getUser(), i=userInitial(), m=userEmail();
    body.querySelectorAll("[data-uname]").forEach(e=>e.textContent=n);
    body.querySelectorAll("[data-umail]").forEach(e=>e.textContent=m);
    body.querySelectorAll("[data-avatar]").forEach(e=>e.textContent=i);
  }
  function wire(){
    main.querySelectorAll("[data-t='theme']").forEach(t=>t.onclick=()=>{ t.classList.toggle("on"); setTheme(t.classList.contains("on")); });
    main.querySelectorAll("[data-t='ss']").forEach(t=>t.onclick=()=>{ t.classList.toggle("on"); const on=t.classList.contains("on"); try{ localStorage.setItem("wc_screensaver",on?"on":"off"); }catch(e){} if(on) ssArm(); else { clearTimeout(ssTimer); if(ssActive) ssStop(); } });
    main.querySelectorAll("[data-a]").forEach(s=>s.onclick=()=>{
      main.querySelectorAll("[data-a]").forEach(x=>x.classList.remove("sel")); s.classList.add("sel");
      const [a,solid]=s.dataset.a.split("|"); setAccent(a,solid);
    });
    main.querySelectorAll("[data-wall]").forEach(w=>w.onclick=()=>{
      main.querySelectorAll("[data-wall]").forEach(x=>x.classList.remove("sel")); w.classList.add("sel");
      setWallpaper(w.dataset.wall);
    });
    const wd=main.querySelector("[data-wdefault]"); if(wd) wd.onclick=()=>{ clearWallpaper(); main.querySelectorAll("[data-wall]").forEach(x=>x.classList.remove("sel")); };
    const wi=main.querySelector("[data-wimport]"); if(wi) wi.onclick=pickWallpaperPhoto;
    const us=main.querySelector("[data-usave]"); if(us) us.onclick=()=>{
      const inp=main.querySelector("[data-uinput]"); setUser(inp?inp.value:""); refreshUser();
      if(inp) inp.value=getUser();
      winDialog({icon:"👤",title:"Accounts",msg:`Hi, <b>${esc(getUser())}</b> 👋 &nbsp;Your name has been updated.`});
    };
    const ui=main.querySelector("[data-uinput]"); if(ui) ui.addEventListener("keydown",e=>{ if(e.key==="Enter"){ const b=main.querySelector("[data-usave]"); if(b) b.click(); } });
  }
  wire();
  body.querySelectorAll(".st-nav").forEach(n=>n.onclick=()=>{
    body.querySelectorAll(".st-nav").forEach(x=>x.classList.remove("act")); n.classList.add("act");
    main.innerHTML=pages[n.dataset.p]; wire();
  });
}
function setTheme(dark){
  const d=$("#desktop");
  d.classList.toggle("dark",dark); d.classList.toggle("light",!dark);
  try{ localStorage.setItem("wc_theme",dark?"dark":"light"); }catch(e){}
}

const STORE_APPS=[
  {file:"PixelCrab.exe",      icon:"🦀", name:"PixelCrab Deluxe",       desc:"An adorable desktop crab. 5★ — 2.1M downloads", runMsg:"🦀 clack clack. PixelCrab says hi!"},
  {file:"WinTunes.exe",       icon:"🎵", name:"WinTunes Music",          desc:"Play all 1 of your songs. 4★ — 800K downloads", runMsg:"🎵 Now playing: song.mp3 (in your imagination)."},
  {file:"CoolWallpapers.exe", icon:"🖼️", name:"Cool Wallpapers HD",     desc:"Wallpapers so cool they're already on your PC. 4★", runMsg:"🖼️ Wallpaper applied! (it was the same one)"},
  {file:"RAM_Doubler_PRO.exe",   icon:"🧠", name:"RAM Doubler PRO",       desc:"D0ubles your RAM!!! 100% legit. ⭐ — 3 downloads", malware:true, kind:"scareware"},
  {file:"FPS_Booster9000.exe",   icon:"🚀", name:"FPS Booster 9000",      desc:"+9000 FPS instantly!! not a scam!! trust!!", malware:true, kind:"scareware"},
  {file:"free_robux_gen.exe",    icon:"😈", name:"free_robux_generator",  desc:"FREE ROBUX working 2026 no survey no scam", malware:true, kind:"trojan"},
  {file:"WinClone_Activator.exe",icon:"🔑", name:"WinClone Activator KMS",desc:"Activate Pro for FREE. crack by xXx_h4x", malware:true, kind:"backdoor"},
  {file:"CryptoTab_Turbo.exe",   icon:"💰", name:"CryptoTab Turbo",       desc:"Earn $500/day mining while you sleep 💸", malware:true, kind:"miner"},
  {file:"PhotoViewer_Pro.exe",   icon:"🖼️", name:"Photo Viewer Pro",     desc:"Nicer than the built-in viewer. Trusted★★★★", malware:true, kind:"ransomware"},
  {file:"Minecraft_1.20_FULL.exe",icon:"🟩",name:"Minecraft FREE (full)", desc:"Full version, no login needed!! working", malware:true, kind:"worm"},
  {file:"SystemCleaner_Pro.exe", icon:"🧹", name:"System Cleaner Pro",    desc:"Speed up your PC by 300%! free download", malware:true, kind:"spyware"},
  {file:"3D_ScreenSaver_FREE.scr",icon:"🌀", name:"3D Screensavers FREE", desc:"1000+ amazing 3D screensavers, no virus!!", malware:true, kind:"joke"},
];
/* Curated frame-friendly bookmarks. Real sites that allow being embedded. */
const EDGE_BOOKMARKS=[
  {name:"Web Demon List", url:"https://webdemonlist.org",      icon:"👹"},
  {name:"Web Dashers",    url:"https://web-dashers.github.io", icon:"🏃"},
  {name:"Wikipedia",      url:"https://en.wikipedia.org",      icon:"📚"},
  {name:"example.com",    url:"https://example.com",           icon:"🌐"},
];
/* extensions the "browser" treats as a download rather than a page to render */
const EDGE_DL_RE=/\.(png|jpe?g|gif|bmp|webp|svg|mp4|webm|mkv|avi|mov|m4v|mp3|wav|exe|msi|zip|rar|7z|iso|dmg|apk|pdf|docx?|xlsx?|pptx?|txt|csv|bin|scr|bat|dll)$/i;
/* Big sites that forbid being embedded (X-Frame-Options / frame-ancestors). A framed page
   and a browser-blocked page are indistinguishable to script, so we can't detect the refusal
   after the fact — we recognise the usual suspects up front and show the rejection screen. */
const EDGE_BLOCKED=["google.com","facebook.com","fb.com","instagram.com","twitter.com","x.com",
  "reddit.com","amazon.com","netflix.com","linkedin.com","github.com","gitlab.com","microsoft.com",
  "live.com","office.com","bing.com","apple.com","icloud.com","tiktok.com","whatsapp.com","yahoo.com",
  "duckduckgo.com","stackoverflow.com","pinterest.com","twitch.tv","spotify.com","paypal.com",
  "ebay.com","youtube.com","chatgpt.com","openai.com","roblox.com","discord.com"];
function edgeBlocked(u){
  let h; try{ h=new URL(u).hostname.toLowerCase(); }catch(e){ return false; }
  return EDGE_BLOCKED.some(d=> h===d || h.endsWith("."+d));
}
function buildEdge(body){
  body.innerHTML=`<div class="edge">
    <div class="edge-bar">
      <button class="edge-nav" data-b title="Back">←</button><button class="edge-nav" data-f title="Forward">→</button><button class="edge-nav" data-r title="Reload">⟳</button>
      <input class="edge-url" value="https://www.bing.com" spellcheck="false">
    </div>
    <div class="edge-page"></div></div>`;
  const page=body.querySelector(".edge-page"), url=body.querySelector(".edge-url");
  let stack=[], si=-1;                         // in-app history
  const hostOf=u=>{ try{ return new URL(u).hostname||u; }catch(e){ return u; } };

  function render(loc){
    page.className="edge-page";
    page.style.alignItems=""; page.style.paddingTop="";
    if(loc.type==="store") store();
    else if(loc.type==="wp") wallpapers();
    else if(loc.type==="site") loadSite(loc.u);
    else home();
  }
  function navTo(loc){ stack=stack.slice(0,si+1); stack.push(loc); si=stack.length-1; render(loc); }
  function back(){ if(si>0){ si--; render(stack[si]); } }
  function fwd(){ if(si<stack.length-1){ si++; render(stack[si]); } }
  function reload(){ if(si>=0) render(stack[si]); else navTo({type:"home"}); }
  function restoreBar(){ if(si>=0) render(stack[si]); else navTo({type:"home"}); }

  /* parse the address bar: internal route, download, real URL, or search */
  function go(raw){
    const q=(raw||"").trim();
    if(!q){ navTo({type:"home"}); return; }
    const low=q.toLowerCase();
    if(/^(home|about:|https?:\/\/(www\.)?bing\.com\/?$)/.test(low) || low==="bing.com"){ navTo({type:"home"}); return; }
    if(/winstore|store\.wc|^store$/.test(low)){ navTo({type:"store"}); return; }
    if(/wallpaper/.test(low)){ navTo({type:"wp"}); return; }
    const looksUrl=/^https?:\/\//.test(q) || (/^[^\s]+\.[a-z]{2,}(\/|$|\?|#)/i.test(q) && !/\s/.test(q));
    let u = looksUrl ? (/^https?:\/\//.test(q)? q : "https://"+q)
                     : "https://en.wikipedia.org/w/index.php?search="+encodeURIComponent(q);
    const path=u.split("#")[0].split("?")[0], last=path.split("/").pop()||"";
    if(EDGE_DL_RE.test(last)){ downloadFromWeb(u); return; }
    navTo({type:"site",u});
  }

  /* real page in a locked-down iframe; genuinely can't touch WinClone's data */
  function loadSite(u){
    url.value=u;
    if(edgeBlocked(u)){ showRejected(u); return; }
    page.className="edge-page edge-site";
    page.innerHTML=`<div class="edge-load">Loading ${esc(hostOf(u))}…</div>
      <iframe class="edge-frame" referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"></iframe>`;
    const frame=page.querySelector(".edge-frame"), load=page.querySelector(".edge-load");
    let done=false;
    const t=setTimeout(()=>{ if(!done){ done=true; showRejected(u); } }, 8000);
    frame.addEventListener("load",()=>{ if(done) return; done=true; clearTimeout(t); if(load)load.remove(); frame.style.opacity=1; });
    frame.src=u;
  }
  function showRejected(u){
    page.className="edge-page";
    page.innerHTML=`<div class="edge-reject">
      <div class="em">😵</div>
      <b>WinClone got rejected :(</b>
      <div class="rj-sub"><b>${esc(hostOf(u))}</b> won't let WinClone open it in a window.<br>Some sites block being embedded like this — it's the site's rule, not your PC's fault.</div>
      <div class="rj-btns">
        <button class="wp-btn pri" data-retry>Try again</button>
        <button class="wp-btn" data-home>WinSearch home</button>
      </div></div>`;
    page.querySelector("[data-retry]").onclick=()=>loadSite(u);
    page.querySelector("[data-home]").onclick=()=>navTo({type:"home"});
  }

  /* "download" a web file into the VFS Downloads folder. Never touches the real disk. */
  function downloadFromWeb(u){
    const path=u.split("#")[0].split("?")[0];
    let fname=decodeURIComponent(path.split("/").pop()||"download").replace(/[\\/:*?"<>|]/g,"_")||"download";
    const dls=nodeAt([...HOME_PATH,"Downloads"]);
    if(!dls){ winDialog({icon:"⚠️",title:"Download",msg:"The Downloads folder is missing."}); restoreBar(); return; }
    if(dls.children[fname]){
      const dot=fname.lastIndexOf("."), b=dot>0?fname.slice(0,dot):fname, ext=dot>0?fname.slice(dot):"";
      let n=1; while(dls.children[b+" ("+n+")"+ext]) n++; fname=b+" ("+n+")"+ext;
    }
    const lo=fname.toLowerCase();
    const isImg=/\.(png|jpe?g|gif|bmp|webp|svg)$/.test(lo), isVid=/\.(mp4|webm|mkv|avi|mov|m4v)$/.test(lo);
    winDialog({icon:"⬇️",title:"Downloading…",msg:`Getting <b>${esc(fname)}</b> from ${esc(hostOf(u))}…`});
    setTimeout(()=>{
      const item={web:true};
      if(isImg){ item.icon="🖼️"; item.img=u; }
      else if(isVid){ item.icon="🎬"; }
      else { item.icon = lo.endsWith(".exe")||lo.endsWith(".msi")||lo.endsWith(".scr")||lo.endsWith(".bat") ? "⚙️" : "📄"; }
      dls.children[fname]=item; saveFS(); refreshFX();
      const ok=isImg||isVid;
      winDialog({icon:item.icon,title:"Download complete",
        msg:`<b>${esc(fname)}</b> saved to Downloads.<br><small style="color:#9a9a9a">${ok?"Double-click it to open it.":"Heads up: WinClone won't run files downloaded from the web."}</small>`});
    },1000);
    restoreBar();
  }

  function home(){
    url.value="https://www.bing.com";
    page.className="edge-page";
    page.style.alignItems="center"; page.style.paddingTop="60px";
    page.innerHTML=`
      <div class="logo">WinSearch</div>
      <input class="edge-search" placeholder="Search the web or type a URL">
      <div class="edge-bm"></div>
      <div class="edge-links">
        <a data-store><span class="gl">⬇️</span>App Store</a>
        <a data-wp><span class="gl">🖼️</span>Wallpapers</a>
        <a data-yt><span class="gl">▶️</span>YouTube</a>
      </div>`;
    const search=page.querySelector(".edge-search");
    search.addEventListener("keydown",e=>{ if(e.key==="Enter"&&search.value.trim()) go(search.value); });
    const bm=page.querySelector(".edge-bm");
    EDGE_BOOKMARKS.forEach(b=>{
      const a=el("a"); a.innerHTML=`<span class="gl">${b.icon}</span>${esc(b.name)}`;
      a.onclick=()=>go(b.url); bm.appendChild(a);
    });
    page.querySelector("[data-store]").onclick=()=>navTo({type:"store"});
    page.querySelector("[data-wp]").onclick=()=>navTo({type:"wp"});
    page.querySelector("[data-yt]").onclick=()=>openApp("youtube");
  }
  function wallpapers(){
    url.value="https://wallpapers.wc";
    page.style.alignItems="center"; page.style.paddingTop="30px";
    page.innerHTML=`<div style="width:min(680px,90%)">
      <div style="font-size:28px;font-weight:600;color:#111;margin-bottom:4px">🖼️ wallpapers.wc</div>
      <div style="color:#777;font-size:12.5px;margin-bottom:18px">Premium 8K wallpapers, definitely not just CSS gradients</div>
      <div class="wp-grid"></div>
    </div>`;
    const grid=page.querySelector(".wp-grid");
    WALLPAPERS.forEach(w=>{
      const file=w.n.replace(/\s+/g,"_")+".jpg";
      const pics=nodeAt([...HOME_PATH,"Pictures"]);
      const have=pics&&pics.children[file];
      const card=el("div","wp-card");
      card.innerHTML=`<div class="wp-prev" style="background:${w.g}"></div>
        <div class="wp-i"><b>${w.n}</b>
          <div class="wp-btns">
            <button class="wp-btn pri" data-set>Set as wallpaper</button>
            <button class="wp-btn" data-dl>${have?"Downloaded":"Download"}</button>
          </div></div>`;
      card.querySelector("[data-set]").onclick=()=>{
        setWallpaper(w.g);
        winDialog({icon:"🖼️",title:"wallpapers.wc",msg:`<b>${w.n}</b> applied. Looking fresh.`});
      };
      const dlBtn=card.querySelector("[data-dl]");
      if(have) dlBtn.disabled=true;
      dlBtn.onclick=()=>{
        if(dlBtn.disabled) return;
        dlBtn.disabled=true; dlBtn.textContent="…";
        setTimeout(()=>{
          const p=nodeAt([...HOME_PATH,"Pictures"]);
          if(p){ p.children[file]={icon:"🖼️",art:{g:w.g,e:"🖼️"}}; saveFS(); refreshFX(); }
          dlBtn.textContent="Downloaded";
          winDialog({icon:"🖼️",title:"Download complete",msg:`<b>${file}</b> saved to Pictures.`});
        },900);
      };
      grid.appendChild(card);
    });
  }
  function results(q){
    const qe=esc(q);
    page.innerHTML=`<div style="width:min(640px,88%);align-self:center;text-align:left">
      <div style="color:#605e5c;font-size:12px;margin:6px 0 14px">About 8,120,000 results for <b>${qe}</b></div>
      <div style="margin-bottom:22px">
        <div style="color:#1a0dab;font-size:18px;cursor:pointer" data-store>⬇️ ${qe} — FREE DOWNLOAD | winstore.wc</div>
        <div style="color:#006621;font-size:12px">https://winstore.wc/download</div>
        <div style="color:#4d5156;font-size:13px;margin-top:3px;line-height:1.5">Download ${qe} and totally-safe apps from the official WinClone App Store.</div>
      </div>
      ${[1,2,3].map(i=>`<div style="margin-bottom:22px">
        <div style="color:#1a0dab;font-size:18px">${qe} — result ${i} | example.com</div>
        <div style="color:#006621;font-size:12px">https://example.com/${encodeURIComponent(q)}/${i}</div>
        <div style="color:#4d5156;font-size:13px;margin-top:3px;line-height:1.5">This is a simulated search result for “${qe}”. WinClone's Edge can't load the real web, but the chrome is faithful.</div>
      </div>`).join("")}
    </div>`;
    page.style.alignItems="flex-start"; page.style.paddingTop="24px";
    const s=page.querySelector("[data-store]"); if(s) s.onclick=store;
  }
  function store(){
    url.value="https://winstore.wc";
    page.style.alignItems="center"; page.style.paddingTop="30px";
    page.innerHTML=`<div style="width:min(620px,90%)">
      <div style="font-size:28px;font-weight:600;color:#111;margin-bottom:4px">⬇️ WinClone App Store</div>
      <div style="color:#777;font-size:12.5px;margin-bottom:18px">All apps 100% verified* &nbsp;<small>(*not verified)</small></div>
      <div class="store-list"></div>
    </div>`;
    const listEl=page.querySelector(".store-list");
    const dl=nodeAt([...HOME_PATH,"Downloads"]);
    STORE_APPS.forEach(a=>{
      const row=el("div","store-app");
      row.innerHTML=`<span class="gl">${a.icon}</span>
        <div class="inf"><b>${a.name}</b><small>${a.desc}</small></div>
        <button class="store-get">${dl&&dl.children[a.file]?"Downloaded":"Get"}</button>`;
      const btn=row.querySelector("button");
      if(dl&&dl.children[a.file]) btn.disabled=true;
      btn.onclick=()=>{
        if(btn.disabled) return;
        btn.disabled=true; let p=0;
        const iv=setInterval(()=>{
          p+=Math.floor(Math.random()*22)+8;
          if(p>=100){
            clearInterval(iv); btn.textContent="Downloaded";
            const dls=nodeAt([...HOME_PATH,"Downloads"]);
            if(dls){ dls.children[a.file]={icon:a.icon,exe:true,malware:!!a.malware,kind:a.kind,runMsg:a.runMsg}; saveFS(); refreshFX(); }
            winDialog({icon:a.icon,title:"Download complete",
              msg:`<b>${a.file}</b> saved to Downloads.<br><small style="color:#9a9a9a">Double-click it in File Explorer to run it.${a.malware?" What could go wrong.":""}</small>`});
          } else btn.textContent=p+"%";
        },260);
      };
      listEl.appendChild(row);
    });
  }
  url.addEventListener("keydown",e=>{ if(e.key==="Enter") go(url.value); });
  body.querySelector("[data-b]").onclick=back;
  body.querySelector("[data-f]").onclick=fwd;
  body.querySelector("[data-r]").onclick=reload;
  navTo({type:"home"});
}

/* ---- photos ---- */
let PH_PENDING=null;
const PH={loader:null};
function openImageInPhotos(pn){
  if(state.wins.photos && PH.loader){
    if(state.wins.photos.min) toggleMin("photos",false);
    focusWin("photos"); PH.loader(pn);
  } else { PH_PENDING=pn; openApp("photos"); }
}
function buildPhotos(body,win){
  let imgs=allImages(), idx=-1;
  function gallery(){
    imgs=allImages();
    win.querySelector(".tt").textContent="Photos";
    body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%">
      <div class="ph-bar"><b style="flex:1">🖼️ Photos — ${imgs.length} item(s)</b>
        <button class="allbtn" data-imp>📥 Import from computer</button></div>
      <div class="photos" style="flex:1"></div></div>`;
    body.querySelector("[data-imp]").onclick=()=>importImages([...HOME_PATH,"Pictures"],gallery);
    const grid=body.querySelector(".photos");
    if(!imgs.length){ grid.innerHTML=`<div style="color:#888;padding:20px">No pictures found. Click “Import from computer” to add your own.</div>`; return; }
    imgs.forEach((im,i)=>{
      const art=artFor(im.name,im.item);
      const p=el("div","photo");
      p.style.background=art.g;
      p.innerHTML=`<span>${art.e}</span><span class="pnm">${esc(im.name)}</span>`;
      p.onclick=()=>{ idx=i; viewer(); };
      grid.appendChild(p);
    });
  }
  function viewer(){
    const im=imgs[idx]; if(!im){ gallery(); return; }
    const art=artFor(im.name,im.item);
    win.querySelector(".tt").textContent=im.name+" — Photos";
    body.innerHTML=`<div class="ph">
      <div class="ph-bar">
        <button class="edge-nav" data-g style="color:#ddd" title="All photos">▦</button>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(im.name)}&nbsp;&nbsp;<small style="color:#888">${esc(im.path.join("\\"))}</small></span>
        <button class="allbtn" data-wall>Set as wallpaper</button>
      </div>
      <div class="ph-stage">
        <div class="ph-img" style="background:${art.g}">${art.e}</div>
        <button class="ph-nav" style="left:10px" data-prev>‹</button>
        <button class="ph-nav" style="right:10px" data-next>›</button>
      </div></div>`;
    body.querySelector("[data-g]").onclick=gallery;
    body.querySelector("[data-prev]").onclick=()=>{ idx=(idx-1+imgs.length)%imgs.length; viewer(); };
    body.querySelector("[data-next]").onclick=()=>{ idx=(idx+1)%imgs.length; viewer(); };
    body.querySelector("[data-wall]").onclick=()=>{
      setWallpaper(art.g);
      winDialog({icon:"🖼️",title:"Photos",msg:`<b>${esc(im.name)}</b> is now your wallpaper.`});
    };
  }
  PH.loader=pn=>{
    imgs=allImages();
    idx=imgs.findIndex(im=>im.name===pn.name&&im.path.join("/")===pn.path.join("/"));
    if(idx<0) idx=imgs.length?0:-1;
    if(idx>=0) viewer(); else gallery();
  };
  if(PH_PENDING){ PH.loader(PH_PENDING); PH_PENDING=null; } else gallery();
}

/* ---- media player ---- */
let MP_PENDING=null;
const MP={loader:null};
function openMediaIn(pn){
  if(state.wins.media && MP.loader){
    if(state.wins.media.min) toggleMin("media",false);
    focusWin("media"); MP.loader(pn);
  } else { MP_PENDING=pn; openApp("media"); }
}
function buildMedia(body,win){
  body.innerHTML=`<div class="mp">
    <div class="mp-stage"><div style="color:#777;font-size:14px">Open a video or song from File Explorer 🎬</div></div>
    <div class="mp-controls">
      <button data-pp>▶</button>
      <span class="mp-time">0:00 / 0:00</span>
      <input type="range" data-seek min="0" max="100" value="0">
      <span style="font-size:14px">🔊</span><input type="range" data-vol min="0" max="100" value="70">
    </div></div>`;
  const root=body.querySelector(".mp"), stage=body.querySelector(".mp-stage"),
        pp=body.querySelector("[data-pp]"), seek=body.querySelector("[data-seek]"),
        timeEl=body.querySelector(".mp-time");
  const scenes=["🌅","🏙️","🚗","💥","🕵️","❤️","🌇","🎬"];
  let cur=null, t=0, dur=1, playing=false, emojiEl=null;
  const fmt=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
  function load(pn){
    cur=pn; t=0; playing=true; pp.textContent="⏸";
    const node=nodeAt(pn.path);
    const item=(node&&node.children)?node.children[pn.name]:null;
    const art=artFor(pn.name,item||{});
    const isAudio=/\.(mp3|wav)$/i.test(pn.name);
    dur=isAudio?222:135;
    win.querySelector(".tt").textContent=pn.name+" — Media Player";
    if(isAudio){
      stage.style.background="radial-gradient(60% 60% at 50% 40%,#20304a,#0c1420)";
      stage.innerHTML=`<div class="mp-disc">🎵</div>
        <div class="mp-eq">${"<i></i>".repeat(7)}</div>
        <div class="mp-caption">${esc(pn.name)} — WinClone Records</div>`;
      stage.querySelectorAll(".mp-eq i").forEach((b,i)=>{
        b.style.animationDelay=(i*0.09)+"s"; b.style.animationDuration=(0.5+(i%3)*0.15)+"s";
      });
      emojiEl=null;
    }else{
      stage.style.background="#000";
      stage.innerHTML=`<div class="mp-video" style="background-image:${art.g}"><span></span></div>
        <div class="mp-caption">${esc(pn.name)} — a WinClone Pictures production</div>`;
      emojiEl=stage.querySelector(".mp-video span");
    }
    upd();
  }
  function upd(){
    seek.value=dur?(t/dur)*100:0;
    timeEl.textContent=fmt(t)+" / "+fmt(dur);
    if(emojiEl) emojiEl.textContent=scenes[Math.floor(t/18)%scenes.length];
    root.classList.toggle("paused",!playing);
  }
  const iv=setInterval(()=>{
    if(!body.isConnected){ clearInterval(iv); return; }
    if(!playing||!cur) return;
    t+=0.25;
    if(t>=dur){ t=dur; playing=false; pp.textContent="↺"; }
    upd();
  },250);
  pp.onclick=()=>{
    if(!cur) return;
    if(t>=dur){ t=0; playing=true; }
    else playing=!playing;
    pp.textContent=playing?"⏸":"▶"; upd();
  };
  seek.oninput=()=>{ if(!cur) return; t=dur*(+seek.value/100); if(!playing&&t<dur) pp.textContent="▶"; upd(); };
  MP.loader=load;
  if(MP_PENDING){ load(MP_PENDING); MP_PENDING=null; }
}

function buildRecycle(body){
  function render(){
    if(!body.isConnected) return;
    if(!RECYCLE.length){
      body.innerHTML=`<div class="recycle-empty"><div class="gl">🗑️</div><div>Recycle Bin is empty</div></div>`;
      return;
    }
    body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%">
      <div class="rc-bar">
        <button class="allbtn" data-rc="restoreall">Restore all items</button>
        <button class="allbtn" data-rc="empty">Empty Recycle Bin</button>
      </div>
      <div class="fx-grid" style="flex:1;overflow:auto"></div>
    </div>`;
    const grid=body.querySelector(".fx-grid");
    RECYCLE.forEach((r,idx)=>{
      const t=el("div","fx-tile");
      t.innerHTML=`<span class="gl">${r.item.folder?"📁":(r.item.icon||"📄")}</span><span class="nm">${esc(r.name)}</span>`;
      t.title="Original location: "+r.path.join("\\");
      t.oncontextmenu=e=>{ e.preventDefault(); e.stopPropagation();
        showCtx(e.clientX,e.clientY,[
          {icon:"♻️",label:"Restore",action:()=>{ restoreFromRecycle(idx); render(); }},
        ]);
      };
      t.ondblclick=()=>{ restoreFromRecycle(idx); render(); };
      grid.appendChild(t);
    });
    body.querySelector('[data-rc="restoreall"]').onclick=()=>{
      while(RECYCLE.length) restoreFromRecycle(0);
      render();
    };
    body.querySelector('[data-rc="empty"]').onclick=()=>{
      winDialog({icon:"🗑️",title:"Empty Recycle Bin",
        msg:`Permanently delete ${RECYCLE.length} item(s)? System files deleted here are <b>gone for good</b> (until a BIOS factory reset).`,
        buttons:[{label:"Empty it",action:()=>{ RECYCLE.length=0; saveRecycle(); render(); applySystemHealth(); }},{label:"Cancel",primary:true}]});
    };
  }
  fxRefreshers.push(render);
  render();
}

function buildDefender(body){
  function walk(node,path,out){
    const kids=node.children||{};
    Object.keys(kids).forEach(k=>{
      const it=kids[k];
      if(it.malware) out.push({name:k,path:[...path]});
      if(it.folder) walk(it,[...path,k],out);
    });
  }
  function threatsNow(){ const out=[]; walk({children:VFS},[],out); return out; }
  function render(){
    if(!body.isConnected) return;
    const st=systemStatus();
    const bad=threatsNow().length>0||infected();
    body.innerHTML=`<div class="av">
      <div class="av-hero ${bad?'bad':''}">
        <span class="shield">${bad?'🚨':'🛡️'}</span>
        <div><h3>Cork Defender</h3>
          <div class="sub">${bad?'Threats detected. Your PC is at risk.':'No action needed. Your PC is protected.'}</div>
          ${st.damaged?`<div class="sub" style="color:#ff8a80;margin-top:4px">⚠ ${st.missing.length} system file(s) missing — Defender can't repair those. Restore from the Recycle Bin, or factory-reset from the BIOS.</div>`:''}
        </div>
      </div>
      <button class="av-btn" data-scan>Quick scan</button>
      <div class="av-scan" style="display:none">
        <div class="av-bar"><i></i></div>
        <div class="av-log"></div>
      </div>
      <div class="av-results"></div>
    </div>`;
    const scanBtn=body.querySelector("[data-scan]"), scanBox=body.querySelector(".av-scan"),
          bar=body.querySelector(".av-bar i"), log=body.querySelector(".av-log"), res=body.querySelector(".av-results");
    scanBtn.onclick=()=>{
      scanBtn.disabled=true; scanBox.style.display="block"; res.innerHTML=""; log.innerHTML="";
      const lines=["Scanning C:\\Windows\\System…","Scanning C:\\Program Files…","Scanning C:\\Users\\User\\Downloads…",
        "Checking startup items…","Scanning cat pictures… none found (concerning)","Analyzing suspicious vibes…",
        "Cross-referencing Cork threat database…"];
      let i=0,p=0;
      const iv=setInterval(()=>{
        p+=Math.floor(Math.random()*9)+4; if(p>100)p=100;
        bar.style.width=p+"%";
        if(i<lines.length&&Math.random()<0.55){ log.innerHTML+=lines[i++]+"<br>"; log.scrollTop=log.scrollHeight; }
        if(p>=100){
          clearInterval(iv);
          while(i<lines.length){ log.innerHTML+=lines[i++]+"<br>"; }
          log.scrollTop=log.scrollHeight;
          finish();
        }
      },180);
    };
    function finish(){
      const files=threatsNow();
      const rows=[]; const seen=new Set();
      INFECTIONS.forEach(i=>{ if(seen.has(i.kind)) return; seen.add(i.kind);
        const m=MALWARE[i.kind]||{}; rows.push({fam:m.family||"Malware", name:m.name||i.kind, sub:"active infection"}); });
      if(files.length) rows.push({fam:"Malware", name:files.length+" infected file(s) on disk", sub:"Downloads / System / …"});
      if(!rows.length){
        res.innerHTML=`<div style="color:#5cd68a;margin-top:12px">✅ Scan complete — 0 threats found. Squeaky clean.</div>`;
        scanBtn.disabled=false;
        return;
      }
      res.innerHTML=`<div style="margin:12px 0 8px;color:#ff8a80">⚠ ${rows.length} threat(s) found:</div>`+
        rows.map(t=>`<div class="av-threat"><span class="gl">🦠</span>
        <div><b>${t.fam}:WC/${t.name.replace(/[^A-Za-z0-9]/g,"")}</b><br><small style="color:#e0a9a3">${t.name} — ${t.sub}</small></div></div>`).join("")+
        `<button class="av-btn danger" data-clean>Remove all threats</button>`;
      res.querySelector("[data-clean]").onclick=()=>{
        threatsNow().forEach(f=>{ const parent=nodeAt(f.path); if(parent&&parent.children) delete parent.children[f.name]; });
        disinfect(); saveFS(); refreshFX();
        winDialog({icon:"🛡️",title:"Cork Defender",msg:"All threats removed, encrypted files decrypted, and effects stopped. Your PC is clean. 🎉"});
        render();
      };
    }
  }
  fxRefreshers.push(render);
  render();
}

/* ---- Paint ---- */
function buildPaint(body){
  body.innerHTML=`<div class="pt">
    <div class="pt-tools">
      <div class="pt-colors"></div>
      <span class="pt-sep"></span>
      <label class="pt-size">Size <input type="range" min="1" max="40" value="6"></label>
      <button class="pt-btn" data-clear>Clear</button>
      <button class="pt-btn pri" data-save>Save to Pictures</button>
    </div>
    <div class="pt-stage"><canvas></canvas></div>
  </div>`;
  const cv=body.querySelector("canvas"), ctx=cv.getContext("2d"), stage=body.querySelector(".pt-stage");
  let color="#000000", size=6, drawing=false, last=null;
  const cwrap=body.querySelector(".pt-colors");
  ["#000000","#ffffff","#e81123","#ff8c00","#fff100","#16c60c","#0067c0","#8a3ffc","#7a5230","#f472b6"].forEach((c,idx)=>{
    const s=el("button","pt-sw"+(idx===0?" sel":"")); s.style.background=c;
    s.onclick=()=>{ color=c; cwrap.querySelectorAll(".pt-sw").forEach(x=>x.classList.remove("sel")); s.classList.add("sel"); };
    cwrap.appendChild(s);
  });
  function fit(){
    const r=stage.getBoundingClientRect();
    const data=cv.width?ctx.getImageData(0,0,cv.width,cv.height):null;
    cv.width=Math.max(50,r.width-2); cv.height=Math.max(50,r.height-2);
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,cv.width,cv.height);
    if(data) ctx.putImageData(data,0,0);
  }
  const pos=e=>{ const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
  const dot=p=>{ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(p.x,p.y,size/2,0,7); ctx.fill(); };
  cv.addEventListener("mousedown",e=>{ drawing=true; last=pos(e); dot(last); });
  const move=e=>{ if(!drawing||!cv.isConnected) return; const p=pos(e); ctx.strokeStyle=color; ctx.lineWidth=size; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; };
  document.addEventListener("mousemove",move);
  document.addEventListener("mouseup",()=>drawing=false);
  body.querySelector(".pt-size input").oninput=e=>size=+e.target.value;
  body.querySelector("[data-clear]").onclick=()=>{ ctx.fillStyle="#fff"; ctx.fillRect(0,0,cv.width,cv.height); };
  body.querySelector("[data-save]").onclick=()=>{
    const data=cv.toDataURL("image/png");
    inputDialog({title:"Save to Pictures",value:"drawing.png",ok:"Save",cb:nm=>{
      if(!/\.(png|jpe?g|bmp)$/i.test(nm)) nm+=".png";
      const pics=nodeAt([...HOME_PATH,"Pictures"]);
      if(pics){ pics.children[uniqueName(pics,nm)]={icon:"🖼️",img:data}; saveFS(); refreshFX(); winDialog({icon:"🎨",title:"Paint",msg:"Saved <b>"+esc(nm)+"</b> to Pictures. Open it in Photos or set it as wallpaper."}); }
    }});
  };
  requestAnimationFrame(fit);
  const ro=setInterval(()=>{ if(!body.isConnected){ clearInterval(ro); document.removeEventListener("mousemove",move); return; } const r=stage.getBoundingClientRect(); if(Math.abs(r.width-2-cv.width)>4||Math.abs(r.height-2-cv.height)>4) fit(); },600);
}

/* ---- Task Manager ---- */
function buildTaskmgr(body){
  body.innerHTML=`<div class="tm">
    <div class="tm-sum">
      <div class="tm-meter"><div>CPU</div><div class="tm-bar"><i data-cpu></i></div><span data-cpuv>0%</span></div>
      <div class="tm-meter"><div>Memory</div><div class="tm-bar mem"><i data-mem></i></div><span data-memv>0%</span></div>
    </div>
    <div class="tm-head"><span>Name</span><span>CPU</span><span>Memory</span><span></span></div>
    <div class="tm-list"></div>
  </div>`;
  const list=body.querySelector(".tm-list"), cpuBar=body.querySelector("[data-cpu]"), memBar=body.querySelector("[data-mem]");
  function procs(){
    const base=[
      {n:"System",i:"⚙️",cpu:1,mem:120},
      {n:"wclogon.exe",i:"🔐",cpu:0,mem:32},
      {n:"explorer.exe",i:"📁",cpu:1+rnd(2),mem:210},
      {n:"Cork Defender",i:"🛡️",cpu:2,mem:98},
    ];
    Object.keys(state.wins).forEach(id=>{ const a=APPS[id]; if(a) base.push({n:a.title,i:a.icon,cpu:1+rnd(5),mem:60+rnd(180),win:id}); });
    if(hasKind("miner")) base.push({n:"BitCorkMiner.exe",i:"⛏️",cpu:82+rnd(15),mem:340+rnd(120),mal:1});
    if(hasKind("backdoor")) base.push({n:"svch0st_rat.exe",i:"🚪",cpu:3+rnd(6),mem:44+rnd(30),mal:1});
    if(hasKind("keylogger")) base.push({n:"klog32.exe",i:"⌨️",cpu:1,mem:18,mal:1});
    if(hasKind("spyware")) base.push({n:"peepcam.exe",i:"👁️",cpu:5+rnd(8),mem:120,mal:1});
    if(hasKind("scareware")) base.push({n:"adserver.exe",i:"📢",cpu:2,mem:70,mal:1});
    const worms=wormCount(); for(let i=0;i<Math.min(worms,6);i++) base.push({n:"wcworm_"+i+".exe",i:"🪱",cpu:4+rnd(7),mem:20+rnd(20),mal:1});
    return base;
  }
  function render(){
    if(!body.isConnected) return;
    const ps=procs();
    let totalCpu=ps.reduce((a,b)=>a+b.cpu,0); if(hasKind("miner")) totalCpu=Math.max(totalCpu,96);
    totalCpu=Math.min(100,totalCpu);
    const totalMem=Math.min(100,Math.round(ps.reduce((a,b)=>a+b.mem,0)/320));
    cpuBar.style.width=totalCpu+"%"; body.querySelector("[data-cpuv]").textContent=totalCpu+"%";
    memBar.style.width=totalMem+"%"; body.querySelector("[data-memv]").textContent=totalMem+"%";
    cpuBar.classList.toggle("hot",totalCpu>85);
    list.innerHTML="";
    ps.sort((a,b)=>b.cpu-a.cpu).forEach(p=>{
      const row=el("div","tm-row"+(p.mal?" mal":""));
      row.innerHTML=`<span class="tm-name">${p.i} ${p.n}</span><span>${p.cpu}%</span><span>${p.mem} MB</span>
        <span>${(p.win||p.mal)?'<button class="tm-end">End task</button>':''}</span>`;
      const btn=row.querySelector(".tm-end");
      if(btn) btn.onclick=()=>{
        if(p.win){ closeWin(p.win); render(); }
        else winDialog({icon:"🛡️",title:"Task Manager",msg:"<b>Access denied.</b> This process is protected by a rootkit and respawns instantly. Use <b>Cork Defender</b> to remove it properly."});
      };
      list.appendChild(row);
    });
  }
  const iv=setInterval(()=>{ if(!body.isConnected){ clearInterval(iv); return; } render(); },1600);
  render();
}

/* ---- Minesweeper ---- */
function buildMines(body){
  const N=9, MINES=10;
  body.innerHTML=`<div class="ms">
    <div class="ms-bar"><span class="ms-flags">🚩 <b>0</b></span><button class="ms-face">🙂</button><span class="ms-time">⏱️ <b>0</b></span></div>
    <div class="ms-grid"></div>
    <div class="ms-msg">Left-click to reveal · right-click to flag</div>
  </div>`;
  const gridEl=body.querySelector(".ms-grid"), face=body.querySelector(".ms-face"), msg=body.querySelector(".ms-msg");
  const flagsEl=body.querySelector(".ms-flags b"), timeEl=body.querySelector(".ms-time b");
  gridEl.style.gridTemplateColumns=`repeat(${N},1fr)`;
  let cells,over,started,timer,secs,flags;
  function reset(){
    cells=[]; over=false; started=false; secs=0; flags=0; clearInterval(timer);
    flagsEl.textContent=0; timeEl.textContent=0; msg.textContent="Left-click reveal · right-click flag"; face.textContent="🙂"; gridEl.innerHTML="";
    for(let i=0;i<N*N;i++){ const c={mine:false,rev:false,flag:false,n:0,el:el("button","ms-cell")}; cells.push(c);
      c.el.oncontextmenu=e=>{ e.preventDefault(); flag(i); };
      c.el.onclick=()=>reveal(i);
      gridEl.appendChild(c.el);
    }
  }
  function neighbors(i){ const r=Math.floor(i/N),c=i%N,o=[]; for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){ if(!dr&&!dc)continue; const nr=r+dr,nc=c+dc; if(nr>=0&&nr<N&&nc>=0&&nc<N)o.push(nr*N+nc); } return o; }
  function plant(safe){ let p=0; while(p<MINES){ const i=rnd(N*N); if(i===safe||cells[i].mine)continue; cells[i].mine=true; p++; } for(let i=0;i<N*N;i++){ if(!cells[i].mine) cells[i].n=neighbors(i).filter(j=>cells[j].mine).length; } }
  function reveal(i){
    if(over||cells[i].flag||cells[i].rev) return;
    if(!started){ started=true; plant(i); timer=setInterval(()=>{ secs++; timeEl.textContent=secs; },1000); }
    const c=cells[i]; c.rev=true; c.el.classList.add("rev");
    if(c.mine){ c.el.textContent="💥"; return lose(); }
    if(c.n){ c.el.textContent=c.n; c.el.dataset.n=c.n; } else neighbors(i).forEach(reveal);
    win();
  }
  function flag(i){ const c=cells[i]; if(over||c.rev) return; c.flag=!c.flag; c.el.textContent=c.flag?"🚩":""; c.el.classList.toggle("flag",c.flag); flags+=c.flag?1:-1; flagsEl.textContent=flags; }
  function lose(){ over=true; clearInterval(timer); face.textContent="😵"; msg.textContent="💥 Boom! Click the face to retry."; cells.forEach(c=>{ if(c.mine&&!c.rev){ c.el.textContent="💣"; c.el.classList.add("rev"); } }); }
  function win(){ if(cells.every(c=>c.rev||c.mine)){ over=true; clearInterval(timer); face.textContent="😎"; msg.textContent="🎉 Cleared! You win."; } }
  face.onclick=reset;
  reset();
}

/* ---- Snake ---- */
function buildSnake(body){
  body.innerHTML=`<div class="sn">
    <div class="sn-hud"><span>Score <b class="sn-score">0</b></span><span class="sn-state">Arrows/WASD to move</span><button class="sn-btn">▶ Start</button></div>
    <canvas width="360" height="360"></canvas>
    <div class="sn-tip">Tip: Space to start · walls wrap around</div>
  </div>`;
  const cv=body.querySelector("canvas"), ctx=cv.getContext("2d");
  const scoreEl=body.querySelector(".sn-score"), stateEl=body.querySelector(".sn-state"), btn=body.querySelector(".sn-btn");
  const G=18, C=cv.width/G;
  let snake,dir,nd,food,score,alive,loop;
  function reset(){ snake=[{x:9,y:9}]; dir={x:1,y:0}; nd=dir; score=0; alive=true; place(); scoreEl.textContent=0; draw(); }
  function place(){ do{ food={x:rnd(G),y:rnd(G)}; }while(snake.some(s=>s.x===food.x&&s.y===food.y)); }
  function step(){
    dir=nd;
    const h={x:(snake[0].x+dir.x+G)%G,y:(snake[0].y+dir.y+G)%G};
    if(snake.some(s=>s.x===h.x&&s.y===h.y)) return end();
    snake.unshift(h);
    if(h.x===food.x&&h.y===food.y){ score++; scoreEl.textContent=score; place(); } else snake.pop();
    draw();
  }
  function draw(){
    ctx.fillStyle="#0c1220"; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.fillStyle="#e0491c"; ctx.fillRect(food.x*C+2,food.y*C+2,C-4,C-4);
    snake.forEach((s,i)=>{ ctx.fillStyle=i===0?"#4cc2ff":"#2f8fd0"; ctx.fillRect(s.x*C+1,s.y*C+1,C-2,C-2); });
  }
  function start(){ if(loop) return; if(!alive) reset(); stateEl.textContent="Go!"; btn.textContent="Restart"; loop=setInterval(step,110); }
  function end(){ alive=false; clearInterval(loop); loop=null; stateEl.textContent="Game over — score "+score; btn.textContent="▶ Start"; }
  btn.onclick=()=>{ if(loop){ clearInterval(loop); loop=null; reset(); start(); } else start(); };
  const key=e=>{
    if(!body.isConnected){ document.removeEventListener("keydown",key); clearInterval(loop); return; }
    if(!state.wins.snake || state.focused!=="snake") return;
    const k=e.key;
    if(k===" "){ e.preventDefault(); if(!loop) start(); return; }
    if((k==="ArrowUp"||k==="w")&&dir.y===0) nd={x:0,y:-1};
    else if((k==="ArrowDown"||k==="s")&&dir.y===0) nd={x:0,y:1};
    else if((k==="ArrowLeft"||k==="a")&&dir.x===0) nd={x:-1,y:0};
    else if((k==="ArrowRight"||k==="d")&&dir.x===0) nd={x:1,y:0};
  };
  document.addEventListener("keydown",key);
  reset();
}

/* ---- Archive viewer ---- */
function buildArchive(body,win){
  function load(pn){
    if(!pn||!pn.name){ win.querySelector(".tt").textContent="Archive"; body.innerHTML=`<div style="padding:20px;color:#888">Open an archive (.zip / .rar) from File Explorer.</div>`; return; }
    const node=nodeAt(pn.path), item=node&&node.children?node.children[pn.name]:null;
    win.querySelector(".tt").textContent=pn.name+" — Archive";
    if(!item||!item.archive){ body.innerHTML=`<div style="padding:20px;color:#888">That file isn't an archive.</div>`; return; }
    const kids=item.children||{};
    body.innerHTML=`<div style="display:flex;flex-direction:column;height:100%">
      <div class="rc-bar"><b style="align-self:center;flex:1">🗜️ ${esc(pn.name)} — ${Object.keys(kids).length} item(s)</b><button class="allbtn" data-x>Extract all here</button></div>
      <div class="fx-grid" style="flex:1;overflow:auto"></div></div>`;
    const grid=body.querySelector(".fx-grid");
    if(!Object.keys(kids).length) grid.innerHTML=`<div style="color:#888;padding:20px">This archive is empty.</div>`;
    Object.keys(kids).forEach(k=>{ const it=kids[k]; const t=el("div","fx-tile");
      t.innerHTML=`<span class="gl">${it.folder?"📁":(it.icon||"📄")}</span><span class="nm">${esc(k)}</span>`; grid.appendChild(t); });
    body.querySelector("[data-x]").onclick=()=>{ extractArchive(pn.path,pn.name,item); winDialog({icon:"📦",title:"Extract",msg:"Extracted to <b>"+esc(pn.path[pn.path.length-1])+"</b>."}); };
  }
  ARC.loader=load;
  if(ARC_PENDING){ load(ARC_PENDING); ARC_PENDING=null; } else load(null);
}

/* ---- HTML viewer ---- */
function buildHtmlView(body,win){
  function load(pn){
    const node=pn&&nodeAt(pn.path), item=(node&&node.children)?node.children[pn.name]:null;
    win.querySelector(".tt").textContent=(pn&&pn.name?pn.name:"HTML Viewer")+" — HTML Viewer";
    const html=item?(item.content||""):"";
    body.innerHTML=`<div class="hv">
      <div class="hv-bar"><span class="hv-url">🌐 file:///C:/…/${pn&&pn.name?esc(pn.name):""}</span>
        <button class="allbtn" data-src>View source</button>
        <button class="allbtn" data-edit>Edit</button></div>
      <iframe class="hv-frame" sandbox="allow-scripts allow-modals allow-popups"></iframe></div>`;
    const f=body.querySelector("iframe"); f.srcdoc=html;
    body.querySelector("[data-src]").onclick=()=>{ f.srcdoc=`<pre style="white-space:pre-wrap;padding:14px;font-family:Consolas,monospace;font-size:13px;color:#222">${html.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</pre>`; };
    body.querySelector("[data-edit]").onclick=()=>{ if(pn&&pn.name) openFileInNotepad({path:pn.path,name:pn.name}); };
  }
  HV.loader=load;
  if(HV_PENDING){ load(HV_PENDING); HV_PENDING=null; } else body.innerHTML=`<div style="padding:20px;color:#888">Open an .html file from File Explorer.</div>`;
}

/* ---- YouTube (official privacy embed; the ONLY network egress, and only after you press play) ---- */
// Well-known, embeddable public videos. Swap any ID here if one shows "unavailable" after deploy.
const YT_PICKS=[
  {id:"jNQXAC9IVRw",title:"Me at the zoo",chan:"jawed · the first YouTube video"},
  {id:"aqz-KE-bpKQ",title:"Big Buck Bunny",chan:"Blender Foundation · open movie (CC)"},
  {id:"dQw4w9WgXcQ",title:"Rick Astley – Never Gonna Give You Up",chan:"Rick Astley"},
  {id:"9bZkp7q19f0",title:"PSY – Gangnam Style",chan:"officialpsy"},
  {id:"kJQP7kiw5Fk",title:"Luis Fonsi – Despacito ft. Daddy Yankee",chan:"Luis Fonsi"},
  {id:"RgKAFK5djSk",title:"Wiz Khalifa – See You Again ft. Charlie Puth",chan:"Wiz Khalifa"},
  {id:"OPf0YbXqDm0",title:"Mark Ronson – Uptown Funk ft. Bruno Mars",chan:"Mark Ronson"},
  {id:"JGwWNGJdvx8",title:"Ed Sheeran – Shape of You",chan:"Ed Sheeran"},
  {id:"fJ9rUzIMcZQ",title:"Queen – Bohemian Rhapsody",chan:"Queen Official"},
  {id:"60ItHLz5WEA",title:"Alan Walker – Faded",chan:"Alan Walker"},
];
let YT_RECENT=[];
function ytParseId(s){
  s=(s||"").trim();
  if(/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  let m=s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if(m) return m[1];
  m=s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m?m[1]:null;
}
function ytThumb(box,id){
  if(!/^[a-zA-Z0-9_-]{11}$/.test(id)) return; // only validated IDs ever hit the network
  const img=document.createElement("img");
  img.loading="lazy"; img.alt="";
  img.referrerPolicy="strict-origin-when-cross-origin";
  img.onerror=()=>img.remove();               // fall back to the ▶ placeholder
  img.src=`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  box.appendChild(img);
}
function buildYoutube(body,win){
  function bar(){ return `<span class="yt-logo">▶️ <b>YouTube</b></span><input class="yt-search" placeholder="Paste a YouTube link or 11-char video ID"><button class="yt-open">Watch</button>`; }
  function wire(){
    const s=body.querySelector(".yt-search"), b=body.querySelector(".yt-open");
    const go=()=>{ const id=ytParseId(s.value); if(!id){ winDialog({icon:"▶️",title:"YouTube",msg:"Couldn't find a video ID. Paste a full YouTube link (youtube.com/watch?v=… or youtu.be/…) or an 11-character ID."}); return; } watch({id,title:"YouTube video",chan:"YouTube"}); };
    b.onclick=go; s.addEventListener("keydown",e=>{ if(e.key==="Enter") go(); });
    const bk=body.querySelector(".yt-back"); if(bk) bk.onclick=home;
  }
  function home(){
    win.querySelector(".tt").textContent="YouTube";
    const cards=[...YT_RECENT,...YT_PICKS];
    body.innerHTML=`<div class="yt">
      <div class="yt-bar">${bar()}</div>
      <div class="yt-grid"></div>
      <div class="yt-note">▶ Real YouTube via its official privacy embed (youtube-nocookie.com); thumbnails from i.ytimg.com. YouTube is the only part of WinClone that touches the internet — everything else stays on your PC. Paste any link/ID above to watch more.</div>
    </div>`;
    const grid=body.querySelector(".yt-grid");
    cards.forEach(v=>{
      const card=el("div","yt-card");
      card.innerHTML=`<div class="yt-thumb"><span class="ph">▶</span></div><div class="yt-meta"><div class="yt-t">${esc(v.title)}</div><div class="yt-c">${esc(v.chan||"YouTube")}</div></div>`;
      ytThumb(card.querySelector(".yt-thumb"), v.id);
      card.onclick=()=>watch(v);
      grid.appendChild(card);
    });
    wire();
  }
  function watch(v){
    if(!/^[a-zA-Z0-9_-]{11}$/.test(v.id)){ home(); return; }
    if(!YT_RECENT.some(x=>x.id===v.id)) YT_RECENT.unshift({id:v.id,title:v.title||"YouTube video",chan:v.chan||"YouTube"});
    win.querySelector(".tt").textContent=(v.title||"YouTube")+" — YouTube";
    body.innerHTML=`<div class="yt">
      <div class="yt-bar"><button class="yt-back">←</button>${bar()}</div>
      <div class="yt-watch"><div class="yt-player"></div>
        <div class="yt-wt">${esc(v.title||"YouTube video")}</div><div class="yt-wc">${esc(v.chan||"YouTube")}</div>
        <div class="yt-up">More</div><div class="yt-uplist"></div></div></div>`;
    const player=body.querySelector(".yt-player");
    const f=document.createElement("iframe");
    const originParam = location.protocol==="file:" ? "" : "&origin="+encodeURIComponent(location.origin);
    f.src=`https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&enablejsapi=1${originParam}`;
    f.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.allowFullscreen=true; f.referrerPolicy="strict-origin-when-cross-origin";
    f.style.cssText="width:100%;height:100%;border:0";
    player.appendChild(f);
    f.addEventListener("load",()=>setTimeout(()=>ytApply(f),700)); // apply master volume once the player is ready
    const up=body.querySelector(".yt-uplist");
    [...YT_RECENT,...YT_PICKS].filter(x=>x.id!==v.id).slice(0,8).forEach(x=>{
      const r=el("div","yt-uprow");
      r.innerHTML=`<div class="th"><span class="ph">▶</span></div><div class="m">${esc(x.title)}<small>${esc(x.chan||"YouTube")}</small></div>`;
      ytThumb(r.querySelector(".th"), x.id);
      r.onclick=()=>watch(x); up.appendChild(r);
    });
    wire();
  }
  home();
}

/* ============================ WI-FI ============================ */
const WIFI_NETS=[
  {n:"HOME-5G",lock:true},
  {n:"HOME-5G_Guest",lock:true},
  {n:"TP-Link_2A4F",lock:true},
  {n:"NETGEAR-Munroe",lock:true},
  {n:"FBI Surveillance Van #4",lock:true},
  {n:"PrettyFlyForAWiFi",lock:true},
  {n:"It Hurts When IP",lock:false},
];
let wifiConn="HOME-5G";
function renderWifi(){
  const w=$("#wifilist"); w.innerHTML="";
  const on=$('#notif .qs-tile[data-q="wifi"]').classList.contains("on");
  if(!on){ w.innerHTML=`<div style="color:#9a9a9a;font-size:12px;padding:6px">Wi-Fi is turned off.</div>`; return; }
  WIFI_NETS.forEach(net=>{
    const isConn=wifiConn===net.n;
    const row=el("div","wifi-row",
      `<span class="sig">📶</span><div class="meta">${net.n} ${net.lock?"🔒":""}<small>${isConn?"Connected, secured":(net.lock?"Secured":"Open")}</small></div>${isConn?'<span class="conn">✓</span>':""}`);
    row.onclick=()=>{
      if(isConn) return;
      row.querySelector("small").textContent="Connecting…";
      setTimeout(()=>{ wifiConn=net.n; renderWifi(); },700+Math.random()*700);
    };
    w.appendChild(row);
  });
}

/* ============================ RECOVERY MODE (WinRE) ============================ */
function repairSystem(){
  const def=defaultFS();
  if(!VFS["C:"]) VFS["C:"]=def["C:"];
  const c=VFS["C:"];
  if(!c.children["Windows"]) c.children["Windows"]=def["C:"].children["Windows"];
  const w=c.children["Windows"];
  if(!w.children["System"]) w.children["System"]=def["C:"].children["Windows"].children["System"];
  const s=w.children["System"];
  const defSys=def["C:"].children["Windows"].children["System"].children;
  Object.keys(defSys).forEach(k=>{ if(!s.children[k]) s.children[k]=defSys[k]; });
  for(let i=RECYCLE.length-1;i>=0;i--){
    const r=RECYCLE[i];
    if(r.item&&(r.item.sys||r.name==="Windows"||r.name==="System")) RECYCLE.splice(i,1);
  }
  saveFS(); saveRecycle(); refreshFX(); applySystemHealth();
}
function bootRecovery(){
  stopAllEffectsUI();
  const R=$("#recovery"); R.style.display="flex";
  rScreen("preparing");
}
function rExit(){
  $("#recovery").style.display="none";
  $("#login").classList.remove("hide"); lgReset();
  applySystemHealth();
}
function rScreen(s){
  const R=$("#recovery");
  R.classList.toggle("black", ["preparing","diagnosing","restarting","off","srscan","resetting"].includes(s));
  const tiles=arr=>`<div class="r-tiles">${arr.map((t,i)=>
    `<div class="r-tile" data-i="${i}"><span class="ric">${t[0]}</span><div>${t[1]}${t[2]?`<small>${t[2]}</small>`:""}</div></div>`).join("")}</div>`;
  const wire=arr=>R.querySelectorAll(".r-tile").forEach(el2=>el2.onclick=()=>arr[+el2.dataset.i][3]());

  if(s==="preparing"){
    R.innerHTML=`<div class="r-center"><div class="r-spin"></div><div>Preparing Automatic Repair</div></div>`;
    setTimeout(()=>rScreen("diagnosing"),2200);
  }
  else if(s==="diagnosing"){
    R.innerHTML=`<div class="r-center"><div class="r-spin"></div><div>Diagnosing your PC</div></div>`;
    setTimeout(()=>rScreen("autofail"),2400);
  }
  else if(s==="autofail"){
    R.innerHTML=`<div class="r-wrap"><h1>Automatic Repair</h1>
      <h2>Your PC did not start correctly</h2>
      <div class="r-sub">A required system file is missing (<b>systemwinclone.sys</b>). Press “Restart” to restart your PC, which can sometimes fix the problem (it will not fix the problem). You can also press “Advanced options” to try other options to repair your PC.<br><br>
      Log file: C:\\Windows\\System32\\Logfiles\\Srt\\SrtTrail.txt</div>
      <div><button class="r-back" data-a="restart">Restart</button><button class="r-back" data-a="adv">Advanced options</button></div></div>`;
    R.querySelector('[data-a="restart"]').onclick=()=>rScreen("restarting");
    R.querySelector('[data-a="adv"]').onclick=()=>rScreen("choose");
  }
  else if(s==="restarting"){
    R.innerHTML=`<div class="r-center"><div class="r-spin"></div><div>Restarting</div></div>`;
    setTimeout(()=>{ systemStatus().critical ? rScreen("preparing") : rExit(); },2000);
  }
  else if(s==="choose"){
    const t=[
      ["➡️","Continue","Exit and continue to WinClone 12",()=>rExit()],
      ["🛠️","Troubleshoot","Reset your PC or see advanced options",()=>rScreen("troubleshoot")],
      ["⏻","Turn off your PC","",()=>rScreen("off")],
    ];
    R.innerHTML=`<div class="r-wrap"><h1>Choose an option</h1><br>${tiles(t)}</div>`;
    wire(t);
  }
  else if(s==="troubleshoot"){
    const t=[
      ["🔄","Reset this PC","Lets you choose to keep or remove your files, and then reinstalls WinClone",()=>rScreen("reset")],
      ["⚙️","Advanced options","",()=>rScreen("advanced")],
    ];
    R.innerHTML=`<div class="r-wrap"><h1>Troubleshoot</h1><br>${tiles(t)}<br><button class="r-back">← Back</button></div>`;
    wire(t); R.querySelector(".r-back").onclick=()=>rScreen("choose");
  }
  else if(s==="advanced"){
    const t=[
      ["🔧","Startup Repair","Fix problems that keep WinClone from loading",()=>rScreen("srscan")],
      ["⌨️","Command Prompt","Use the Command Prompt for advanced troubleshooting",()=>rScreen("cmd")],
      ["🖥️","UEFI Firmware Settings","Change settings in your PC's UEFI firmware",()=>{ $("#biosbtn").onclick(); }],
    ];
    R.innerHTML=`<div class="r-wrap"><h1>Advanced options</h1><br>${tiles(t)}<br><button class="r-back">← Back</button></div>`;
    wire(t); R.querySelector(".r-back").onclick=()=>rScreen("troubleshoot");
  }
  else if(s==="srscan"){
    R.innerHTML=`<div class="r-center"><div class="r-spin"></div><div>Diagnosing your PC</div><div style="font-size:13px;color:#9ab">Startup Repair is checking system files…</div></div>`;
    setTimeout(()=>{
      if(systemStatus().damaged){ repairSystem(); rScreen("srfixed"); }
      else rScreen("srfail");
    },3200);
  }
  else if(s==="srfixed"){
    R.innerHTML=`<div class="r-wrap"><h1>Startup Repair</h1>
      <h2>Startup Repair has repaired your PC</h2>
      <div class="r-sub">Missing system files were restored from the recovery image. Your files were not affected.<br>Restarting…</div></div>`;
    setTimeout(()=>rExit(),2600);
  }
  else if(s==="srfail"){
    R.innerHTML=`<div class="r-wrap"><h1>Startup Repair</h1>
      <h2>Startup Repair couldn't repair your PC</h2>
      <div class="r-sub">…because there was nothing wrong with it. Classic Startup Repair.<br><br>
      Log file: C:\\Windows\\System32\\Logfiles\\Srt\\SrtTrail.txt</div>
      <div><button class="r-back" data-a="off">Shut down</button><button class="r-back" data-a="adv">Advanced options</button></div></div>`;
    R.querySelector('[data-a="off"]').onclick=()=>rScreen("off");
    R.querySelector('[data-a="adv"]').onclick=()=>rScreen("advanced");
  }
  else if(s==="cmd"){
    R.innerHTML=`<div class="r-wrap" style="display:flex;flex-direction:column;align-items:flex-start">
      <h2 style="margin-bottom:10px">Administrator: Command Prompt</h2>
      <div class="r-term"></div><br><button class="r-back">← Back</button></div>`;
    R.querySelector(".r-back").onclick=()=>rScreen("advanced");
    const term=R.querySelector(".r-term");
    const print=t=>{ const d=el("div"); d.textContent=t; term.appendChild(d); term.scrollTop=term.scrollHeight; };
    print("WinClone Recovery Environment [Version 10.0.26100]");
    print("");
    function prompt(){
      const line=el("div"); line.style.display="flex";
      line.innerHTML=`<span>X:\\Sources&gt;</span>`;
      const inp=el("input"); inp.autocomplete="off"; inp.spellcheck=false;
      line.appendChild(inp); term.appendChild(line); inp.focus();
      term.onclick=()=>{ if(!getSelection().toString()){ const last=term.querySelector("input:not([disabled])"); if(last) last.focus(); } };
      inp.addEventListener("keydown",e=>{
        if(e.key!=="Enter") return;
        const cmd=inp.value.trim(); inp.disabled=true;
        const [c,...args]=cmd.split(/\s+/);
        switch((c||"").toLowerCase()){
          case "": break;
          case "help": print("Commands: sfc /scannow, dir, cls, bcdedit, exit"); break;
          case "cls": term.innerHTML=""; break;
          case "dir": print(" Directory of X:\\Sources"); print(""); print("   <DIR>  Recovery"); print("   <DIR>  SafeOS"); print("          boot.wim"); break;
          case "bcdedit": print("Windows Boot Manager"); print("identifier    {bootmgr}"); print("device        partition=C:"); print("description   WinClone Boot Manager (do not taunt)"); break;
          case "exit": rScreen("advanced"); return;
          case "sfc":
            if((args[0]||"").toLowerCase()!=="/scannow"){ print("Usage: sfc /scannow"); break; }
            print("Beginning system scan. This process will take some time.");
            print("");
            let pc=0;
            const iv=setInterval(()=>{
              pc+=20;
              print("Verification "+pc+"% complete.");
              if(pc>=100){
                clearInterval(iv);
                if(systemStatus().damaged){
                  repairSystem();
                  print("");
                  print("Windows Resource Protection found corrupt files and successfully repaired them.");
                  print("systemwinclone.sys ... RESTORED");
                  print("Reboot with 'exit' → Continue, or keep poking around.");
                }else{
                  print("");
                  print("Windows Resource Protection did not find any integrity violations.");
                }
                prompt();
              }
            },420);
            return;
          default: print("'"+c+"' is not recognized as an internal or external command,"); print("operable program or batch file.");
        }
        prompt();
      });
    }
    prompt();
  }
  else if(s==="reset"){
    const t=[
      ["📁","Keep my files","Just kidding — this is a factory reset either way. Everything goes back to default.",()=>rScreen("resetting")],
      ["🧹","Remove everything","Removes all of your personal files, apps, downloads and infections",()=>rScreen("resetting")],
    ];
    R.innerHTML=`<div class="r-wrap"><h1>Reset this PC</h1><h2>Choose an option</h2>${tiles(t)}<br><button class="r-back">← Back</button></div>`;
    wire(t); R.querySelector(".r-back").onclick=()=>rScreen("troubleshoot");
  }
  else if(s==="resetting"){
    R.innerHTML=`<div class="r-center"><div class="r-spin"></div><div>Resetting this PC (<span id="rst-pct">1</span>%)</div><div style="font-size:12px;color:#888">This will take a moment. Do not turn off your imaginary PC.</div></div>`;
    let p=1;
    const iv=setInterval(()=>{
      p+=Math.floor(Math.random()*9)+3;
      if(p>=100){
        p=100; clearInterval(iv);
        setTimeout(()=>{
          Object.keys(localStorage).filter(k=>k.startsWith("wc_")).forEach(k=>localStorage.removeItem(k));
          location.reload();
        },800);
      }
      const e2=$("#rst-pct"); if(e2) e2.textContent=p;
    },300);
  }
  else if(s==="off"){
    R.innerHTML=`<div class="r-center"><div class="r-spin"></div><div>Shutting down…</div></div>`;
    setTimeout(()=>rExit(),1800);
  }
}

/* ============================ WIRING ============================ */
$("#startbtn").onclick = ()=>{ renderStartGrid(""); toggleFlyout("#startmenu"); const s=$("#start-search"); s.value=""; setTimeout(()=>s.focus(),60); };
$("#searchbtn").onclick = ()=>{ renderStartGrid(""); toggleFlyout("#startmenu"); setTimeout(()=>$("#start-search").focus(),60); };
$("#quickbtn").onclick = ()=>{ toggleFlyout("#quick"); $("#wifilist").classList.add("open"); renderWifi(); };
$("#tray-clock").onclick = ()=>{ renderCalendar(); toggleFlyout("#cal"); };
$("#widgetsbtn").onclick = ()=>openApp("edge");
if($("#taskviewbtn")) $("#taskviewbtn").onclick = ()=>toggleTaskView();
$("#notifbtn").onclick = ()=>{ notifUnseen=0; notifBadge(); renderNotif(); toggleFlyout("#notif"); };
$("#notif-clear").onclick = ()=>{ NOTIFS=[]; saveNotifs(); renderNotif(); notifUnseen=0; notifBadge(); };
notifBadge();
$("#start-search").addEventListener("input", e=>renderStartGrid(e.target.value));
$("#start-search").addEventListener("keydown", e=>{
  if(e.key==="Enter"){ const first=$("#sm-list").querySelector(".sm-row"); if(first) first.click(); }
});
$("#powerbtn").onclick = (e)=>{ e.stopPropagation(); showPowerMenu(); };
$("#rail-settings").onclick = ()=>{ closeFlyouts(); openApp("settings"); };
$("#rail-user").onclick = ()=>{ closeFlyouts(); openApp("settings"); };
document.querySelectorAll("#notif .qs-tile").forEach(t=>t.onclick=()=>{
  t.classList.toggle("on");
  if(t.dataset.q==="wifi") renderWifi();
});

/* ---------- MASTER VOLUME ---------- */
let masterVol = parseInt(localStorage.getItem("wc_vol"),10);
if(isNaN(masterVol)) masterVol = 65;
function ytApply(f){ // push master volume/mute to one YouTube iframe via its JS API
  if(!f || !f.contentWindow) return;
  const send=o=>{ try{ f.contentWindow.postMessage(JSON.stringify(o), "https://www.youtube-nocookie.com"); }catch(e){} };
  if(masterVol===0){ send({event:"command",func:"mute",args:[]}); }
  else { send({event:"command",func:"unMute",args:[]}); send({event:"command",func:"setVolume",args:[masterVol]}); }
}
function applyVolume(v){
  masterVol = Math.max(0, Math.min(100, v|0));
  try{ localStorage.setItem("wc_vol", masterVol); }catch(e){}
  // real <video>/<audio> in the OS (future-proof; harmless now)
  document.querySelectorAll("video,audio").forEach(m=>{ try{ m.volume=masterVol/100; m.muted=masterVol===0; }catch(e){} });
  // any open YouTube players
  document.querySelectorAll("iframe").forEach(f=>{ if(f.src && f.src.indexOf("youtube")>=0) ytApply(f); });
  // icon reflects the level
  const ic = masterVol===0 ? "🔇" : masterVol<34 ? "🔈" : masterVol<67 ? "🔉" : "🔊";
  const vi=$("#vol-ic"); if(vi) vi.textContent=ic;
  document.querySelectorAll("#quickbtn .tray-ic").forEach(s=>{ if(/🔊|🔉|🔈|🔇/.test(s.textContent)) s.textContent=ic; });
}
(function(){ const vs=$("#vol"); if(vs){ vs.value=masterVol; vs.addEventListener("input",e=>applyVolume(+e.target.value)); } applyVolume(masterVol); })();

function doShutdown(){
  stopAllEffectsUI();
  const sd=$("#shutdown"); sd.style.display="flex"; $("#sd-text").textContent="Shutting down…";
  setTimeout(()=>{
    // close all windows, show login again
    Object.keys(state.wins).forEach(closeWin);
    sd.style.display="none";
    $("#login").classList.remove("hide");
    lgReset();
  }, 1800);
}

/* ---- MANUAL SYSTEM UPDATES ----
   WinClone boots an *installed* copy of app.js+styles.css from localStorage
   (wc_sys_js / wc_sys_css), loaded by the bootstrap in index.html. A new GitHub
   deploy is detected but NOT applied until the user chooses "Update and restart"
   from Start ▸ Power — so skipping the update keeps the old version running.
   (http/GitHub Pages only; on file:// the on-disk files always load and there is
   nothing to update against.) */
function wcHash(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0; return s.length+"-"+h.toString(16); }
function installedBuild(){ return wcHash((localStorage.getItem("wc_sys_js")||"")+"|"+(localStorage.getItem("wc_sys_css")||"")); }
function isHosted(){ return /^https?:$/.test(location.protocol); }
const UPD={available:false, latest:null, checking:false};
async function fetchLatestSys(){
  const bust=f=>fetch(f+"?v="+Date.now(),{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error("http "+r.status); return r.text(); });
  const [js,css]=await Promise.all([bust("app.js"),bust("styles.css")]);
  return {js,css,build:wcHash(js+"|"+css)};
}
async function checkForUpdates(opts){
  opts=opts||{};
  if(!isHosted()||!localStorage.getItem("wc_sys_js")) return false;   // file:// or not installed via bootstrap
  if(UPD.checking) return UPD.available;
  UPD.checking=true;
  try{
    const latest=await fetchLatestSys();
    UPD.latest=latest;
    UPD.available = latest.build!==installedBuild();
    reflectUpdateUI();
    if(UPD.available && opts.notify)
      notify({icon:"🔄",title:"Updates are available",body:"A new version of WinClone is ready. Open Start ▸ Power ▸ Update and restart to install it."});
    else if(!UPD.available && opts.toastIfNone)
      showToast({icon:"✅",title:"You're up to date",body:"WinClone is running the latest version."});
    return UPD.available;
  }catch(e){ return false; }
  finally{ UPD.checking=false; }
}
function reflectUpdateUI(){ document.body.classList.toggle("has-update", !!UPD.available); }
async function applyUpdate(){
  let latest=UPD.latest;
  try{ if(!latest) latest=await fetchLatestSys(); }
  catch(e){ winDialog({icon:"⚠️",title:"Update failed",msg:"Couldn't download the update.<br><small style='color:#9a9a9a'>Check your connection and try again.</small>"}); return; }
  try{
    localStorage.setItem("wc_sys_js",latest.js);
    localStorage.setItem("wc_sys_css",latest.css);
    // stamp the markup build this code was installed against (see HTML_BUILD in index.html)
    if(window.HTML_BUILD) localStorage.setItem("wc_sys_html", window.HTML_BUILD);
  }catch(e){ winDialog({icon:"⚠️",title:"Update failed",msg:"Not enough storage to install the update.<br><small style='color:#9a9a9a'>Free some space (delete large files/images) and try again.</small>"}); return; }
  UPD.available=false; reflectUpdateUI();
  runUpdateScreen(()=>location.reload());   // reload → bootstrap boots the newly-installed version
}
/* Start ▸ Power menu */
function showPowerMenu(){
  const btn=$("#powerbtn"); if(!btn) return;
  const r=btn.getBoundingClientRect();
  const items=[];
  if(UPD.available) items.push({icon:"🔄",label:"Update and restart",action:()=>{ closeFlyouts(); applyUpdate(); }});
  items.push(
    {icon:"🔁",label:"Restart",action:()=>{ closeFlyouts(); doRestart(); }},
    {icon:"⏻",label:"Shut down",action:()=>{ closeFlyouts(); doShutdown(); }},
    "sep",
    {icon:"🔎",label:"Check for updates",action:()=>{ closeFlyouts(); checkForUpdates({notify:true,toastIfNone:true}); }}
  );
  showCtx(r.left, r.top, items);
}
function doRestart(){
  stopAllEffectsUI();
  const sd=$("#shutdown"); sd.style.display="flex"; $("#sd-text").textContent="Restarting…";
  setTimeout(()=>location.reload(),1600);
}
function runUpdateScreen(done){
  $("#login").classList.add("hide");
  const u=$("#update"); if(!u){ done(); return; }
  u.style.display="flex";
  const pct=u.querySelector("#upd-pct"), msg=u.querySelector("#upd-msg");
  const steps=["Getting things ready","Downloading updates","Installing features","Configuring WinClone","Almost there"];
  let p=0;
  const iv=setInterval(()=>{
    p=Math.min(100,p+Math.random()*7+2);
    pct.textContent=Math.floor(p)+"% complete";
    msg.textContent=steps[Math.min(steps.length-1,Math.floor(p/20))];
    if(p>=100){ clearInterval(iv); setTimeout(()=>{ u.style.display="none"; done(); },1000); }
  },220);
}
/* "What's new" — shown once after an update (see the version check in doSignIn). */
function showWhatsNew(version, done){
  const changes = WC_CHANGELOG[version] || ["Various improvements and fixes."];
  const ov=el("div","whatsnew");
  ov.innerHTML=`<div class="wn-card">
    <div class="wn-emoji">🎉</div>
    <div class="wn-h">What's new in WinClone</div>
    <div class="wn-sub">You're now running version ${esc(version)}</div>
    <ul class="wn-list">${changes.map(c=>`<li>${esc(c)}</li>`).join("")}</ul>
    <button class="wn-go">Let's go</button>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(()=>ov.classList.add("show"),20);   // setTimeout (not rAF) so it reveals even in a background/non-painting tab
  const close=()=>{ ov.classList.remove("show"); setTimeout(()=>ov.remove(),260); if(done) done(); };
  ov.querySelector(".wn-go").onclick=close;
}

/* ============================ LOCK SCREEN / PASSWORD ============================
   A toy lock, NOT real security: the password and security answer live in this
   browser's localStorage, so anyone with devtools can read or clear them. The
   stored values are scrambled only so they aren't sitting there in plain text —
   never use a real password here. Locked out? BIOS ▸ Restore Factory Defaults
   (button on this screen) wipes everything, including the password. */
const PASS_KEY="wc_pass", SQ_KEY="wc_sq", SQA_KEY="wc_sqa";
const SEC_Q={pet:"What is your pet's name?", num:"What number between 1 and 999 did you pick?"};
function scramble(s){                       // djb2 — obfuscation, not cryptography
  let h=5381; s=String(s);
  for(let i=0;i<s.length;i++) h=((h*33) ^ s.charCodeAt(i))>>>0;
  return h.toString(36);
}
function normAnswer(v,kind){
  v=String(v||"").trim().toLowerCase();
  if(kind==="num") v=v.replace(/[^0-9]/g,"").replace(/^0+(?=\d)/,"");
  return v;
}
function hasPassword(){ return !!localStorage.getItem(PASS_KEY); }
function setPassword(p){ try{ localStorage.setItem(PASS_KEY, scramble(p)); }catch(e){} }
function checkPassword(p){ return hasPassword() && localStorage.getItem(PASS_KEY)===scramble(p); }
function setSecurity(kind,ans){
  try{ localStorage.setItem(SQ_KEY,kind); localStorage.setItem(SQA_KEY, scramble(normAnswer(ans,kind))); }catch(e){}
}
function checkSecurity(ans){
  const kind=localStorage.getItem(SQ_KEY);
  return !!kind && localStorage.getItem(SQA_KEY)===scramble(normAnswer(ans,kind));
}

let lgMode="signin", lgQpick=null;
function lgPanel(mode){
  lgMode=mode;
  ["signin","setup","recover"].forEach(m=>{
    const p=$("#lg-"+m); if(p) p.style.display=(m===mode)?"flex":"none";
  });
  document.querySelectorAll("#login .lg-err").forEach(e=>{ e.textContent=""; e.classList.remove("show"); });
  lgStep(mode,1);
}
function lgStep(mode,n){
  const p=$("#lg-"+mode); if(!p) return;
  p.querySelectorAll(".lg-step").forEach(s=>{ s.style.display=(+s.dataset.step===n)?"flex":"none"; });
}
function lgError(msg){
  const p=$("#lg-"+lgMode); if(!p) return;
  const e=p.querySelector(".lg-err");
  if(e){ e.textContent=msg; e.classList.toggle("show",!!msg); }
  if(msg){ sfx("error"); const u=$(".lg-user"); u.classList.remove("shake"); void u.offsetWidth; u.classList.add("shake"); }
}
/* decide which panel the lock screen should show, and reset its fields */
function lgReset(){
  ["lg-pass","lg-new1","lg-new2","lg-ans","lg-rans","lg-rnew1","lg-rnew2"].forEach(id=>{ const e=$("#"+id); if(e) e.value=""; });
  lgQpick=null;
  document.querySelectorAll(".lg-qbtn").forEach(b=>b.classList.remove("sel"));
  lgPanel(hasPassword() ? "signin" : "setup");
  const f=$(hasPassword() ? "#lg-pass" : "#lg-new1");
  setTimeout(()=>{ try{ f.focus(); }catch(e){} },150);
}

/* login */
function trySignIn(){
  const v=$("#lg-pass").value;
  if(!v){ lgError("Enter your password."); return; }
  if(!checkPassword(v)){ lgError("That password is incorrect. Try again."); $("#lg-pass").select(); return; }
  lgError(""); doSignIn();
}
function signIn(){ doSignIn(); }
function doSignIn(){
  sfx("startup");
  $("#login").classList.add("hide");
  setTimeout(()=>$("#lg-pass").blur(),100);
  applySystemHealth();
  refreshInfectionFX();
  ssArm();
  notify({icon:"👋",title:"Welcome back, "+getUser(),body:"You're signed in to WinClone."});
  setTimeout(()=>checkForUpdates({notify:true}), 3000);   // quietly look for a new version after login
  /* If the running version is newer than what we last showed, we just updated:
     reveal "What's new" once, then a confirmation toast. */
  const seen=localStorage.getItem("wc_seen_version");
  try{ localStorage.setItem("wc_seen_version", WC_VERSION); }catch(e){}
  if(seen && seen!==WC_VERSION){
    setTimeout(()=>showWhatsNew(WC_VERSION, ()=>showToast({icon:"🎉",title:"Update complete",body:"Now running WinClone v"+WC_VERSION+"."})), 900);
  }
  const st=systemStatus();
  if(st.critical){
    setTimeout(()=>winDialog({icon:"❌",title:"WinClone — Critical",
      msg:"<b>systemwinclone.sys</b> is missing. This session is on borrowed time.<br><small style='color:#9a9a9a'>Restore it from the Recycle Bin, or factory-reset from the BIOS.</small>"}),2500);
  }
}

/* ---- Screen saver: bouncing logo after idle; any input dismisses it ---- */
const SS_DELAY=60000; let ssTimer=null, ssRAF=null, ssActive=false;
function ssArm(){ clearTimeout(ssTimer); if(localStorage.getItem("wc_screensaver")==="off") return; ssTimer=setTimeout(ssStart,SS_DELAY); }
function ssStart(){
  if(ssActive) return;
  if(!$("#login").classList.contains("hide")||$("#shutdown").style.display==="flex"||$("#bsod").style.display==="flex"){ ssArm(); return; }
  ssActive=true;
  const ss=$("#screensaver"), logo=ss.querySelector(".ss-logo"); ss.style.display="block";
  let x=Math.random()*(innerWidth-240), y=Math.random()*(innerHeight-120), vx=1.7, vy=1.3;
  const recolor=()=>logo.style.color=`hsl(${Math.floor(Math.random()*360)},85%,66%)`; recolor();
  (function frame(){
    if(!ssActive) return;
    const w=logo.offsetWidth, h=logo.offsetHeight; x+=vx; y+=vy;
    if(x<=0||x+w>=innerWidth){ vx*=-1; x=Math.max(0,Math.min(x,innerWidth-w)); recolor(); }
    if(y<=0||y+h>=innerHeight){ vy*=-1; y=Math.max(0,Math.min(y,innerHeight-h)); recolor(); }
    logo.style.transform=`translate(${x}px,${y}px)`;
    ssRAF=requestAnimationFrame(frame);
  })();
}
function ssStop(){ ssActive=false; cancelAnimationFrame(ssRAF); const ss=$("#screensaver"); if(ss) ss.style.display="none"; ssArm(); }
["mousemove","mousedown","keydown","wheel","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{ if(ssActive) ssStop(); else ssArm(); },{passive:true}));
$("#lg-go").onclick = trySignIn;
$("#lg-pass").addEventListener("keydown", e=>{ if(e.key==="Enter") trySignIn(); });

/* ---- first-run setup: password, then a security question ---- */
$("#lg-next1").onclick = ()=>{
  const a=$("#lg-new1").value, b=$("#lg-new2").value;
  if(a.length<1){ lgError("Pick a password first."); return; }
  if(a!==b){ lgError("Those two passwords don't match."); $("#lg-new2").select(); return; }
  lgError(""); lgStep("setup",2);
  $("#lg-setup-title").textContent="Pick a security question";
  $("#lg-setup-sub").textContent="You'll answer this if you ever forget your password.";
};
document.querySelectorAll("#lg-setup .lg-qbtn").forEach(b=>{
  b.onclick=()=>{
    lgQpick=b.dataset.q;
    document.querySelectorAll("#lg-setup .lg-qbtn").forEach(x=>x.classList.toggle("sel",x===b));
    const ans=$("#lg-ans");
    ans.placeholder = lgQpick==="num" ? "A number from 1 to 999" : "Your pet's name";
    lgError(""); ans.focus();
  };
});
$("#lg-finish").onclick = ()=>{
  if(!lgQpick){ lgError("Choose one of the two questions."); return; }
  const raw=$("#lg-ans").value, ans=normAnswer(raw,lgQpick);
  if(!ans){ lgError("Type an answer so you can recover your account."); return; }
  if(lgQpick==="num"){
    const n=parseInt(ans,10);
    if(isNaN(n)||n<1||n>999){ lgError("Pick a whole number between 1 and 999."); $("#lg-ans").select(); return; }
  }
  setPassword($("#lg-new1").value);
  setSecurity(lgQpick,raw);
  lgError("");
  doSignIn();
  notify({icon:"🔐",title:"Password set",body:"You'll need it next time you sign in. Forgot it? Use the security question on the lock screen."});
};
["lg-new1","lg-new2"].forEach(id=>$("#"+id).addEventListener("keydown",e=>{ if(e.key==="Enter") $("#lg-next1").click(); }));
$("#lg-ans").addEventListener("keydown",e=>{ if(e.key==="Enter") $("#lg-finish").click(); });

/* ---- forgot password: answer the security question, then set a new one ---- */
$("#lg-forgot").onclick = ()=>{
  const kind=localStorage.getItem(SQ_KEY);
  if(!kind){                       // no question on file (older profile) — nothing to verify against
    lgError("No security question is set on this PC. Use ⚙ BIOS Setup ▸ Restore Factory Defaults.");
    return;
  }
  lgPanel("recover");
  $("#lg-rq").textContent=SEC_Q[kind]||"Security question";
  setTimeout(()=>$("#lg-rans").focus(),120);
};
$("#lg-rcheck").onclick = ()=>{
  const v=$("#lg-rans").value;
  if(!v.trim()){ lgError("Type your answer."); return; }
  if(!checkSecurity(v)){ lgError("That doesn't match the answer on file."); $("#lg-rans").select(); return; }
  lgError(""); lgStep("recover",2);
  setTimeout(()=>$("#lg-rnew1").focus(),120);
};
$("#lg-rsave").onclick = ()=>{
  const a=$("#lg-rnew1").value, b=$("#lg-rnew2").value;
  if(a.length<1){ lgError("Pick a new password."); return; }
  if(a!==b){ lgError("Those two passwords don't match."); $("#lg-rnew2").select(); return; }
  setPassword(a);
  lgError("");
  doSignIn();
  notify({icon:"🔑",title:"Password changed",body:"Your new password is saved. Your security question stayed the same."});
};
$("#lg-rback").onclick = ()=>{ lgPanel("signin"); setTimeout(()=>$("#lg-pass").focus(),120); };
$("#lg-rans").addEventListener("keydown",e=>{ if(e.key==="Enter") $("#lg-rcheck").click(); });
["lg-rnew1","lg-rnew2"].forEach(id=>$("#"+id).addEventListener("keydown",e=>{ if(e.key==="Enter") $("#lg-rsave").click(); }));

/* BIOS */
$("#biosbtn").onclick = ()=>{
  const st=systemStatus();
  const h=$("#bios-health");
  h.textContent = st.critical?"CRITICAL — system files missing":(st.damaged?"DEGRADED — system files missing":"OK");
  h.style.color = st.damaged?"#ff6b6b":"#7cfc00";
  const d=new Date();
  $("#bios-time").textContent=d.toLocaleTimeString();
  $("#bios-date").textContent=d.toLocaleDateString();
  $("#bios").style.display="flex";
};
$("#bios-exit").onclick = ()=>$("#bios").style.display="none";
$("#bios-reset").onclick = ()=>{
  $("#bios").style.display="none";
  const sd=$("#shutdown"); sd.style.display="flex";
  $("#sd-text").textContent="Reinstalling WinClone…";
  setTimeout(()=>{
    Object.keys(localStorage).filter(k=>k.startsWith("wc_")).forEach(k=>localStorage.removeItem(k));
    location.reload();
  },2200);
};

/* keyboard: Win-ish shortcuts */
document.addEventListener("keydown", e=>{
  if(e.key==="Escape") { closeFlyouts(); $("#ctx").style.display="none"; $("#bios").style.display="none"; }
});

/* drag-select marquee on the desktop (click empty wallpaper and drag) */
(function(){
  const desk=$("#desktop"); let mq=null,sx=0,sy=0;
  desk.addEventListener("mousedown",e=>{
    if(e.button!==0) return;
    if(e.target!==desk && e.target.id!=="icons") return;
    document.querySelectorAll(".dicon.sel").forEach(x=>x.classList.remove("sel"));
    sx=e.clientX; sy=e.clientY;
    const move=ev=>{
      if(!mq){ if(Math.abs(ev.clientX-sx)<4&&Math.abs(ev.clientY-sy)<4) return;
        mq=el("div"); mq.id="marquee"; desk.appendChild(mq); }   // inside #desktop so open windows stay above it
      const x=Math.min(sx,ev.clientX), y=Math.min(sy,ev.clientY);
      const w=Math.abs(ev.clientX-sx), h=Math.abs(ev.clientY-sy);
      Object.assign(mq.style,{left:x+"px",top:y+"px",width:w+"px",height:h+"px"});
      document.querySelectorAll(".dicon").forEach(i=>{
        const r=i.getBoundingClientRect();
        i.classList.toggle("sel", !(r.right<x||r.left>x+w||r.bottom<y||r.top>y+h));
      });
    };
    const up=()=>{ document.removeEventListener("mousemove",move); document.removeEventListener("mouseup",up); if(mq){mq.remove();mq=null;} };
    document.addEventListener("mousemove",move);
    document.addEventListener("mouseup",up);
  });
})();

/* the classic Show Desktop sliver at the taskbar's far right */
let DESK_STASH=null;
$("#showdesk").onclick=()=>{
  const vis=Object.keys(state.wins).filter(id=>!state.wins[id].min);
  if(vis.length){ DESK_STASH=vis; vis.forEach(id=>toggleMin(id,true)); }
  else if(DESK_STASH){ DESK_STASH.filter(id=>state.wins[id]).forEach(id=>toggleMin(id,false)); DESK_STASH=null; }
};

/* drop onto the wallpaper: reposition a desktop icon, or move a file here from elsewhere */
(function(){
  const desk=$("#desktop");
  desk.addEventListener("dragover",e=>{
    if(e.target.closest(".window")) return;
    if(ICONDRAG){ e.preventDefault(); return; }           // repositioning: allow the drop, no import outline
    if(DRAG && !e.target.closest(".dicon")){ e.preventDefault(); desk.classList.add("drop-target"); }
  });
  desk.addEventListener("dragleave",e=>{ if(e.target===desk||e.target.id==="icons") desk.classList.remove("drop-target"); });
  desk.addEventListener("drop",e=>{
    if(e.target.closest(".window")) return;
    if(ICONDRAG){                                          // snap the dragged icon to a grid cell
      e.preventDefault(); desk.classList.remove("drop-target");
      placeIconAt(ICONDRAG.key, e.clientX-ICONDRAG.dx, e.clientY-ICONDRAG.dy);
      ICONDRAG=null;
      return;
    }
    if(!DRAG) return;
    if(e.target.closest(".dicon")) return;
    e.preventDefault(); desk.classList.remove("drop-target");
    moveItem(DRAG.path,DRAG.name,[...HOME_PATH,"Desktop"]);
  });
  addEventListener("resize",()=>{ clearTimeout(desk._rz); desk._rz=setTimeout(renderDesktopIcons,150); });
})();

/* boot */
renderDesktopIcons();
renderTaskbarPins();
renderStartGrid("");
tick(); setInterval(tick,1000);
document.body.classList.toggle("glitch", systemStatus().damaged);
const savedTheme=localStorage.getItem("wc_theme");
if(savedTheme){ const d=$("#desktop"); d.classList.toggle("dark",savedTheme==="dark"); d.classList.toggle("light",savedTheme!=="dark"); }
const savedAccent=localStorage.getItem("wc_accent");
if(savedAccent){ const [a,s]=savedAccent.split("|"); if(a) document.documentElement.style.setProperty("--accent",a); if(s) document.documentElement.style.setProperty("--accent-solid",s); }
applyUserUI();
const savedWall=localStorage.getItem("wc_wall");
if(savedWall) applyWallpaper(savedWall);
lgReset();   // shows the sign-in box, or the forced first-run setup if no password exists
/* boot splash: spin the dots for a moment, then reveal the lock screen */
setTimeout(()=>{ const b=$("#boot"); if(b) b.classList.add("hide"); }, 2300);
