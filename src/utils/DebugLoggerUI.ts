
import { Logger, LogCategory } from "./Logger.js";

export class DebugLoggerUI {
    private container!: HTMLElement;
    private isOpen: boolean = false;

    constructor() {
        if (!Logger.isDev) return;
        this.init();
    }

    private init() {
        // Floating Button (Main Toggle)
        const btn = document.createElement('button');
        btn.innerText = "🐞";
        btn.title = "Debug Panel";
        btn.style.cssText = `
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
        `;
        btn.onmouseover = () => btn.style.transform = "scale(1.1)";
        btn.onmouseout = () => btn.style.transform = "scale(1)";
        btn.onclick = () => this.togglePanel();
        document.body.appendChild(btn);

        // Floating Button (Hard Reset)
        const btnReset = document.createElement('button');
        btnReset.innerText = "🔄";
        btnReset.title = "Hard Reset (Clear Data & Reload)";
        btnReset.style.cssText = `
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
        `;
        btnReset.onmouseover = () => btnReset.style.transform = "scale(1.1)";
        btnReset.onmouseout = () => btnReset.style.transform = "scale(1)";
        btnReset.onclick = () => {
            // Verificar se modo dev está ativo
            const isDevMode = localStorage.getItem('tellstones_dev_mode') === 'true';

            // Limpar TUDO
            localStorage.clear();
            sessionStorage.clear();

            // Limpar cache PWA
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }

            // Construir URL de reload
            const baseUrl = window.location.href.split('?')[0];
            const timestamp = Date.now();

            // Se estava em dev mode, adicionar parâmetro ?dev=true para reativar
            const newUrl = isDevMode
                ? `${baseUrl}?dev=true&_=${timestamp}`
                : `${baseUrl}?_=${timestamp}`;

            // Forçar hard reload com pequeno delay
            setTimeout(() => {
                window.location.href = newUrl;
            }, 150);
        };
        document.body.appendChild(btnReset);

