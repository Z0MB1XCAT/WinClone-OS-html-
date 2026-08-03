/*!
 * Macrohard Edgy — a third-party browser app for WinClone.
 *
 * This file is a self-contained plugin: it does not modify app.js, styles.css
 * or the WinClone core in any way. It waits for the OS to finish booting,
 * then registers itself into the same APPS registry every built-in app uses
 * (APPS.edge, APPS.explorer, ...), so WinClone treats it like any other app —
 * desktop icon, Start menu entry, taskbar button, window chrome, all for free.
 *
 * Unlike the built-in "Microsoft Edge" (which fakes its search results),
 * Macrohard Edgy's home page and address bar hit a *real* search engine —
 * DuckDuckGo's plain-HTML results endpoint — in a sandboxed iframe, the same
 * technique the built-in Edge uses for real sites like Wikipedia. Big sites
 * that refuse to be framed (Google, YouTube, Instagram, ...) still refuse
 * here too; that's a security header those sites set on their own servers,
 * not something a front-end can talk them out of.
 */
(function(){
  "use strict";

  function install(){
    if(APPS.edgy) return; // don't double-install if this file loads twice

    APPS.edgy = {
      title: "Macrohard Edgy",
      icon: "🧭",
      w: 900, h: 620,
      build: buildEdgy,
    };
    TILE_BG.edgy = "linear-gradient(135deg,#5b21b6,#38bdf8)";

    const edgeIdx = DESKTOP_ICONS.findIndex(d=>d.app==="edge");
    if(!DESKTOP_ICONS.some(d=>d.app==="edgy")){
      DESKTOP_ICONS.splice(edgeIdx>=0 ? edgeIdx+1 : DESKTOP_ICONS.length, 0, {app:"edgy", label:"Macrohard Edgy"});
    }
    const pinIdx = PINNED.indexOf("edge");
    if(!PINNED.includes("edgy")) PINNED.splice(pinIdx>=0 ? pinIdx+1 : PINNED.length, 0, "edgy");

    injectStyles();
    if(typeof renderDesktopIcons==="function") renderDesktopIcons();
  }

  function injectStyles(){
    if(document.getElementById("edgy-styles")) return;
    const css = `
      .edgy{display:flex;flex-direction:column;height:100%;background:#202124;color:#e8eaed}
      .edgy-tabbar{display:flex;align-items:flex-end;background:#202124;padding:6px 6px 0;gap:4px;flex:0 0 auto;overflow-x:auto}
      .edgy-tab{display:flex;align-items:center;gap:6px;max-width:180px;min-width:110px;background:#35363a;
        border-radius:8px 8px 0 0;padding:7px 6px 7px 12px;font-size:12px;color:#c7c8cc;cursor:default;
        white-space:nowrap;overflow:hidden;flex:0 0 auto}
      .edgy-tab.active{background:#fff;color:#202124}
      .edgy-tab .tico{font-size:13px;flex:0 0 auto}
      .edgy-tab .ttitle{overflow:hidden;text-overflow:ellipsis;flex:1}
      .edgy-tab .tclose{opacity:.55;border-radius:50%;width:18px;height:18px;flex:0 0 auto;display:grid;place-items:center;font-size:12px}
      .edgy-tab .tclose:hover{background:rgba(0,0,0,.15);opacity:1}
      .edgy-newtab{width:28px;height:28px;border:0;background:transparent;color:#c7c8cc;font-size:17px;border-radius:6px;flex:0 0 auto;margin-bottom:2px}
      .edgy-newtab:hover{background:rgba(255,255,255,.12)}
      .edgy-toolbar{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fff;flex:0 0 auto;border-bottom:1px solid #e2e2e2}
      .edgy-nav{width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:#444;font-size:15px;flex:0 0 auto}
      .edgy-nav:hover{background:rgba(0,0,0,.08)}
      .edgy-nav:disabled{opacity:.3}
      .edgy-addr{flex:1;display:flex;align-items:center;gap:6px;height:32px;border-radius:16px;border:1px solid #dcdcdc;background:#f1f3f4;padding:0 12px}
      .edgy-addr input{flex:1;border:0;background:transparent;outline:none;font-size:13px;color:#222}
      .edgy-lock{font-size:11px;opacity:.7}
      .edgy-star{width:30px;height:30px;border:0;border-radius:50%;background:transparent;font-size:15px;color:#b8860b;flex:0 0 auto}
      .edgy-star:hover{background:rgba(0,0,0,.08)}
      .edgy-star:disabled{opacity:.3}
      .edgy-bookmarks{display:flex;gap:2px;padding:5px 10px;background:#fff;border-bottom:1px solid #eee;flex:0 0 auto;overflow-x:auto}
      .edgy-bookmarks a{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#3c4043;padding:4px 8px;border-radius:5px;white-space:nowrap;cursor:default}
      .edgy-bookmarks a:hover{background:#f1f3f4}
      .edgy-pages{flex:1;position:relative;background:#fff;overflow:hidden}
      .edgy-page{position:absolute;inset:0;display:none;flex-direction:column;overflow:auto}
      .edgy-page.active{display:flex}
      .edgy-home{align-items:center;padding-top:52px}
      .edgy-home .logo{font-size:38px;font-weight:700;letter-spacing:-1px;margin-bottom:22px;color:#202124;display:flex;align-items:center;gap:10px}
      .edgy-search{width:min(560px,86%);height:48px;border-radius:24px;border:1px solid #dadce0;
        box-shadow:0 2px 10px rgba(0,0,0,.06);padding:0 20px;font-size:15px;outline:none;color:#222}
      .edgy-search:focus{box-shadow:0 2px 14px rgba(0,0,0,.14)}
      .edgy-shortcuts{display:flex;gap:16px;margin-top:32px;flex-wrap:wrap;justify-content:center;max-width:640px}
      .edgy-shortcuts a{display:flex;flex-direction:column;align-items:center;gap:7px;width:76px;color:#333;font-size:11.5px;text-align:center;cursor:default}
      .edgy-shortcuts a .gl{font-size:26px;width:52px;height:52px;background:#f1f3f4;border-radius:14px;display:grid;place-items:center}
      .edgy-shortcuts a:hover .gl{background:#e8eaed}
      .edgy-site{padding:0!important;align-items:stretch!important}
      .edgy-frame{flex:1;border:0;width:100%;height:100%;background:#fff;opacity:0;transition:opacity .18s}
      .edgy-load{margin:auto;color:#7a7a7a;font-size:13px;display:flex;align-items:center;gap:10px}
      .edgy-load::before{content:"";width:16px;height:16px;border:2px solid #c9ced4;border-top-color:#5b21b6;border-radius:50%;animation:edgyspin .7s linear infinite}
      @keyframes edgyspin{to{transform:rotate(360deg)}}
      .edgy-reject{margin:auto;text-align:center;color:#555;display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px;max-width:420px}
      .edgy-reject .em{font-size:56px}
      .edgy-reject b{font-size:18px;color:#222}
      .edgy-reject .rj-sub{font-size:12.5px;line-height:1.55}
      .edgy-reject .rj-btns{display:flex;gap:10px;margin-top:2px}
      .edgy-btn{border:1px solid #d3d3d3;background:#fff;border-radius:16px;padding:7px 16px;font-size:12.5px;cursor:default;color:#333}
      .edgy-btn:hover{background:#f4f4f4}
      .edgy-btn.pri{background:#5b21b6;border-color:#5b21b6;color:#fff}
      .edgy-btn.pri:hover{background:#4c1d95}
      .edgy-openreal{font-size:11.5px;color:#5b21b6;text-decoration:underline;cursor:pointer;margin-top:2px}
    `;
    const st = document.createElement("style");
    st.id = "edgy-styles";
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* seed bookmarks from the same curated, already-frame-friendly list the
     built-in Edge ships with, then let the star button grow it — persisted
     separately from Edge's own bookmarks. */
  const EDGY_BM_KEY = "wc_edgy_bookmarks";
  function loadBookmarks(){
    try{
      const saved = JSON.parse(localStorage.getItem(EDGY_BM_KEY));
      if(Array.isArray(saved)) return saved;
    }catch(e){}
    return EDGE_BOOKMARKS.slice();
  }
  function saveBookmarks(list){ try{ localStorage.setItem(EDGY_BM_KEY, JSON.stringify(list)); }catch(e){} }

  /* Same known frame-blocking giants the built-in Edge avoids wasting a
     timeout on — minus duckduckgo.com, since Edgy's search actually uses a
     duckduckgo.com subdomain that (unlike the main site) allows framing.
     Computed lazily (not at script load) since EDGE_BLOCKED belongs to
     app.js and may not exist yet the instant this file starts running. */
  let edgyBlockedListCache = null;
  function edgyBlocked(u){
    if(!edgyBlockedListCache) edgyBlockedListCache = EDGE_BLOCKED.filter(d=>d!=="duckduckgo.com");
    let h; try{ h=new URL(u).hostname.toLowerCase(); }catch(e){ return false; }
    return edgyBlockedListCache.some(d=> h===d || h.endsWith("."+d));
  }
  function hostOf(u){ try{ return new URL(u).hostname||u; }catch(e){ return u; } }

  function buildEdgy(body, winEl){
    body.innerHTML = `
      <div class="edgy">
        <div class="edgy-tabbar"><div class="edgy-tabs"></div><button class="edgy-newtab" title="New tab (Ctrl+T)">+</button></div>
        <div class="edgy-toolbar">
          <button class="edgy-nav" data-b title="Back">←</button>
          <button class="edgy-nav" data-f title="Forward">→</button>
          <button class="edgy-nav" data-r title="Reload">⟳</button>
          <button class="edgy-nav" data-home title="Home">⌂</button>
          <div class="edgy-addr"><span class="edgy-lock">🔒</span><input class="edgy-url" spellcheck="false" placeholder="Search DuckDuckGo or enter a web address"></div>
          <button class="edgy-star" title="Bookmark this page">☆</button>
        </div>
        <div class="edgy-bookmarks"></div>
        <div class="edgy-pages"></div>
      </div>`;

    const tabsEl = body.querySelector(".edgy-tabs");
    const pagesEl = body.querySelector(".edgy-pages");
    const urlInput = body.querySelector(".edgy-url");
    const bmBar = body.querySelector(".edgy-bookmarks");
    const backBtn = body.querySelector("[data-b]"), fwdBtn = body.querySelector("[data-f]");
    const starBtn = body.querySelector(".edgy-star");

    let bookmarks = loadBookmarks();
    let tabs = [], activeId = null, seq = 0;

    function active(){ return tabs.find(t=>t.id===activeId); }

    function renderBookmarksBar(){
      bmBar.innerHTML = "";
      bookmarks.forEach(b=>{
        const a = el("a"); a.innerHTML = `<span>${b.icon||"🌐"}</span><span>${esc(b.name)}</span>`;
        a.onclick = ()=>go(active(), b.url);
        bmBar.appendChild(a);
      });
    }

    function updateStar(t){
      if(!t || !t.displayUrl){ starBtn.textContent="☆"; starBtn.disabled=true; return; }
      starBtn.disabled=false;
      starBtn.textContent = bookmarks.some(b=>b.url===t.displayUrl) ? "★" : "☆";
    }
    starBtn.onclick = ()=>{
      const t=active(); if(!t || !t.displayUrl) return;
      const i = bookmarks.findIndex(b=>b.url===t.displayUrl);
      if(i>=0) bookmarks.splice(i,1);
      else bookmarks.push({name:t.title||hostOf(t.displayUrl), url:t.displayUrl, icon:"🌐"});
      saveBookmarks(bookmarks); renderBookmarksBar(); updateStar(t);
    };

    function updateNavButtons(t){
      backBtn.disabled = !(t && t.si>0);
      fwdBtn.disabled = !(t && t.si<t.stack.length-1);
    }
    function syncChrome(t){
      if(!t || t.id!==activeId) return;
      urlInput.value = t.displayUrl || "";
      updateStar(t); updateNavButtons(t);
    }
    function renderTabs(){
      tabsEl.innerHTML = "";
      tabs.forEach(t=>{
        const row = el("div","edgy-tab"+(t.id===activeId?" active":""));
        row.innerHTML = `<span class="tico">${t.icon}</span><span class="ttitle">${esc(t.title)}</span><span class="tclose">✕</span>`;
        row.onclick = e=>{ if(e.target.classList.contains("tclose")) closeTab(t.id); else switchTab(t.id); };
        tabsEl.appendChild(row);
      });
    }

    function newTab(url){
      const id = "t"+(++seq);
      const pageEl = el("div","edgy-page");
      pagesEl.appendChild(pageEl);
      const tab = {id, pageEl, stack:[], si:-1, title:"New tab", icon:"🧭", displayUrl:""};
      tabs.push(tab);
      switchTab(id);
      go(tab, url);
      return tab;
    }
    function closeTab(id){
      const i = tabs.findIndex(t=>t.id===id); if(i<0) return;
      tabs[i].pageEl.remove();
      tabs.splice(i,1);
      if(!tabs.length){ if(typeof closeWin==="function") closeWin("edgy"); return; }
      if(activeId===id) switchTab(tabs[Math.max(0,i-1)].id);
      else renderTabs();
    }
    function switchTab(id){
      activeId = id;
      tabs.forEach(t=>t.pageEl.classList.toggle("active", t.id===id));
      renderTabs();
      syncChrome(active());
    }

    function navTo(t, loc){
      t.stack = t.stack.slice(0, t.si+1);
      t.stack.push(loc);
      t.si = t.stack.length-1;
      render(t);
    }
    function go(t, raw){
      if(!t) return;
      const q=(raw||"").trim();
      if(!q || q.toLowerCase()==="home"){ navTo(t,{type:"home"}); return; }
      const looksUrl = /^https?:\/\//.test(q) || (/^[^\s]+\.[a-z]{2,}(\/|$|\?|#)/i.test(q) && !/\s/.test(q));
      const u = looksUrl ? (/^https?:\/\//.test(q) ? q : "https://"+q)
                          : "https://html.duckduckgo.com/html/?q="+encodeURIComponent(q);
      const path=u.split("#")[0].split("?")[0], last=path.split("/").pop()||"";
      if(EDGE_DL_RE.test(last)){ downloadFromWeb(u); return; }
      navTo(t, {type:"site", u});
    }
    function render(t){
      const loc = t.stack[t.si];
      if(!loc || loc.type==="home") home(t);
      else loadSite(t, loc.u);
    }

    function home(t){
      t.displayUrl = ""; t.title = "New tab"; t.icon = "🧭";
      t.pageEl.className = "edgy-page edgy-home"+(t.id===activeId?" active":"");
      t.pageEl.innerHTML = `
        <div class="logo">🧭 Macrohard Edgy</div>
        <input class="edgy-search" placeholder="Search DuckDuckGo or enter a web address">
        <div class="edgy-shortcuts"></div>`;
      const search = t.pageEl.querySelector(".edgy-search");
      search.addEventListener("keydown", e=>{ if(e.key==="Enter" && search.value.trim()) go(t, search.value); });
      const sc = t.pageEl.querySelector(".edgy-shortcuts");
      bookmarks.forEach(b=>{
        const a=el("a"); a.innerHTML = `<span class="gl">${b.icon||"🌐"}</span>${esc(b.name)}`;
        a.onclick = ()=>go(t, b.url); sc.appendChild(a);
      });
      renderTabs(); syncChrome(t);
    }

    /* real page in a sandboxed iframe, same locked-down approach the
       built-in Edge uses — genuinely fetches the live site or live search
       results, but can't reach anything of WinClone's. */
    function loadSite(t, u){
      t.displayUrl = u; t.title = hostOf(u); t.icon = "🌐";
      if(edgyBlocked(u)){ showRejected(t,u); return; }
      t.pageEl.className = "edgy-page edgy-site"+(t.id===activeId?" active":"");
      t.pageEl.innerHTML = `<div class="edgy-load">Loading ${esc(hostOf(u))}…</div>
        <iframe class="edgy-frame" referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"></iframe>`;
      const frame = t.pageEl.querySelector(".edgy-frame"), load = t.pageEl.querySelector(".edgy-load");
      let done=false;
      const timer = setTimeout(()=>{ if(!done){ done=true; showRejected(t,u); } }, 8000);
      frame.addEventListener("load", ()=>{ if(done) return; done=true; clearTimeout(timer); if(load) load.remove(); frame.style.opacity=1; });
      frame.src = u;
      renderTabs(); syncChrome(t);
    }
    function showRejected(t, u){
      t.pageEl.className = "edgy-page"+(t.id===activeId?" active":"");
      t.pageEl.innerHTML = `<div class="edgy-reject">
        <div class="em">🚧</div>
        <b>${esc(hostOf(u))} won't load here</b>
        <div class="rj-sub">This site tells browsers not to show it inside another page (a real security rule it sets itself) — the same reason it wouldn't load in Microsoft Edge here either.</div>
        <div class="rj-btns">
          <button class="edgy-btn pri" data-retry>Try again</button>
          <button class="edgy-btn" data-home>Go home</button>
        </div>
        <a class="edgy-openreal" data-real target="_blank" rel="noopener noreferrer" href="${esc(u)}">Open the real page in a new browser tab ↗</a>
      </div>`;
      t.pageEl.querySelector("[data-retry]").onclick = ()=>loadSite(t,u);
      t.pageEl.querySelector("[data-home]").onclick = ()=>go(t,"home");
      renderTabs(); syncChrome(t);
    }

    /* "download" a web file into the VFS Downloads folder, exactly like the
       built-in Edge does — never touches the real disk. */
    function downloadFromWeb(u){
      const path=u.split("#")[0].split("?")[0];
      let fname=decodeURIComponent(path.split("/").pop()||"download").replace(/[\\/:*?"<>|]/g,"_")||"download";
      const dls=nodeAt([...HOME_PATH,"Downloads"]);
      if(!dls){ winDialog({icon:"⚠️",title:"Download",msg:"The Downloads folder is missing."}); return; }
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
    }

    body.querySelector(".edgy-newtab").onclick = ()=>newTab();
    backBtn.onclick = ()=>{ const t=active(); if(t && t.si>0){ t.si--; render(t); } };
    fwdBtn.onclick  = ()=>{ const t=active(); if(t && t.si<t.stack.length-1){ t.si++; render(t); } };
    body.querySelector("[data-r]").onclick = ()=>{ const t=active(); if(t) render(t); };
    body.querySelector("[data-home]").onclick = ()=>go(active(),"home");
    urlInput.addEventListener("keydown", e=>{ if(e.key==="Enter" && urlInput.value.trim()) go(active(), urlInput.value); });
    if(winEl) winEl.addEventListener("keydown", e=>{
      if(!(e.ctrlKey||e.metaKey)) return;
      if(e.key==="t"){ e.preventDefault(); newTab(); }
      else if(e.key==="w"){ e.preventDefault(); closeTab(activeId); }
      else if(e.key==="l"){ e.preventDefault(); urlInput.focus(); urlInput.select(); }
    });

    renderBookmarksBar();
    newTab();
  }

  (function waitForOS(){
    if(typeof APPS==="undefined" || typeof el!=="function" || typeof EDGE_BOOKMARKS==="undefined"){
      setTimeout(waitForOS, 25);
      return;
    }
    install();
  })();
})();
