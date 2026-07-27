/*!
 * WinClone — a FAN-MADE CONCEPT: a desktop-OS tribute that lives in a browser tab.
 *
 * Copyright (c) 2026 Atlas. All rights reserved.
 *
 * FAN PROJECT / CONCEPT PIECE. Not a real operating system. Not Microsoft
 * Windows. Contains no Microsoft code, artwork or assets — every part was
 * written from scratch. Not affiliated with, endorsed by or connected to
 * Microsoft Corporation. Free, never sold. "Windows" and "Microsoft" are
 * trademarks of their respective owners, referenced descriptively only.
 *
 * This file is the original work of Atlas. Read it, learn from it, modify your
 * own private copy, fork it on GitHub. Do NOT rehost or republish it as a site
 * of your own, or strip this notice. Full terms: see LICENSE.txt.
 */
"use strict";
/* ============================ VERSION ============================
   Bump WC_VERSION every release and add a matching WC_CHANGELOG entry.
   After an update, the new version's changelog is shown once on the next
   sign-in ("What's new"), and `winver` in the Terminal reports the version. */
const WC_VERSION = "1.1.0";
const WC_CHANGELOG = {
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
  archive:   {title:"Archive",       icon:"🗜️", w:560, h:420, build:buildArchive, hidden:true},
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
  archive: "linear-gradient(135deg,#6b7280,#d1d5db)",
  htmlview:"linear-gradient(135deg,#c2410c,#fb923c)",
  batch:   "linear-gradient(135deg,#18181b,#3f3f46)",
};
const PINNED = ["edge","explorer","notepad","docs","calc","photos","settings","terminal","defender","recycle"];
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
const state = {z:20, wins:{}, focused:null};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function el(tag, cls, html){const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e;}
const deskArea = () => ({w:innerWidth, h:innerHeight-40});   // 40 = taskbar height (--tb-h)

/* ============================ WINDOW MANAGER ============================ */
function openApp(id){
  const app = APPS[id]; if(!app) return;
  if(state.wins[id]){ const w=state.wins[id]; if(w.min) toggleMin(id,false); focusWin(id); return; }

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

  const rec = {el:win, appId:id, min:false, max:false, prev:null};
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
  document.querySelectorAll(".window").forEach(w=>w.classList.toggle("focused", w===rec.el));
  updateTaskItems();
}
function closeWin(id){
  const rec = state.wins[id]; if(!rec) return;
  rec.el.classList.remove("show");
  setTimeout(()=>rec.el.remove(),140);
  delete state.wins[id];
  removeTaskItem(id);
  updateTaskItems();
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
function updateTaskItems(){
  document.querySelectorAll("#tb-apps .tbtn").forEach(b=>{
    const id=b.dataset.app, rec=state.wins[id];
    b.classList.toggle("run", !!rec);
    b.classList.toggle("active", !!rec && !rec.min && state.focused===id);
  });
}
function taskClick(id){
  const rec = state.wins[id];
  if(!rec){ openApp(id); return; }
  if(rec.min){ toggleMin(id,false); focusWin(id); }
  else if(state.focused===id){ toggleMin(id,true); }
  else focusWin(id);
}

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
      case "help": printHtml(`<span class="cyan">Files:</span>  dir/ls  cd  pwd  cat/type  mkdir  del/erase  tree  &lt;script&gt;.bat<br><span class="cyan">System:</span> ver  winver  license  whatsnew  date  time  whoami  hostname  ipconfig  neofetch  color  history  cls/clear  shutdown  exit<br><span class="cyan">Apps:</span>   start &lt;app&gt;  calc  notepad  edge  (or any app id)<br><span class="cyan">Fun:</span>    echo  cowsay  matrix  winget  fortune  sudo`); break;
      case "cls": case "clear": term.innerHTML=""; break;
      case "ver": print("WinClone [Version 10.0.26100]"); break;
      case "winver":
        winDialog({icon:"🪟",title:"About WinClone",
          msg:`<div style="line-height:1.55"><b>WinClone</b> 12 Pro<br>
          Version <b>${esc(WC_VERSION)}</b><br>
          Build ${esc(isHosted()?installedBuild():"local (file://)")}<br><br>
          <b style="color:#f7a233">FANMADE / CONCEPT</b><br>
          Created by <b>Atlas</b> — © 2026 Atlas. All rights reserved.<br>
          <small style="color:#9a9a9a">A fan-made concept piece, not a real operating system and not
          Microsoft Windows. Contains no Microsoft assets. Not affiliated with, endorsed by or
          connected to Microsoft Corporation. Free, never sold.<br>
          Rehosting as your own is prohibited — type <b>license</b> for terms.</small></div>`});
        break;
      case "license": case "copyright":
        printHtml(`<span class="cyan">WinClone</span> — a <b>FANMADE / CONCEPT</b> project.<br>`+
          `© 2026 Atlas. All rights reserved.<br><br>`+
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
      case "start": case "open": if(APPS[args[0]]) openApp(args[0]); else print("Unknown app: "+(a||"")); break;
      case "exit": closeWin("terminal"); break;
      default: {
        if(APPS[c]){ openApp(c); break; }
        const kids=(node()||{}).children||{}, tok=parts[0];
        const bn = (kids[tok]&&!kids[tok].folder) ? tok : (kids[tok+".bat"]?tok+".bat":kids[tok+".cmd"]?tok+".cmd":null);
        if(bn && /\.(bat|cmd)$/i.test(bn)){ openBatch({path:[...cwd],name:bn}); break; }
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
  else if(item.exe||item.malware||lo.endsWith(".exe")) runFile(name,item);
  else openFileInNotepad({path:[...path],name}); // txt, md, json, log, rtf, csv, ini, bat, unknown-with-content
}
/* context menu for a file/folder, reused by Explorer + Desktop */
function fsItemMenu(x,y,path,name,item,extra){
  const items=[{icon:"📂",label:"Open",action:()=>fsOpen(path,name,item)}];
  if(/\.(bat|cmd)$/i.test(name) && !item.web)
    items.push({icon:"📝",label:"Edit",action:()=>openFileInNotepad({path:[...path],name})});
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

/* ---- master effect controller ---- */
function refreshInfectionFX(){
  const on=loggedIn();
  clearInterval(adTimer); adTimer=null;
  if(on && hasKind("scareware")){ setTimeout(spawnAd,1400); adTimer=setInterval(spawnAd,11000); }
  (on&&hasKind("backdoor"))?startBackdoor():stopBackdoor();
  (on&&hasKind("miner"))?startMiner():stopMiner();
  (on&&hasKind("keylogger"))?startKeylogger():stopKeylogger();
  (on&&hasKind("spyware"))?startSpyware():stopSpyware();
  clearInterval(wormTimer); wormTimer=null;
  if(on && hasKind("worm")) wormTimer=setInterval(wormSpread,9000);
  if(on && hasKind("ransomware")) showRansom(); else if(!hasKind("ransomware")) hideRansom(false);
}
function stopAllEffectsUI(){
  clearInterval(adTimer); adTimer=null;
  stopBackdoor(); stopMiner(); stopKeylogger(); stopSpyware();
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
const IE_TEXT_EXTS=["txt","html","htm","rtf","csv","ini","md","json","log","bat"];
const IE_ACCEPT=".txt,.html,.htm,.docx,.wcdocs,.rtf,.csv,.ini,.md,.json,.log,.bat,.bmp,.zip,.rar";

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
          <b style="color:#eaeaea">Atlas</b> — a hobby tribute to desktop operating
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
          © 2026 Atlas. All rights reserved.<br><br>
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
