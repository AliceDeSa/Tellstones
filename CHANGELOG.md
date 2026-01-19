# Histórico de Versões - Tellstones

## V4.4.9 - Mobile UI Force
**Data:** 19/01/2026
- **[UI]** **Critical Fix:** Uso de `!important` no posicionamento do `#info-sala` para garantir que ele fique colado na borda (corrigindo conflito com regra de celulares pequenos).

## V4.4.8 - Mobile UI Polish
**Data:** 19/01/2026
- **[UI]** **Layout:** Removido espaçamento do painel `#info-sala` em relação às bordas (top/left 0).

## V4.4.7 - Mobile Z-Index Final
**Data:** 19/01/2026
- **[UI]** **Stacking:** Correção de Z-Index: Container do tabuleiro (40) > Info Sala (30).
- **[UI]** **Interaction:** `pointer-events: none` aplicado ao container para permitir cliques na UI subjacente.

## V4.4.6 - Mobile Z-Index Fix
**Data:** 19/01/2026
- **[UI]** **Stacking:** Correção definitiva da ordem de camadas. O container do tabuleiro agora fica acima da interface, permitindo que as pedras (e apenas elas) sobreponham o painel de informações.
- **[UI]** **Revert:** Painel de info retornado ao canto superior esquerdo.

## V4.4.5 - Mobile Layout Reorg
**Data:** 19/01/2026
- **[UI]** **Layout:** Movido o painel de info (`#info-sala`) e botão de sair para o canto **inferior esquerdo** no mobile horizontal, evitando conflito físico com as pedras da reserva.

## V4.4.4 - Mobile Landscape Robustness
**Data:** 19/01/2026
- **[UI]** **Critical Fix:** Alteração na detecção de "Mobile Landscape" para incluir verificação de altura (`max-height: 600px`). Isso garante que os ajustes funcionem mesmo em dispositivos com alta resolução.

## V4.4.3 - Mobile Landscape Fix
**Data:** 19/01/2026
- **[UI]** **Critical Fix:** Aplicação das regras de tamanho de pedra para TODOS os dispositivos móveis em paisagem (até 1025px), não apenas os pequenos.

## V4.4.2 - Mobile Hotfix
**Data:** 19/01/2026
- **[UI]** **Mobile:** Redução no tamanho das pedras de reserva e ajuste de espaçamento.
- **[FIX]** **Stacking Issue:** Correção de sobreposição onde pedras da reserva ficavam atrás do painel de informações.

## V4.4.0 - Bot Alive Update
**Data:** 19/01/2026
- **[FEAT]** **Bot Personality:** Adicionado sistema de diálogo e balões de fala para o Bot.
- **[FEAT]** **Animações:** Implementada animação de colocação de peças (saindo da reserva) e visualização de "Espiar" (brilho dourado).
- **[AI]** **Ajuste de Inteligência:** Bot Agressivo agora usa "Modelo Mental" para evitar desafios suicidas contra pedras que o jogador conhece.
- **[AI]** **Pacing:** Aumento no tempo de "pensamento" do Bot para simular tomada de decisão humana.
- **[FIX]** **Estabilidade:** Correção de travamentos na animação e erro crítico no movimento especial "Chaotic Chain".
- **[FIX]** **CSS:** Correção de erros de sintaxe em `style.css` e posição da animação da reserva.

## V4.3.0 - Tutorials & Mobile Polish
**Data:** 16/01/2026
- **[FIX]** **Tutorial Persistence:** Resolved issue where "Tutorial Finished" message appeared in other game modes.
- **[UI]** **Mobile Experience:** Added drag support for Tutorial box and improved action button positioning.
- **[UI]** **Visuals:** Custom background for Tutorial Hints (`notificação.png`).
- **[UI]** **Polish:** Adjusted Online Menu title scaling and position for mobile devices.

## V4.2.1 - Changelog UI
**Data:** 15/01/2026
- **[UI]** Adição de widget de Changelog na tela inicial.
- **[UI]** Padronização dos botões "Criar" e "Entrar" (256x80px).

## V4.2 - Polish & Animation Fixes
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
