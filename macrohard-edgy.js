/*!
 * Macrohard Edgy, a third-party browser app for WinClone.
 *
 * This file is a self-contained plugin: it does not modify app.js, styles.css
 * or the WinClone core in any way. It waits for the OS to finish booting,
 * then registers itself into the same APPS registry every built-in app uses
 * (APPS.edge, APPS.explorer, ...), so WinClone treats it like any other app,
 * with a desktop icon, Start menu entry, taskbar button and window chrome
 * all for free.
 *
 * Unlike the built-in "Microsoft Edge" (which fakes its search results),
 * typing a search on Macrohard Edgy's home page or address bar shows real,
 * live web results right inside the window. This points the iframe at a
 * small proxy on the user's own AI backend: that server calls a real search
 * API and hands the results back from its own domain, which sets no
 * framing restriction (an actual search-engine results page would refuse to
 * be framed directly). Typed URLs and bookmarks load the same way, straight
 * in a sandboxed iframe, the technique the built-in Edge uses for real
 * sites like Wikipedia. Sites that refuse to be framed (Google, YouTube,
 * Instagram, ...) get a graceful "won't load here" screen instead.
 *
 * Also has: light/dark mode, page zoom, real history, incognito tabs, a tab
 * overflow menu, drag-to-reorder tabs, live favicons, and a collapsible AI
 * sidebar that embeds a separately-hosted chat assistant.
 */
