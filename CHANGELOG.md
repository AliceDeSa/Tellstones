# Histórico de Versões - Tellstones

## V4.2 - Polish & Animation Fixes (Atual)
**Data:** 12/01/2026
- **[FIX]** Correção crítica na animação de troca de peças (implementação via `AnimationManager` para paridade com Multiplayer).
- **[FIX]** Resolução de erro 404 em `token_generico.png`.
- **[UI]** Ajustes visuais no sistema de feedback do Bot.
- **[CODE]** Limpeza de funções legadas de animação em `PvEMode.js`.

## V4.1 - Bot Intelligence Upgrade
**Data:** 11/01/2026
- **[AI]** Implementação do `BotBrain` com memória de curto e longo prazo (decaimento temporal).
- **[AI]** Lógica de "Humanização": Bot agora respeita restrições cognitivas (não desafia sem info suficiente).
- **[AI]** Sistema de Observação: Bot reage a ações do jogador (Trocas, Viradas) alterando sua confiança.
- **[FEAT]** Suporte a Blefe (Bot pode se gabar com confiança média).

## V4.0 - PvE Mode Release
**Data:** 08/01/2026 - 10/01/2026
- **[NEW]** Lançamento do Modo Jogador vs Máquina (PvE).
- **[NEW]** Arquitetura de IA baseada em "Modelo de Memória" (vs Heurística ou ML simples).
- **[FEAT]** Persistência de estado local (sem necessidade de backend online para PvE).

---

## V3.2 - Performance & Cleanup
**Data:** 10/01/2026
- **[REFACTOR]** Modularização maciça do código:
    - Criação de `src/core` (GameRules, GameConfig).
    - Criação de `src/ui` (Renderer, AnimationManager).
    - Criação de `src/modes` (PvEMode, MultiplayerMode).
- **[FIX]** Correção de erros de sintaxe e declarações duplicadas (`const tutorialUI` etc.).

## V3.1 - Mobile Experience Update
**Data:** 10/01/2026
- **[UI]** Layout polido para dispositivos móveis (Zoom dinâmico em `#tabuleiro-wrapper`).
- **[UI]** Correção de corte de elementos de UI em telas pequenas.
- **[FIX]** Ajuste de erro de CSS `user-drag`.

## V3.0 - Architecture Modernization
**Data:** 08/01/2026
- **[ARCH]** Início da migração de `script.js` monolítico para módulos ES6.
- **[FIX]** Correções de erros assíncronos (`await` fora de função async).

---

## V2.1 - Tutorial Mechanics
**Data:** 08/01/2026
- **[FEAT]** Refinamento do Modo Tutorial.
- **[UX]** Ajustes na UI para não obstruir o jogo durante diálogos do tutorial.
- **[NAV]** Melhorias na navegação entre Tutorial e Menu Principal.

## V2.0 - The Era of Learning (Tutorial Launch)
**Data:** 03/07/2025 (Estimado com base em logs antigos)
- **[NEW]** Lançamento do Modo Tutorial Interativo.
- **[FEAT]** Sistema de etapas guiadas para ensinar regras.

---

## V1.0 - Genesis (Base Game)
**Data:** 02/07/2025
- **[NEW]** Lançamento Inicial (Upload via GitHub).
- **[FEAT]** Multiplayer Local (Hotseat).
- **[FEAT]** Mecânicas Core: Colocar, Virar, Trocar, Espiar, Desafiar.
- **[ASSETS]** Upload inicial de imagens e estilos (`style.css`, `script.js`).
