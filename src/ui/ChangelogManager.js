// =========================
// ChangelogManager
// =========================

const ChangelogManager = {
    data: [
        {
            version: "v5.2.0 - AI & UI Polish",
            changes: [
                "<strong>AI:</strong> Bot mais inteligente (Memória Dinâmica).",
                "<strong>Safe Play:</strong> Bot evita blefes arriscados.",
                "<strong>UI Fixes:</strong> Fim dos conflitos de camadas (Z-Index).",
                "<strong>Mobile:</strong> Ícone de ações corrigido."
            ]
        },
        {
            version: "v5.1.0 - The Quality Update",
            changes: [
                "<strong>Quality:</strong> Testes Automatizados & CI/CD.",
                "<strong>Arch:</strong> Limpeza de arquivos (script.js -> main.js).",
                "<strong>Fix:</strong> Correções no Tutorial e Logs.",
                "<strong>Dev:</strong> Novo sistema de Logger."
            ]
        },
        {
            version: "v5.0.0 - Modular Era",
            changes: [
                "<strong>Architecture:</strong> Nova estrutura de módulos (Managers).",
                "<strong>Analytics:</strong> Rastreamento avançado. (GA4)",
                "<strong>Security:</strong> Proteção de API Keys.",
                "<strong>Fixes:</strong> Multiplayer Start & Sync."
            ]
        },
        {
            version: "v4.5.x - UI Polish",
            changes: [
                "<strong>Z-Index:</strong> Sistema de camadas corrigido.",
                "<strong>Action Buttons:</strong> Posicionamento fixo e visível.",
                "<strong>Fonts:</strong> Fontes offline (Cinzel)."
            ]
        },
        {
            version: "v4.4.x - Mobile Focus",
            changes: [
                "<strong>Landscape:</strong> Suporte robusto a rotação.",
                "<strong>Layout:</strong> Painéis ajustados para evitar sobreposição.",
                "<strong>Bot:</strong> Personalidade e animações 'vivas'."
            ]
        },
        {
            version: "v4.0 - PvE Update",
            changes: [
                "<strong>Novo Modo:</strong> Jogador vs Máquina.",
                "<strong>AI:</strong> Bot com Modelo de Memória.",
                "<strong>Persistência:</strong> Save local automático."
            ]
        },
        {
            version: "v3.0 - Foundation",
            changes: [
                "<strong>Refactor:</strong> Início da Modularização.",
                "<strong>Mobile:</strong> Zoom dinâmico no tabuleiro."
            ]
        },
        {
            version: "v2.0 - Tutorial",
            changes: [
                "<strong>Interactive:</strong> Modo Tutorial guiado.",
                "<strong>UX:</strong> Dicas e fluxo de aprendizado."
            ]
        },
        {
            version: "v1.0 - Genesis",
            changes: [
                "<strong>Launch:</strong> Multiplayer Local (Hotseat).",
                "<strong>Core:</strong> Mecânicas básicas de jogo."
            ]
        }
    ],

    init: function () {
        this.render();
    },

    render: function () {
        // Container element
        let container = document.getElementById("changelog-box");

        // If not exists, create it (Robustness)
        if (!container) {
            container = document.createElement("div");
            container.id = "changelog-box";
            // Insert after start-screen or append to body logic could go here
            // But usually we expect the placeholder or injection point.
            // Let's assume we append to body but CSS handles positioning relative to start-screen
            // per existing CSS: #start-screen:not(.active) ~ #changelog-box
            // This implies it must be a sibling AFTER start-screen.
            const startScreen = document.getElementById("start-screen");
            if (startScreen && startScreen.parentNode) {
                startScreen.parentNode.insertBefore(container, startScreen.nextSibling);
            } else {
                document.body.appendChild(container);
            }
        }

        let html = `<h3>Patch Notes</h3><ul>`;

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
        console.log("[ChangelogManager] UI Rendered.");
    }
};

window.ChangelogManager = ChangelogManager;