(function(){
  "use strict";

  /* the user's own AI chat app (its own site, its own backend/API key).
     This plugin frames its chat page as the AI sidebar, and also uses its
     /search route (a real search API, proxied so results can be framed)
     for search results, and its /proxy route as a fallback for sites that
     block framing directly or fail to load - none of these call any AI
     API, they're all just the same "fetch server-side, serve from a domain
     that doesn't send a blocking header" trick applied to different things. */
  const AI_SIDEBAR_URL = "https://fussy-jackrabbit-5064.z0mb1xcat.deno.net";
  const SEARCH_PROXY_URL = AI_SIDEBAR_URL.replace(/\/$/, "") + "/search?q=";
  const SITE_PROXY_URL = AI_SIDEBAR_URL.replace(/\/$/, "") + "/proxy?url=";

  function install(){
    if(APPS.edgy) return; // don't double-install if this file loads twice

    APPS.edgy = {
      title: "Macrohard Edgy",
      icon: "🧭",
      w: 960, h: 640,
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
      .edgy{display:flex;flex-direction:column;height:100%;
        --e-tabbar:#dee1e6; --e-tab:#f1f1f1; --e-tab-fg:#3c4043; --e-tab-active:#fff; --e-tab-active-fg:#202124;
        --e-icon:#444; --e-toolbar:#fff; --e-toolbar-border:#e2e2e2; --e-addr:#f1f3f4; --e-addr-border:#dcdcdc;
        --e-addr-fg:#222; --e-bm:#fff; --e-bm-border:#eee; --e-bm-fg:#3c4043; --e-page-bg:#fff; --e-page-fg:#202124;
        --e-muted:#8a8a8a; --e-hover:#f1f3f4; --e-shortcut-bg:#f1f3f4; --e-border:#ddd;
        background:var(--e-page-bg);color:var(--e-page-fg)}
      .edgy.dark{
        --e-tabbar:#18181a; --e-tab:#2c2d31; --e-tab-fg:#c7c8cc; --e-tab-active:#232326; --e-tab-active-fg:#e8eaea;
        --e-icon:#c7c8cc; --e-toolbar:#232326; --e-toolbar-border:#333438; --e-addr:#2f3034; --e-addr-border:#3d3e42;
        --e-addr-fg:#e8eaea; --e-bm:#232326; --e-bm-border:#333438; --e-bm-fg:#c7c8cc; --e-page-bg:#1c1d20; --e-page-fg:#e8eaea;
        --e-muted:#9a9a9a; --e-hover:#2c2d31; --e-shortcut-bg:#2c2d31; --e-border:#3a3b3f}
      .edgy-tabbar{display:flex;align-items:flex-end;background:var(--e-tabbar);padding:6px 6px 0;gap:2px;flex:0 0 auto;position:relative}
      .edgy-tabs{display:flex;gap:4px;overflow-x:auto;overflow-y:hidden;flex:1;min-width:0;scrollbar-width:thin}
      .edgy-tab{display:flex;align-items:center;gap:6px;max-width:180px;min-width:110px;background:var(--e-tab);
        border-radius:8px 8px 0 0;padding:7px 6px 7px 12px;font-size:12px;color:var(--e-tab-fg);cursor:default;
        white-space:nowrap;overflow:hidden;flex:0 0 auto}
      .edgy-tab.active{background:var(--e-tab-active);color:var(--e-tab-active-fg)}
      .edgy-tab.priv{background:#2d1b4e;color:#d8c9f5}
      .edgy-tab.priv.active{background:#efe6ff;color:#2d1b4e}
      .edgy-tab .tico{font-size:13px;flex:0 0 auto;width:14px;height:14px;object-fit:contain;display:flex;align-items:center;justify-content:center}
      .edgy-tab img.tico{border-radius:2px}
      .edgy-tab .ttitle{overflow:hidden;text-overflow:ellipsis;flex:1}
      .edgy-tab .tclose{opacity:.55;border-radius:50%;width:18px;height:18px;flex:0 0 auto;display:grid;place-items:center;font-size:12px}
      .edgy-tab .tclose:hover{background:rgba(127,127,127,.25);opacity:1}
      .edgy-tab[draggable]{cursor:grab}
      .edgy-tabctrls{display:flex;align-items:center;gap:0;flex:0 0 auto;margin-bottom:2px}
      .edgy-newtab,.edgy-privtab,.edgy-tablist-btn{height:28px;border:0;background:transparent;color:var(--e-tab-fg);font-size:16px;border-radius:6px;flex:0 0 auto;width:28px}
      .edgy-privtab{font-size:13px}
      .edgy-tablist-btn{font-size:10px}
      .edgy-newtab:hover,.edgy-privtab:hover,.edgy-tablist-btn:hover{background:rgba(127,127,127,.2)}
      .edgy-tabmenu{position:absolute;top:36px;right:6px;background:var(--e-toolbar);color:var(--e-page-fg);border-radius:8px;
        box-shadow:0 6px 20px rgba(0,0,0,.28);padding:4px;min-width:190px;max-height:280px;overflow:auto;z-index:60}
      .edgy-tabmenu-row{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:5px;font-size:12.5px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default}
      .edgy-tabmenu-row:hover{background:var(--e-hover)}
      .edgy-toolbar{display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--e-toolbar);flex:0 0 auto;border-bottom:1px solid var(--e-toolbar-border)}
      .edgy-nav{width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:var(--e-icon);font-size:15px;flex:0 0 auto}
      .edgy-nav:hover{background:rgba(127,127,127,.18)}
      .edgy-nav:disabled{opacity:.3}
      .edgy-nav.ai{color:#8355e0}
      .edgy-nav.ai.on{background:linear-gradient(135deg,#5b21b6,#38bdf8);color:#fff}
      .edgy-zoom{display:flex;align-items:center;gap:0;background:var(--e-addr);border-radius:14px;padding:2px;flex:0 0 auto}
      .edgy-zoom button{width:22px;height:22px;border:0;background:transparent;border-radius:50%;font-size:13px;color:var(--e-page-fg)}
      .edgy-zoom button:hover{background:rgba(127,127,127,.18)}
      .edgy-zoom span{font-size:10.5px;color:var(--e-muted);width:34px;text-align:center;cursor:default}
      .edgy-addr{flex:1;display:flex;align-items:center;gap:6px;height:32px;border-radius:16px;border:1px solid var(--e-addr-border);background:var(--e-addr);padding:0 12px;min-width:60px}
      .edgy-addr input{flex:1;border:0;background:transparent;outline:none;font-size:13px;color:var(--e-addr-fg);min-width:0}
      .edgy-lock{font-size:11px;opacity:.7;flex:0 0 auto}
      .edgy-star{width:30px;height:30px;border:0;border-radius:50%;background:transparent;font-size:15px;color:#b8860b;flex:0 0 auto}
      .edgy-star:hover{background:rgba(127,127,127,.18)}
      .edgy-star:disabled{opacity:.3}
      .edgy-bookmarks{display:flex;gap:2px;padding:5px 10px;background:var(--e-bm);border-bottom:1px solid var(--e-bm-border);flex:0 0 auto;overflow-x:auto}
      .edgy-bookmarks a{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--e-bm-fg);padding:4px 8px;border-radius:5px;white-space:nowrap;cursor:default}
      .edgy-bookmarks a:hover{background:var(--e-hover)}
      .edgy-body{flex:1;display:flex;min-height:0}
      .edgy-mainpane{flex:1;position:relative;min-width:0;background:var(--e-page-bg)}
      .edgy-pages{position:absolute;inset:0}
      .edgy-page{position:absolute;inset:0;display:none;flex-direction:column;overflow:auto;color:var(--e-page-fg)}
      .edgy-page.active{display:flex}
      .edgy-home{align-items:center;padding-top:52px}
      .edgy-home .logo{font-size:38px;font-weight:700;letter-spacing:-1px;margin-bottom:6px;color:var(--e-page-fg);display:flex;align-items:center;gap:10px}
      .edgy-home .priv-sub{font-size:12px;color:var(--e-muted);margin-bottom:22px;text-align:center;max-width:420px}
      .edgy-search{width:min(560px,86%);height:48px;border-radius:24px;border:1px solid var(--e-addr-border);
        box-shadow:0 2px 10px rgba(0,0,0,.06);padding:0 20px;font-size:15px;outline:none;color:var(--e-addr-fg);margin-top:16px;background:var(--e-addr)}
      .edgy-search:focus{box-shadow:0 2px 14px rgba(0,0,0,.14)}
      .edgy-shortcuts{display:flex;gap:16px;margin-top:32px;flex-wrap:wrap;justify-content:center;max-width:640px}
      .edgy-shortcuts a{display:flex;flex-direction:column;align-items:center;gap:7px;width:76px;color:var(--e-page-fg);font-size:11.5px;text-align:center;cursor:default}
      .edgy-shortcuts a .gl{font-size:26px;width:52px;height:52px;background:var(--e-shortcut-bg);border-radius:14px;display:grid;place-items:center}
      .edgy-shortcuts a:hover .gl{background:var(--e-hover)}
      .edgy-site{padding:0!important;align-items:stretch!important}
      .edgy-frame{flex:1;border:0;width:100%;height:100%;background:#fff;opacity:0;transition:opacity .18s}
      .edgy-load{margin:auto;color:var(--e-muted);font-size:13px;display:flex;align-items:center;gap:10px}
      .edgy-load::before{content:"";width:16px;height:16px;border:2px solid #c9ced4;border-top-color:#5b21b6;border-radius:50%;animation:edgyspin .7s linear infinite}
      @keyframes edgyspin{to{transform:rotate(360deg)}}
      .edgy-reject{margin:auto;text-align:center;color:var(--e-muted);display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px;max-width:420px}
      .edgy-reject .em{font-size:56px}
      .edgy-reject b{font-size:18px;color:var(--e-page-fg)}
      .edgy-reject .rj-sub{font-size:12.5px;line-height:1.55}
      .edgy-reject .rj-btns{display:flex;gap:10px;margin-top:2px}
      .edgy-btn{border:1px solid var(--e-border);background:var(--e-toolbar);border-radius:16px;padding:7px 16px;font-size:12.5px;cursor:default;color:var(--e-page-fg)}
      .edgy-btn:hover{background:var(--e-hover)}
      .edgy-btn.pri{background:#5b21b6;border-color:#5b21b6;color:#fff}
      .edgy-btn.pri:hover{background:#4c1d95}
      .edgy-openreal{font-size:11.5px;color:#8355e0;text-decoration:underline;cursor:pointer;margin-top:2px}
      .edgy-histwrap{padding:26px 30px;max-width:760px;margin:0 auto;width:100%}
      .edgy-histhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
      .edgy-histhead b{font-size:19px;color:var(--e-page-fg)}
      .edgy-histlist{display:flex;flex-direction:column;gap:2px}
      .edgy-hist-row{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:8px;cursor:default}
      .edgy-hist-row:hover{background:var(--e-hover)}
      .edgy-hist-row .hi-ic{width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:14px;flex:0 0 auto}
      .edgy-hist-row .hi-ic img{width:16px;height:16px;object-fit:contain}
      .edgy-hist-row .hi-t{flex:1;min-width:0;display:flex;flex-direction:column}
      .edgy-hist-row .hi-t b{font-size:12.5px;color:var(--e-page-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
      .edgy-hist-row .hi-t small{color:var(--e-muted);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .edgy-hist-row .hi-time{font-size:10.5px;color:var(--e-muted);flex:0 0 auto}
      .edgy-histempty{color:var(--e-muted);font-size:12.5px;padding:20px 0}
      .edgy-sidebar{width:0;flex:0 0 auto;position:relative;display:flex;flex-direction:column;background:var(--e-page-bg);
        border-left:0 solid var(--e-border);overflow:hidden}
      .edgy-sidebar.open{border-left-width:1px}
      .edgy-sb-drag{position:absolute;left:-3px;top:0;bottom:0;width:6px;cursor:ew-resize;z-index:5}
      .edgy-sb-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;
        background:linear-gradient(135deg,#5b21b6,#38bdf8);color:#fff;font-size:12.5px;font-weight:600}
      .edgy-sb-close{border:0;background:rgba(255,255,255,.18);color:#fff;width:22px;height:22px;border-radius:50%;font-size:12px}
      .edgy-sb-close:hover{background:rgba(255,255,255,.3)}
      .edgy-sb-body{flex:1;position:relative;overflow:hidden}
      .edgy-sb-frame{position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .18s;background:#fff}
      .edgy-sb-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--e-muted);font-size:12.5px}
      .edgy-sb-load::before{content:"";width:14px;height:14px;border:2px solid #ddd;border-top-color:#5b21b6;border-radius:50%;animation:edgyspin .7s linear infinite}
      .edgy-sb-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;color:var(--e-muted)}
      .edgy-sb-fallback .em{font-size:38px}
      .edgy-sb-fallback b{font-size:14.5px;color:var(--e-page-fg)}
      .edgy-sb-fallback .rj-sub{font-size:12px;line-height:1.5}
    `;
    const st = document.createElement("style");
    st.id = "edgy-styles";
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* seed bookmarks from the same curated, already-frame-friendly list the
     built-in Edge ships with, then let the star button grow it. Persisted
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

  const EDGY_HIST_KEY = "wc_edgy_history";
  function loadHistory(){
    try{ const h=JSON.parse(localStorage.getItem(EDGY_HIST_KEY)); if(Array.isArray(h)) return h; }catch(e){}
    return [];
  }
  function saveHistory(list){ try{ localStorage.setItem(EDGY_HIST_KEY, JSON.stringify(list.slice(-300))); }catch(e){} }

  const EDGY_ZOOM_KEY = "wc_edgy_zoom";
  const EDGY_THEME_KEY = "wc_edgy_theme";
  const EDGY_SIDEBAR_KEY = "wc_edgy_sidebar";
  function loadSidebarState(){
    try{ const s=JSON.parse(localStorage.getItem(EDGY_SIDEBAR_KEY)); if(s && typeof s==="object") return s; }catch(e){}
    return {open:false, width:340};
  }
  function saveSidebarState(s){ try{ localStorage.setItem(EDGY_SIDEBAR_KEY, JSON.stringify(s)); }catch(e){} }

  /* frame-blocked-site detection is reused straight from app.js: edgeBlocked()
     and EDGE_BLOCKED already list the giants (Google, YouTube, Facebook, ...)
     that refuse to be framed. Search results never hit that list at all,
     since they're framed from the user's own proxy domain, not a real search
     engine's, so there's nothing there for edgeBlocked() to catch. */
  function hostOf(u){ try{ return new URL(u).hostname||u; }catch(e){ return u; } }
  function faviconFor(u){ const h=hostOf(u); return h ? `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(h)}` : null; }

  function buildEdgy(body, winEl){
    body.innerHTML = `
      <div class="edgy">
        <div class="edgy-tabbar">
          <div class="edgy-tabs"></div>
          <div class="edgy-tabctrls">
            <button class="edgy-newtab" title="New tab (Ctrl+T)">+</button>
            <button class="edgy-privtab" title="New private tab (Ctrl+Shift+N)">🕶</button>
            <button class="edgy-tablist-btn" title="Show all tabs">▾</button>
          </div>
        </div>
        <div class="edgy-toolbar">
          <button class="edgy-nav" data-b title="Back">←</button>
          <button class="edgy-nav" data-f title="Forward">→</button>
          <button class="edgy-nav" data-r title="Reload">⟳</button>
          <button class="edgy-nav" data-home title="Home">⌂</button>
          <button class="edgy-nav" data-hist title="History (Ctrl+H)">🕘</button>
          <div class="edgy-zoom">
            <button data-zout title="Zoom out">−</button>
            <span class="edgy-zoomlabel">100%</span>
            <button data-zin title="Zoom in">+</button>
          </div>
          <div class="edgy-addr"><span class="edgy-lock">🔒</span><input class="edgy-url" spellcheck="false" placeholder="Search the web or enter a web address"></div>
          <button class="edgy-star" title="Bookmark this page">☆</button>
          <button class="edgy-nav" data-theme title="Toggle dark mode">🌙</button>
          <button class="edgy-nav ai" title="Assistant">✨</button>
        </div>
        <div class="edgy-bookmarks"></div>
        <div class="edgy-body">
          <div class="edgy-mainpane"><div class="edgy-pages"></div></div>
          <div class="edgy-sidebar">
            <div class="edgy-sb-drag"></div>
            <div class="edgy-sb-head"><span>✨ Assistant</span><button class="edgy-sb-close" title="Close">»</button></div>
            <div class="edgy-sb-body"></div>
          </div>
        </div>
      </div>`;

    const edgyRoot = body.querySelector(".edgy");
    const themeBtn = body.querySelector("[data-theme]");
    const tabsEl = body.querySelector(".edgy-tabs");
    const pagesEl = body.querySelector(".edgy-pages");
    const urlInput = body.querySelector(".edgy-url");
    const bmBar = body.querySelector(".edgy-bookmarks");
    const backBtn = body.querySelector("[data-b]"), fwdBtn = body.querySelector("[data-f]");
    const starBtn = body.querySelector(".edgy-star");
    const zoomOutBtn = body.querySelector("[data-zout]"), zoomInBtn = body.querySelector("[data-zin]");
    const zoomLabel = body.querySelector(".edgy-zoomlabel");
    const aiBtn = body.querySelector(".edgy-nav.ai");
    const sidebarEl = body.querySelector(".edgy-sidebar");
    const sbBody = body.querySelector(".edgy-sb-body");
    const tablistBtn = body.querySelector(".edgy-tablist-btn");

    let bookmarks = loadBookmarks();
    let history = loadHistory();
    let defaultZoom = parseInt(localStorage.getItem(EDGY_ZOOM_KEY),10) || 100;
    let sidebarState = loadSidebarState();
    let sidebarLoaded = false;
    let tabs = [], activeId = null, seq = 0, dragId = null;

    function active(){ return tabs.find(t=>t.id===activeId); }

    /* ---------- bookmarks ---------- */
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

    /* ---------- zoom ---------- */
    function applyZoom(t){ if(t) t.pageEl.style.zoom = (t.zoom||defaultZoom)+"%"; }
    function updateZoomLabel(t){ zoomLabel.textContent = (t ? (t.zoom||defaultZoom) : defaultZoom)+"%"; }
    function setZoom(delta, reset){
      const t=active(); if(!t) return;
      t.zoom = reset ? 100 : Math.max(50, Math.min(200, (t.zoom||defaultZoom)+delta));
      defaultZoom = t.zoom;
      try{ localStorage.setItem(EDGY_ZOOM_KEY, defaultZoom); }catch(e){}
      applyZoom(t); updateZoomLabel(t);
    }
    zoomOutBtn.onclick = ()=>setZoom(-10);
    zoomInBtn.onclick = ()=>setZoom(10);
    zoomLabel.onclick = ()=>setZoom(0, true);

    /* ---------- light / dark mode ---------- */
    let theme = localStorage.getItem(EDGY_THEME_KEY) === "dark" ? "dark" : "light";
    function applyTheme(){
      edgyRoot.classList.toggle("dark", theme==="dark");
      themeBtn.textContent = theme==="dark" ? "☀️" : "🌙";
      themeBtn.title = theme==="dark" ? "Switch to light mode" : "Switch to dark mode";
    }
    themeBtn.onclick = ()=>{
      theme = theme==="dark" ? "light" : "dark";
      try{ localStorage.setItem(EDGY_THEME_KEY, theme); }catch(e){}
      applyTheme();
    };
    applyTheme();

    /* ---------- nav buttons / chrome sync ---------- */
    function updateNavButtons(t){
      backBtn.disabled = !(t && t.si>0);
      fwdBtn.disabled = !(t && t.si<t.stack.length-1);
    }
    function syncChrome(t){
      if(!t || t.id!==activeId) return;
      urlInput.value = t.displayUrl || "";
      updateStar(t); updateNavButtons(t); updateZoomLabel(t);
      notifySidebarOfPage(t);
    }

    /* ---------- tabs ---------- */
    function iconEl(t){
      if(t.favicon){
        const img = el("img","tico"); img.src = t.favicon;
        img.onerror = ()=>{ const span=el("span","tico"); span.textContent=t.icon; img.replaceWith(span); };
        return img;
      }
      const span = el("span","tico"); span.textContent = t.icon; return span;
    }
    function renderTabs(){
      tabsEl.innerHTML = "";
      tabs.forEach(t=>{
        const row = el("div","edgy-tab"+(t.id===activeId?" active":"")+(t.incognito?" priv":""));
        row.draggable = true;
        const ttitle = el("span","ttitle"); ttitle.textContent = t.title;
        const tclose = el("span","tclose"); tclose.textContent = "✕";
        row.append(iconEl(t), ttitle, tclose);
        row.onclick = e=>{ if(e.target===tclose) closeTab(t.id); else switchTab(t.id); };
        row.addEventListener("dragstart", e=>{ dragId=t.id; e.dataTransfer.effectAllowed="move"; try{e.dataTransfer.setData("text/plain",t.id);}catch(_){} });
        row.addEventListener("dragover", e=>{ if(dragId) e.preventDefault(); });
        row.addEventListener("drop", e=>{
          e.preventDefault();
          if(!dragId || dragId===t.id) return;
          const from = tabs.findIndex(x=>x.id===dragId), to = tabs.findIndex(x=>x.id===t.id);
          if(from<0||to<0) return;
          const [moved] = tabs.splice(from,1);
          tabs.splice(to,0,moved);
          dragId=null; renderTabs();
        });
        row.addEventListener("dragend", ()=>{ dragId=null; });
        tabsEl.appendChild(row);
      });
    }
    tablistBtn.onclick = e=>{
      e.stopPropagation();
      const existing = body.querySelector(".edgy-tabmenu"); if(existing){ existing.remove(); return; }
      const menu = el("div","edgy-tabmenu");
      tabs.forEach(t=>{
        const row = el("div","edgy-tabmenu-row");
        const ic = iconEl(t); row.appendChild(ic);
        const label = el("span"); label.textContent = (t.incognito?"🕶 ":"")+t.title; row.appendChild(label);
        row.onclick = ()=>{ switchTab(t.id); menu.remove(); };
        menu.appendChild(row);
      });
      body.querySelector(".edgy-tabbar").appendChild(menu);
      setTimeout(()=>{
        const closeMenu = ev=>{ if(!menu.contains(ev.target)){ menu.remove(); document.removeEventListener("mousedown",closeMenu); } };
        document.addEventListener("mousedown", closeMenu);
      },0);
    };

    function newTab(url, incognito){
      const id = "t"+(++seq);
      const pageEl = el("div","edgy-page");
      pagesEl.appendChild(pageEl);
      const tab = {id, pageEl, stack:[], si:-1, title:incognito?"Private tab":"New tab",
        icon:incognito?"🕶":"🧭", favicon:null, displayUrl:"", incognito:!!incognito, zoom:defaultZoom};
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

    /* ---------- navigation ---------- */
    function navTo(t, loc){
      t.stack = t.stack.slice(0, t.si+1);
      t.stack.push(loc);
      t.si = t.stack.length-1;
      render(t);
    }
    function go(t, raw){
      if(!t) return;
      const q=(raw||"").trim();
      const low=q.toLowerCase();
      if(!q || low==="home"){ navTo(t,{type:"home"}); return; }
      if(low==="history"){ navTo(t,{type:"history"}); return; }
      const looksUrl = /^https?:\/\//.test(q) || (/^[^\s]+\.[a-z]{2,}(\/|$|\?|#)/i.test(q) && !/\s/.test(q));
      if(!looksUrl){
        /* real, live search results, fetched by the user's own AI backend and
           framed from its own domain (see the file header for why), so this
           loads right inside the window rather than kicking out to a real
           browser tab. */
        navTo(t, {type:"site", u:SEARCH_PROXY_URL+encodeURIComponent(q), label:"Search: "+q, icon:"🔎"});
        return;
      }
      const u = /^https?:\/\//.test(q) ? q : "https://"+q;
      const path=u.split("#")[0].split("?")[0], last=path.split("/").pop()||"";
      if(EDGE_DL_RE.test(last)){ downloadFromWeb(u); return; }
      navTo(t, {type:"site", u});
    }
    function render(t){
      const loc = t.stack[t.si];
      if(!loc || loc.type==="home") home(t);
      else if(loc.type==="history") historyPage(t);
      else loadSite(t, loc);
    }

    function home(t){
      t.displayUrl = ""; t.title = t.incognito?"Private tab":"New tab"; t.icon = t.incognito?"🕶":"🧭"; t.favicon=null;
      t.pageEl.className = "edgy-page edgy-home"+(t.id===activeId?" active":"");
      t.pageEl.innerHTML = `
        <div class="logo">${t.incognito?"🕶":"🧭"} Macrohard Edgy</div>
        ${t.incognito?'<div class="priv-sub">Private tab. Sites you visit here won’t be added to History.</div>':""}
        <input class="edgy-search" placeholder="Search the web or enter a web address">
        <div class="edgy-shortcuts"></div>`;
      const search = t.pageEl.querySelector(".edgy-search");
      search.addEventListener("keydown", e=>{ if(e.key==="Enter" && search.value.trim()) go(t, search.value); });
      const sc = t.pageEl.querySelector(".edgy-shortcuts");
      bookmarks.forEach(b=>{
        const a=el("a"); a.innerHTML = `<span class="gl">${b.icon||"🌐"}</span>${esc(b.name)}`;
        a.onclick = ()=>go(t, b.url); sc.appendChild(a);
      });
      applyZoom(t); renderTabs(); syncChrome(t);
    }

    function historyPage(t){
      t.displayUrl = ""; t.title = "History"; t.icon = "🕘"; t.favicon = null;
      t.pageEl.className = "edgy-page edgy-history"+(t.id===activeId?" active":"");
      const rows = history.slice().reverse().map((h,i)=>{
        const idx = history.length-1-i;
        return `<div class="edgy-hist-row" data-i="${idx}">
          <span class="hi-ic">${h.favicon?`<img src="${esc(h.favicon)}">`:"🌐"}</span>
          <div class="hi-t"><b>${esc(h.title||hostOf(h.url))}</b><small>${esc(h.url)}</small></div>
          <span class="hi-time">${esc(new Date(h.time).toLocaleString())}</span>
        </div>`;
      }).join("");
      t.pageEl.innerHTML = `<div class="edgy-histwrap">
        <div class="edgy-histhead"><b>History</b><button class="edgy-btn" data-clear>Clear history</button></div>
        <div class="edgy-histlist">${rows || '<div class="edgy-histempty">No history yet.</div>'}</div>
      </div>`;
      t.pageEl.querySelectorAll(".edgy-hist-row").forEach(row=>{
        row.onclick = ()=>{ const h=history[+row.dataset.i]; if(h) go(t, h.url); };
      });
      const clearBtn = t.pageEl.querySelector("[data-clear]");
      if(clearBtn) clearBtn.onclick = ()=>{ history = []; saveHistory(history); render(t); };
      applyZoom(t); renderTabs(); syncChrome(t);
    }

    /* real page in a sandboxed iframe, same locked-down approach the
       built-in Edge uses. Genuinely fetches the live site, but can't reach
       anything of WinClone's. Sites already known to block framing (see
       edgeBlocked) skip straight to the proxy fallback instead of wasting
       a timeout on an attempt that's certain to fail; anything else still
       tries loading directly first, since that's faster, cheaper and more
       fully interactive for every site that doesn't block it, and only
       falls back to the proxy if it actually times out. */
    function loadSite(t, loc){
      const u = loc.u;
      t.displayUrl = u; t.title = loc.label || hostOf(u); t.icon = loc.icon || "🌐";
      t.favicon = loc.icon ? null : faviconFor(u);
      if(edgeBlocked(u)){ loadViaProxy(t,loc); return; }
      t.pageEl.className = "edgy-page edgy-site"+(t.id===activeId?" active":"");
      t.pageEl.innerHTML = `<div class="edgy-load">Loading ${esc(loc.label||hostOf(u))}…</div>
        <iframe class="edgy-frame" referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"></iframe>`;
      const frame = t.pageEl.querySelector(".edgy-frame"), load = t.pageEl.querySelector(".edgy-load");
      let done=false;
      const timer = setTimeout(()=>{ if(!done){ done=true; loadViaProxy(t,loc); } }, 10000);
      frame.addEventListener("load", ()=>{
        if(done) return; done=true; clearTimeout(timer); if(load) load.remove(); frame.style.opacity=1;
        if(!t.incognito){ history.push({url:u, title:t.title, favicon:t.favicon, time:Date.now()}); saveHistory(history); }
      });
      frame.src = u;
      applyZoom(t); renderTabs(); syncChrome(t);
    }
    /* fallback for sites that block direct framing or timed out trying:
       the user's own AI backend fetches the page server-side and serves it
       back from its own domain, which sets no blocking header. Works well
       for viewing public, non-interactive content; won't work for anything
       needing a real login (cookies are origin-scoped, this proxy never
       has the real site's session) or heavily JS-driven dynamic data, and
       some sites will refuse the server-side fetch itself with a bot check
       the same way DuckDuckGo and a public SearXNG instance did earlier -
       that's still possible here, just per-site rather than universal. */
    function loadViaProxy(t, loc){
      const u = loc.u;
      t.pageEl.className = "edgy-page edgy-site"+(t.id===activeId?" active":"");
      t.pageEl.innerHTML = `<div class="edgy-load">Loading ${esc(loc.label||hostOf(u))}…</div>
        <iframe class="edgy-frame" referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"></iframe>`;
      const frame = t.pageEl.querySelector(".edgy-frame"), load = t.pageEl.querySelector(".edgy-load");
      let done=false;
      const timer = setTimeout(()=>{ if(!done){ done=true; showRejected(t,loc); } }, 12000);
      frame.addEventListener("load", ()=>{
        if(done) return; done=true; clearTimeout(timer); if(load) load.remove(); frame.style.opacity=1;
        if(!t.incognito){ history.push({url:u, title:t.title, favicon:t.favicon, time:Date.now()}); saveHistory(history); }
      });
      frame.src = SITE_PROXY_URL+encodeURIComponent(u);
      applyZoom(t); renderTabs(); syncChrome(t);
    }
    function showRejected(t, loc){
      const u = loc.u;
      t.pageEl.className = "edgy-page"+(t.id===activeId?" active":"");
      t.pageEl.innerHTML = `<div class="edgy-reject">
        <div class="em">🚧</div>
        <b>${esc(loc.label||hostOf(u))} won't load here</b>
        <div class="rj-sub">Neither loading it directly nor the fallback proxy worked, most likely because the destination itself refused the request. Some sites do that to any automated-looking traffic, not just framed ones.</div>
        <div class="rj-btns">
          <button class="edgy-btn pri" data-retry>Try again</button>
          <button class="edgy-btn" data-home>Go home</button>
        </div>
        <a class="edgy-openreal" data-real target="_blank" rel="noopener noreferrer" href="${esc(u)}">Open the real page in a new browser tab ↗</a>
      </div>`;
      t.pageEl.querySelector("[data-retry]").onclick = ()=>loadViaProxy(t,loc);
      t.pageEl.querySelector("[data-home]").onclick = ()=>go(t,"home");
      applyZoom(t); renderTabs(); syncChrome(t);
    }

    /* "download" a web file into the VFS Downloads folder, exactly like the
       built-in Edge does. Never touches the real disk. */
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

    /* ---------- AI sidebar: frames the user's own hosted chat assistant.
       Styled as a native-looking panel (colored header, no address bar, no
       visible iframe border) rather than a website-in-a-box. The iframe is
       created once and just hidden/shown after that, so the conversation
       inside it survives opening and closing the panel. Real sites/hosts
       that are asleep or slow to cold-start get a generous timeout before
       falling back to an "open in a new tab" link, the same escape hatch
       used everywhere else this app frames outside content. */
    function mountSidebarFrame(){
      sbBody.innerHTML = `<div class="edgy-sb-load">Loading…</div>
        <iframe class="edgy-sb-frame" referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"></iframe>`;
      const frame = sbBody.querySelector(".edgy-sb-frame"), load = sbBody.querySelector(".edgy-sb-load");
      let done=false;
      const timer = setTimeout(()=>{ if(!done){ done=true; showSidebarFallback(); } }, 12000);
      frame.addEventListener("load", ()=>{
        if(done) return; done=true; clearTimeout(timer); if(load) load.remove(); frame.style.opacity=1;
        notifySidebarOfPage(active());
      });
      frame.src = AI_SIDEBAR_URL;
    }
    /* tells the assistant what page is currently showing, so it can answer
       "what does this page say" - style questions. The assistant itself
       decides whether/when to actually fetch and use that URL (see its own
       opt-in toggle); this just keeps it informed of what's on screen. */
    function notifySidebarOfPage(t){
      if(!sidebarLoaded || !aiOrigin) return;
      const frame = sbBody.querySelector(".edgy-sb-frame");
      if(!frame || !frame.contentWindow) return;
      try{
        frame.contentWindow.postMessage({source:"macrohard-edgy", type:"page", url:(t&&t.displayUrl)||null, title:(t&&t.title)||null}, aiOrigin);
      }catch(e){}
    }
    function showSidebarFallback(){
      sbBody.innerHTML = `<div class="edgy-sb-fallback">
        <div class="em">🤖</div>
        <b>Assistant didn't load</b>
        <div class="rj-sub">It may be waking up from sleep (small hosts do that) or isn't reachable right now.</div>
        <button class="edgy-btn pri" data-retry>Try again</button>
        <a class="edgy-openreal" target="_blank" rel="noopener noreferrer" href="${esc(AI_SIDEBAR_URL)}">Open it in a new browser tab ↗</a>
      </div>`;
      sbBody.querySelector("[data-retry]").onclick = mountSidebarFrame;
    }
    function applySidebarState(){
      sidebarEl.classList.toggle("open", sidebarState.open);
      aiBtn.classList.toggle("on", sidebarState.open);
      sidebarEl.style.width = sidebarState.open ? sidebarState.width+"px" : "0px";
      if(sidebarState.open && !sidebarLoaded){ sidebarLoaded = true; mountSidebarFrame(); }
    }
    function toggleSidebar(open){
      sidebarState.open = open!=null ? open : !sidebarState.open;
      saveSidebarState(sidebarState);
      applySidebarState();
    }
    aiBtn.onclick = ()=>toggleSidebar();
    body.querySelector(".edgy-sb-close").onclick = ()=>toggleSidebar(false);
    body.querySelector(".edgy-sb-drag").addEventListener("mousedown", e=>{
      e.preventDefault();
      const startX = e.clientX, startW = sidebarState.width;
      const move = ev=>{
        const maxW = Math.max(260, (winEl?winEl.clientWidth:800) - 300);
        sidebarState.width = Math.max(260, Math.min(maxW, startW - (ev.clientX-startX)));
        sidebarEl.style.width = sidebarState.width+"px";
      };
      const up = ()=>{ document.removeEventListener("mousemove",move); document.removeEventListener("mouseup",up); saveSidebarState(sidebarState); };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });

    /* ---------- wire up chrome ---------- */
    body.querySelector(".edgy-newtab").onclick = ()=>newTab();
    body.querySelector(".edgy-privtab").onclick = ()=>newTab(null, true);
    backBtn.onclick = ()=>{ const t=active(); if(t && t.si>0){ t.si--; render(t); } };
    fwdBtn.onclick  = ()=>{ const t=active(); if(t && t.si<t.stack.length-1){ t.si++; render(t); } };
    body.querySelector("[data-r]").onclick = ()=>{ const t=active(); if(t) render(t); };
    body.querySelector("[data-home]").onclick = ()=>go(active(),"home");
    body.querySelector("[data-hist]").onclick = ()=>go(active(),"history");
    urlInput.addEventListener("keydown", e=>{ if(e.key==="Enter" && urlInput.value.trim()) go(active(), urlInput.value); });
    if(winEl) winEl.addEventListener("keydown", e=>{
      if(!(e.ctrlKey||e.metaKey)) return;
      if(e.key==="t" && !e.shiftKey){ e.preventDefault(); newTab(); }
      else if(e.key.toLowerCase()==="n" && e.shiftKey){ e.preventDefault(); newTab(null, true); }
      else if(e.key==="w"){ e.preventDefault(); closeTab(activeId); }
      else if(e.key==="l"){ e.preventDefault(); urlInput.focus(); urlInput.select(); }
      else if(e.key.toLowerCase()==="h"){ e.preventDefault(); go(active(),"history"); }
      else if(e.key==="="||e.key==="+"){ e.preventDefault(); setZoom(10); }
      else if(e.key==="-"){ e.preventDefault(); setZoom(-10); }
      else if(e.key==="0"){ e.preventDefault(); setZoom(0, true); }
    });

    /* both the /search proxy's page and the general /proxy fallback report
       clicked links (and, for search, re-searches) up via postMessage
       instead of navigating on its own, so those stay inside the normal
       address-bar/history/back-button flow instead of just vanishing into
       the iframe. Guards on `body` still being attached so a stale
       listener from a previous, already-closed Edgy window (only one can be
       open at a time, but the listener would otherwise outlive it) quietly
       unregisters itself instead of acting on dead state. */
    let aiOrigin = null, proxyOrigin = null, proxyPath = null;
    try{ aiOrigin = new URL(AI_SIDEBAR_URL).origin; }catch(e){}
    try{ const p=new URL(SEARCH_PROXY_URL); proxyOrigin=p.origin; proxyPath=p.pathname; }catch(e){}
    window.addEventListener("message", function onMsg(e){
      if(!document.body.contains(body)){ window.removeEventListener("message", onMsg); return; }
      if(!aiOrigin || e.origin!==aiOrigin) return;
      if(!e.data || typeof e.data.url!=="string") return;
      const t = active(); if(!t) return;
      let dest;
      try{ dest = new URL(e.data.url); }catch(err){ return; }

      if(e.data.source==="macrohard-edgy-search"){
        /* a re-search submitted from the results page itself lands back on
           our own /search route; give it the same nice "Search: query" tab
           title instead of the raw proxy hostname. */
        const q = (dest.origin===proxyOrigin && dest.pathname===proxyPath) ? dest.searchParams.get("q") : null;
        if(q) navTo(t, {type:"site", u:SEARCH_PROXY_URL+encodeURIComponent(q), label:"Search: "+q, icon:"🔎"});
        else navTo(t, {type:"site", u:dest.href});
        return;
      }

      if(e.data.source==="macrohard-edgy-proxy"){
        /* a link clicked inside a proxied page - same download check go()
           already does for typed URLs, then the normal load pipeline (tries
           loading it directly first, only re-proxies if that fails too). */
        const path=dest.href.split("#")[0].split("?")[0], last=path.split("/").pop()||"";
        if(EDGE_DL_RE.test(last)){ downloadFromWeb(dest.href); return; }
        navTo(t, {type:"site", u:dest.href});
      }
    });

    renderBookmarksBar();
    applySidebarState();
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
