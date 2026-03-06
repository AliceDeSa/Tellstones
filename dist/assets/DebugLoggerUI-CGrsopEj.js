import{L as o,a as n}from"./index-ClhGCUTX.js";class x{constructor(){this.isOpen=!1,o.isDev&&this.init()}init(){const e=document.createElement("button");e.innerText="🐞",e.title="Debug Panel",e.style.cssText=`
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 9100;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #2c3e50;
            color: white;
            border: 2px solid #34495e;
            cursor: pointer;
            font-size: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `,e.onmouseover=()=>e.style.transform="scale(1.1)",e.onmouseout=()=>e.style.transform="scale(1)",e.onclick=()=>this.togglePanel(),document.body.appendChild(e);const r=document.createElement("button");r.innerText="🔄",r.title="Hard Reset (Clear Data & Reload)",r.style.cssText=`
            position: fixed;
            bottom: 10px;
            right: 60px;
            z-index: 9100;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: #e67e22;
            color: white;
            border: 2px solid #d35400;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `,r.onmouseover=()=>r.style.transform="scale(1.1)",r.onmouseout=()=>r.style.transform="scale(1)",r.onclick=()=>{const a=localStorage.getItem("tellstones_dev_mode")==="true";localStorage.clear(),sessionStorage.clear(),"caches"in window&&caches.keys().then(l=>{l.forEach(c=>caches.delete(c))});const i=window.location.href.split("?")[0],s=Date.now(),d=a?`${i}?dev=true&_=${s}`:`${i}?_=${s}`;setTimeout(()=>{window.location.href=d},150)},document.body.appendChild(r),this.container=document.createElement("div"),this.container.id="debug-logger-panel",this.container.style.cssText=`
            position: fixed;
            bottom: 60px;
            right: 10px;
            z-index: 9050;
            background: rgba(20, 30, 40, 0.75);
            color: #ecf0f1;
            padding: 12px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: none;
            width: 240px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        `,this.renderContent(),document.body.appendChild(this.container)}togglePanel(){this.isOpen=!this.isOpen,this.container.style.display=this.isOpen?"block":"none"}renderContent(){let e=`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;">
                <h3 style="margin:0;font-size:13px;color:#3498db;font-weight:500;">🔍 Debug</h3>
                <span style="font-size:9px;color:rgba(255,255,255,0.5);">v3.0</span>
            </div>
            <div style="margin-bottom:8px;">
        `;Object.values(n).forEach(t=>{const u=o.activeCategories.has(t);e+=`
                <div style="display:flex;align-items:center;margin:4px 0;">
                    <input type="checkbox" id="log-cat-${t}" ${u?"checked":""} style="margin-right:8px;cursor:pointer;">
                    <label for="log-cat-${t}" style="font-size:12px;cursor:pointer;color:${this.getCategoryColor(t)}">${t}</label>
                </div>
            `}),e+="</div>",e+=`
            <div style="margin-bottom:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">
                <h4 style="margin:0 0 5px 0;font-size:11px;color:#3498db;font-weight:500;">🔌 EventBus</h4>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
                     <button id="btn-eventbus-info" style="padding:5px;background:rgba(41,128,185,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">ℹ️ Info</button>
                     <button id="btn-eventbus-history" style="padding:5px;background:rgba(142,68,173,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">📜 History</button>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
                     <button id="btn-eventbus-test-game" style="padding:5px;background:rgba(39,174,96,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🎮 Game</button>
                     <button id="btn-eventbus-test-turn" style="padding:5px;background:rgba(243,156,18,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🔄 Turn</button>
                </div>
            </div>
        `,e+=`
            <div style="margin-bottom:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">
                <h4 style="margin:0 0 5px 0;font-size:11px;color:#f39c12;font-weight:500;">⚙️ Automators</h4>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
                     <button id="btn-debug-tutorial" style="padding:6px;background:rgba(142,68,173,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">▶️ Tutorial</button>
                     <button id="btn-debug-botvsbot" style="padding:6px;background:rgba(211,84,0,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🤖 PvE</button>
                </div>
            </div>
        `,e+=`
            <div style="display:flex;gap:5px;flex-direction:column;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">
                 <button id="btn-use-dummybot" style="padding:6px;background:rgba(22,160,133,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🔧 DummyBot</button>
                 <button id="btn-log-clear" style="padding:6px;background:rgba(192,57,43,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🗑️ Clear</button>
            </div>
        `,this.container.innerHTML=e,Object.values(n).forEach(t=>{const u=this.container.querySelector(`#log-cat-${t}`);u&&(u.onchange=b=>{o.toggleCategory(t,b.target.checked)})});const r=this.container.querySelector("#btn-eventbus-info");r&&(r.onclick=()=>{if(window.EventBus){const t=window.EventBus.getDebugInfo();o.info(n.SYSTEM,`📊 EventBus Listeners:
`+t)}else o.error(n.SYSTEM,"❌ EventBus não encontrado!")});const a=this.container.querySelector("#btn-eventbus-history");a&&(a.onclick=()=>{if(window.EventBus){const t=window.EventBus.getHistory();o.info(n.SYSTEM,"📜 EventBus History:",t),console.table(t)}else o.error(n.SYSTEM,"❌ EventBus não encontrado!")});const i=this.container.querySelector("#btn-eventbus-test-game");i&&(i.onclick=()=>{window.EventBus?(o.info(n.SYSTEM,"✅ Testando GAME:START event..."),window.EventBus.emit("GAME:START",{mode:"pve"})):o.error(n.SYSTEM,"❌ EventBus não encontrado!")});const s=this.container.querySelector("#btn-eventbus-test-turn");s&&(s.onclick=()=>{window.EventBus?(o.info(n.SYSTEM,"✅ Testando TURN:START event..."),window.EventBus.emit("TURN:START",{playerIndex:0,playerName:"Teste"})):o.error(n.SYSTEM,"❌ EventBus não encontrado!")});const d=this.container.querySelector("#btn-use-dummybot");d&&(d.onclick=()=>{window.DummyBot?(window.BotBrain=window.DummyBot,o.info(n.AI,"✅ DummyBot ativado! BotBrain substituído.")):o.error(n.AI,"❌ DummyBot não encontrado!")});const l=this.container.querySelector("#btn-log-clear");l&&(l.onclick=()=>o.clear());const c=this.container.querySelector("#btn-debug-tutorial");c&&(c.onclick=()=>{if(o.info(n.SYSTEM,"Starting Tutorial Automator..."),window.TutorialAutomator)window.TutorialAutomator.run();else{o.error(n.SYSTEM,"TutorialAutomator class not found. Trying to load script...");const t=document.createElement("script");t.src="src/debug/TutorialAutomator.js",t.onload=()=>{window.TutorialAutomator?window.TutorialAutomator.run():o.error(n.SYSTEM,"Failed to initialize TutorialAutomator after load.")},document.head.appendChild(t)}});const p=this.container.querySelector("#btn-debug-botvsbot");p&&(p.onclick=()=>{if(o.info(n.GAME,"Starting PvE Automator..."),window.PvEAutomator)window.PvEAutomator.run();else{o.error(n.GAME,"PvEAutomator not found!");const t=document.createElement("script");t.src="src/debug/PvEAutomator.js",t.onload=()=>{window.PvEAutomator?window.PvEAutomator.run():o.error(n.SYSTEM,"Failed to initialize PvEAutomator.")},document.head.appendChild(t)}})}getCategoryColor(e){switch(e){case"AI":return"#a569bd";case"NET":return"#5dade2";case"GAME":return"#f39c12";case"UI":return"#f06292";case"AUTH":return"#16a085";case"TUT":return"#f39c12";case"I18N":return"#8e44ad";default:return"#bdc3c7"}}}export{x as DebugLoggerUI};
//# sourceMappingURL=DebugLoggerUI-CGrsopEj.js.map