        // Control Panel - Minimalista
        this.container = document.createElement('div');
        this.container.id = "debug-logger-panel";
        this.container.style.cssText = `
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
        `;
        this.renderContent();
        document.body.appendChild(this.container);
    }

    private togglePanel() {
        this.isOpen = !this.isOpen;
        this.container.style.display = this.isOpen ? "block" : "none";
    }

    private renderContent() {
        // Headers - Minimalista
        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;">
                <h3 style="margin:0;font-size:13px;color:#3498db;font-weight:500;">🔍 Debug</h3>
                <span style="font-size:9px;color:rgba(255,255,255,0.5);">v3.0</span>
            </div>
            <div style="margin-bottom:8px;">
        `;

        // Categories Toggles
        Object.values(LogCategory).forEach(cat => {
            const isActive = Logger.activeCategories.has(cat);
            html += `
                <div style="display:flex;align-items:center;margin:4px 0;">
                    <input type="checkbox" id="log-cat-${cat}" ${isActive ? 'checked' : ''} style="margin-right:8px;cursor:pointer;">
                    <label for="log-cat-${cat}" style="font-size:12px;cursor:pointer;color:${this.getCategoryColor(cat)}">${cat}</label>
                </div>
            `;
        });

        html += `</div>`;

        // --- EventBus Tests Section (v6.0) ---
        html += `
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
        `;

        // --- Game Tools Section (Simplificado) ---
        html += `
            <div style="margin-bottom:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">
                <h4 style="margin:0 0 5px 0;font-size:11px;color:#f39c12;font-weight:500;">⚙️ Automators</h4>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
                     <button id="btn-debug-tutorial" style="padding:6px;background:rgba(142,68,173,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">▶️ Tutorial</button>
                     <button id="btn-debug-botvsbot" style="padding:6px;background:rgba(211,84,0,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🤖 PvE</button>
                </div>
            </div>
        `;

        // Actions
        html += `
            <div style="display:flex;gap:5px;flex-direction:column;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">
                 <button id="btn-use-dummybot" style="padding:6px;background:rgba(22,160,133,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🔧 DummyBot</button>
                 <button id="btn-log-clear" style="padding:6px;background:rgba(192,57,43,0.8);border:none;color:white;border-radius:6px;cursor:pointer;font-size:10px;transition:all 0.2s;">🗑️ Clear</button>
            </div>
        `;

        this.container.innerHTML = html;

        // Bind Events - Categories
        Object.values(LogCategory).forEach(cat => {
            const chk = this.container.querySelector(`#log-cat-${cat}`) as HTMLInputElement;
            if (chk) {
                chk.onchange = (e) => {
                    Logger.toggleCategory(cat, (e.target as HTMLInputElement).checked);
                };
            }
        });

        // EventBus Test Buttons
        const btnEventBusInfo = this.container.querySelector("#btn-eventbus-info") as HTMLElement;
        if (btnEventBusInfo) {
            btnEventBusInfo.onclick = () => {
                if ((window as any).EventBus) {
                    const info = (window as any).EventBus.getDebugInfo();
                    Logger.info(LogCategory.SYSTEM, "📊 EventBus Listeners:\n" + info);
                } else {
                    Logger.error(LogCategory.SYSTEM, "❌ EventBus não encontrado!");
                }
            };
        }

        const btnEventBusHistory = this.container.querySelector("#btn-eventbus-history") as HTMLElement;
        if (btnEventBusHistory) {
            btnEventBusHistory.onclick = () => {
                if ((window as any).EventBus) {
                    const history = (window as any).EventBus.getHistory();
                    Logger.info(LogCategory.SYSTEM, "📜 EventBus History:", history);
                    console.table(history);
                } else {
                    Logger.error(LogCategory.SYSTEM, "❌ EventBus não encontrado!");
                }
            };
        }

        const btnEventBusTestGame = this.container.querySelector("#btn-eventbus-test-game") as HTMLElement;
        if (btnEventBusTestGame) {
            btnEventBusTestGame.onclick = () => {
                if ((window as any).EventBus) {
                    Logger.info(LogCategory.SYSTEM, "✅ Testando GAME:START event...");
                    (window as any).EventBus.emit('GAME:START', { mode: 'pve' });
                } else {
                    Logger.error(LogCategory.SYSTEM, "❌ EventBus não encontrado!");
                }
            };
        }

        const btnEventBusTestTurn = this.container.querySelector("#btn-eventbus-test-turn") as HTMLElement;
        if (btnEventBusTestTurn) {
            btnEventBusTestTurn.onclick = () => {
                if ((window as any).EventBus) {
                    Logger.info(LogCategory.SYSTEM, "✅ Testando TURN:START event...");
                    (window as any).EventBus.emit('TURN:START', { playerIndex: 0, playerName: 'Teste' });
                } else {
                    Logger.error(LogCategory.SYSTEM, "❌ EventBus não encontrado!");
                }
            };
        }

        // DummyBot Button
        const btnDummy = this.container.querySelector("#btn-use-dummybot") as HTMLElement;
        if (btnDummy) btnDummy.onclick = () => {
            if ((window as any).DummyBot) {
                (window as any).BotBrain = (window as any).DummyBot;
                Logger.info(LogCategory.AI, "✅ DummyBot ativado! BotBrain substituído.");
            } else {
                Logger.error(LogCategory.AI, "❌ DummyBot não encontrado!");
            }
        };

        // Clear Console Button
        const btnClear = this.container.querySelector("#btn-log-clear") as HTMLElement;
        if (btnClear) btnClear.onclick = () => Logger.clear();

        // Bot Profile Selector - REMOVIDO (obsoleto no BotBrain v5.0)

        // Tutorial Automator Button
        const btnTut = this.container.querySelector("#btn-debug-tutorial") as HTMLElement;
        if (btnTut) btnTut.onclick = () => {
            Logger.info(LogCategory.SYSTEM, "Starting Tutorial Automator...");
            if ((window as any).TutorialAutomator) {
                (window as any).TutorialAutomator.run();
            } else {
                Logger.error(LogCategory.SYSTEM, "TutorialAutomator class not found. Trying to load script...");
                const script = document.createElement('script');
                script.src = 'src/debug/TutorialAutomator.js';
                script.onload = () => {
                    if ((window as any).TutorialAutomator) (window as any).TutorialAutomator.run();
                    else Logger.error(LogCategory.SYSTEM, "Failed to initialize TutorialAutomator after load.");
                };
                document.head.appendChild(script);
            }
        };

        // Bot vs Bot Button
        const btnBvB = this.container.querySelector("#btn-debug-botvsbot") as HTMLElement;
        if (btnBvB) btnBvB.onclick = () => {
            Logger.info(LogCategory.GAME, "Starting PvE Automator...");
            if ((window as any).PvEAutomator) {
                (window as any).PvEAutomator.run();
            } else {
                Logger.error(LogCategory.GAME, "PvEAutomator not found!");
                const script = document.createElement('script');
                script.src = 'src/debug/PvEAutomator.js';
                script.onload = () => {
                    if ((window as any).PvEAutomator) (window as any).PvEAutomator.run();
                    else Logger.error(LogCategory.SYSTEM, "Failed to initialize PvEAutomator.");
                };
                document.head.appendChild(script);
            }
        };
    }

    private getCategoryColor(cat: string): string {
        switch (cat) {
            case 'AI': return '#a569bd';
            case 'NET': return '#5dade2';
            case 'GAME': return '#f39c12';
            case 'UI': return '#f06292';
            case 'AUTH': return '#16a085';
            case 'TUT': return '#f39c12';
            case 'I18N': return '#8e44ad';
            default: return '#bdc3c7';
        }
    }
}
