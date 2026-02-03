"use strict";
const ChangelogManager = {
    data: [
        {
            version: "v6.0.0 - Auth & Security Architecture",
            changes: [
                "<strong>Firebase Auth:</strong> Login via Google, Email/Senha e Convidado.",
                "<strong>UI Revamp:</strong> Novo modal de login compacto e responsivo.",
                "<strong>Security:</strong> Correção de restrições de API e arquitetura segura.",
                "<strong>UX Polish:</strong> Auto-dismiss no login e fluxos de recuperação de senha."
            ]
        },
        {
            version: "v5.4.1 - UI Polish & Theme Architecture",
            changes: [
                "<strong>Theme Engine:</strong> Injeção dinâmica de assets de UI (Hot-Swap sem reload).",
                "<strong>SPA Stability:</strong> Correção de 'Zombie States' na navegação do ScreenManager.",
                "<strong>Data Binding:</strong> Sincronização bidirecional de inputs entre views.",
                "<strong>Responsive Layout:</strong> Layout engine centralizado via CSS Transforms."
            ]
        },
        {
            version: "v5.4.0 - BotBrain Reborn (AI Overhaul)",
            changes: [
                "<strong>Async Turn System:</strong> Máquina de estados assíncrona para eliminar deadlocks.",
                "<strong>Agent Autonomy:</strong> Isolamento total de memória (Fim do 'God Mode').",
                "<strong>Memory Decay:</strong> Algoritmo de esquecimento probabilístico realista.",
                "<strong>Deduction Logic:</strong> Inferência por eliminação de informações públicas."
            ]
        },
        {
            version: "v5.3.7 - The TypeScript Migration",
            changes: [
                "<strong>Strict Safety:</strong> Compilação estrita eliminando erros de runtime (Null Checks).",
                "<strong>Type Contracts:</strong> Formalização de interfaces Cliente-Servidor.",
                "<strong>Automator:</strong> Ferramenta de stress-test para validação de lógica."
            ]
        },
        {
            version: "v5.3.5 - Tavern Expansion",
            changes: [
                "<strong>Tavern Upgrade:</strong> Pôsteres interativos (Drag & Drop) e expansão de mundo.",
                "<strong>Procedural Decor:</strong> Povoamento aleatório de 30+ itens no cenário.",
                "<strong>Interactive:</strong> Zoom e Pan interativo no menu de opções."
            ]
        },
        {
            version: "v5.3.0 - Navigation & Lobby Update",
            changes: [
                "<strong>GameModesScreen:</strong> Nova tela seletora de modos de jogo.",
                "<strong>Lobby System:</strong> Interface dedicada para salas online e nickname sync.",
                "<strong>Nav Refactor:</strong> Simplificação do MainMenu e centralização no ScreenManager."
            ]
        },
        {
            version: "v5.2.0 - Global Localization (I18n)",
            changes: [
                "<strong>Locale Engine:</strong> Suporte multi-idioma (PT-BR / EN-US) via JSON.",
                "<strong>Hot-Swap:</strong> Troca instantânea de idioma sem reload.",
                "<strong>Smart Fallback:</strong> Prevenção de chaves ausentes com default locale."
            ]
        },
        {
            version: "v5.0.0 - Modular Architecture",
            changes: [
                "<strong>Clean Architecture:</strong> Separação em Domínios (Core / UI / AI / Net).",
                "<strong>Event-Driven:</strong> Comunicação desacoplada via EventBus.",
                "<strong>Refactor:</strong> Decomposição do monolito legado 'script.js'."
            ]
        },
        {
            version: "v4.0.0 - Realtime Multiplayer",
            changes: [
                "<strong>Netcode:</strong> 'Optimistic Updates' para latência zero na UI.",
                "<strong>Security:</strong> Validação de regras duplicada no cliente (Anti-Cheat).",
                "<strong>Persistence:</strong> Sistema de Lobby e reconexão automática."
            ]
        },
        {
            version: "v1.0.0 - Genesis (Prototype)",
            changes: [
                "<strong>Proof of Concept:</strong> Mecânicas core e renderização DOM básica.",
                "<strong>Hotseat:</strong> Multiplayer local em Vanilla JS."
            ]
        }
    ],
    init: function () {
        this.render();
        // Listener para mudança de idioma
        if (window.EventBus) {
            window.EventBus.on('LOCALE:CHANGE', () => {
                this.render();
            });
        }
    },
    render: function () {
        // Container element
        let container = document.getElementById("changelog-box");
        // If not exists, create it (Robustness)
        if (!container) {
            container = document.createElement("div");
            container.id = "changelog-box";
            // Insert after start-screen or append to body logic
            const startScreen = document.getElementById("start-screen");
            if (startScreen && startScreen.parentNode) {
                startScreen.parentNode.insertBefore(container, startScreen.nextSibling);
            }
            else {
                document.body.appendChild(container);
            }
        }
        // Import LocaleManager dinamically if available or use global
        let patchNotesTitle = "Patch Notes";
        // Tentativa de pegar tradução se LocaleManager estiver disponível globalmente (loaded via main)
        // Como ChangelogManager é carregado cedo, pode não estar disponível ainda, 
        // mas o re-render via LOCALE:CHANGE corrigirá isso.
        // Vamos usar data-i18n para o título
        // Mas renderizamos o HTML como string, então precisamos injetar o atributo
        let html = `<h3 data-i18n="menu.patchNotes">Patch Notes</h3><ul>`;
        this.data.forEach(item => {
            html += `
                <li><strong>${item.version}</strong>
                    <ul>
                        ${item.changes.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </li>
            `;
        });
        html += `</ul>`;
        container.innerHTML = html;
        // Trigger translation update if function exists
        if (typeof window.updateHTMLTranslations === 'function') {
            window.updateHTMLTranslations();
        }
        console.log("[ChangelogManager] UI Rendered.");
    }
};
window.ChangelogManager = ChangelogManager;
// Auto-initialize
ChangelogManager.init();
