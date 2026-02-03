# Histórico de Versões - Tellstones

Este documento detalha a evolução técnica do projeto, com foco nas decisões arquiteturais, desafios de IA e refatorações de sistema.

---

## V6.0.0 - Authentication & Security Architecture
**Data:** 02/02/2026
**Status:** Major Feature Release

Integração completa do sistema de Autenticação com Firebase, reformulação da interface de Login e melhorias significativas na arquitetura de eventos.

### 🔐 Sistema de Autenticação (Firebase Auth)
-   **[NEW]** **Multi-Provider Login:** Suporte completo para Login com Google, Email/Senha e Acesso Anônimo (Guest).
-   **[SEC]** **Security Architecture:** Implementação de `AuthManager` centralizado com listeners de estado (`AUTH_STATE_CHANGED`), removendo lógica de autenticação dispersa na UI.
-   **[UX]** **Smart Recovery:** Fluxos de Recuperação de Senha e Confirmação de Senha integrados diretamente no modal (`sendPasswordResetEmail`).
-   **[FIX]** **API Restrictions:** Resolução de bloqueios CORS (403 Forbidden) via configuração correta de referrers na Google Cloud Console.

### 🎨 UI/UX Revamp (Login & Settings)
-   **[UI]** **Glassmorphism Modal:** Novo design compacto para o modal de Login/Registro (340px), com blur effect e animações de entrada.
-   **[FLOW]** **Auto-Dismiss:** O modal de login fecha automaticamente ao detectar autenticação bem-sucedida.
-   **[LAYOUT]** **Non-Intrusive Access:** Botão de Login movido para o canto superior esquerdo (fixo), liberando o Start Screen para o fluxo de jogo principal.
-   **[CLEAN]** **Settings Cleanup:** Remoção de botões legados ("Resetar"/"Salvar") que não faziam parte do novo design system.

### 🏗️ Arquitetura & EventBus
-   **[ARCH]** **Event-Driven UI:** O `LoginScreen` agora responde passivamente a eventos de auth, desacoplando a lógica de rede da lógica de apresentação.
-   **[FIX]** **Z-Index Hierarchy:** Ajuste na camada de sobreposição (`z-index: 100001`) para garantir que modais fiquem sempre acima do Tutorial UI.

---

## V5.4.1 - UI Polish && Theme System Architecture
**Data:** 30/01/2026
**Status:** Stable Release

Esta atualização fecha o ciclo de polimento visual da v5.4, introduzindo uma arquitetura robusta para temas dinâmicos e resolvendo inconsistências críticas de navegação na Single Page Application (SPA).

### 🏗️ Arquitetura de UI & Temas
-   **[NEW]** **Theme System Expansion:** A interface `ThemeAssets` foi estendida para suportar injetar assets de UI não-canônicos (como o novo `optionsPanel`). Isso desacopla a lógica de "reskin" do código base, permitindo que cada tema dite não apenas o tabuleiro, mas a interface ao redor dele.
-   **[IMPL]** **Hot-Swap de Temas:** O `ThemeManager` foi refatorado para aplicar trocas de background de elementos de UI (`#settings-screen`) em tempo de execução, sem necessidade de reload, mantendo o estado da aplicação intacto.
-   **[SYNC]** **Bidirectional Data Binding:** Implementada lógica de sincronização de estado entre formulários distintos (Abas Criar/Entrar) via listeners de eventos, garantindo consistência de dados do usuário através da navegação.

### 🐛 Correções de SPA & Navegação
-   **[FIX]** **State Management (ScreenManager):** Resolvido bug crítico de condição de corrida na navegação onde o `mainMenuBtns` perdia sua referência no DOM após transições de tela. A lógica de exibição/ocultação foi centralizada para evitar estados "zumbis".
-   **[FIX]** **Responsive Layout Engine:** O layout centralizado (`#game-modes-screen`) foi reconstruído usando transformações CSS puras (`translate(-50%, -50%)`) em vez de margens flexíveis, garantindo posicionamento "pixel-perfect" independente da resolução ou aspect ratio do dispositivo.
-   **[ASSETS]** **Asset Pipeline Fix:** Caminhos relativos de imagens CSS (`ui/borders/`) foram corrigidos para alinhar com a nova estrutura de pastas do projeto, eliminando erros 404 silenciosos no console.

---

## V5.4.0 - BotBrain Reborn (The AI Overhaul)
**Data:** 29/01/2026
**Status:** Major Architecture Update

Esta é a atualização mais significativa na história do backend do jogo. Todo o subsistema de Inteligência Artificial e Controle de Fluxo foi descartado e reescrito do zero para eliminar dívida técnica e bugs de concorrência.

### 🧠 BotBrain v5.0 (IA Autônoma)
A IA anterior (v4.x) compartilhava estado com o controlador do jogo, o que causava vazamento de informações ("God Mode") e loops infinitos. A v5.0 introduz o conceito de **Agentes Autônomos Desacoplados**.

-   **[ARCH]** **Isolamento de Estado:** O Bot agora possui uma instância privada de memória (`BotMemory`). Ele não tem acesso ao `MainBoard`. Para tomar uma decisão, ele precisa consultar *apenas* o que ele lembra ter visto.
-   **[LOGIC]** **Sistema de Memória Realista (Decay):** Implementado um algoritmo de esquecimento probabilístico. A cada turno, cada memória tem uma chance de "enfraquecer".
    -   *Turno 1:* Lembra de tudo (Confiança 100%).
    -   *Turno 5:* Memória vaga (Confiança 40%).
    -   *Efeito:* O bot comete erros humanos genuínos, em vez de jogar perfeitamente ou aleatoriamente.
-   **[FEAT]** **Inferência Dedutiva:** O Bot agora usa lógica de eliminação. *"Não sei o que é esta pedra oculta, mas vejo todas as outras 6 na mesa, logo, esta deve ser a que falta."*

### ⚙️ Core System: Turnos Individuais & Assincronia
-   **[REWRITE]** **Arquitetura de Turnos (Turn System):** O loop `while(gameRunning)` síncrono foi substituído por uma Máquina de Estados baseada em Eventos (`StateMachine`).
    -   **Antes:** O código tentava executar o turno do bot no mesmo frame do jogador.
    -   **Agora:** Cada turno é uma *Promise*. O jogo aguarda a resolução (`await bot.playTurn()`) antes de prosseguir.
-   **[STABILITY]** **Eliminação de Deadlocks:** Como cada turno é isolado, é impossível o jogo entrar em loop infinito se o Bot falhar. O sistema possui timeouts de segurança que forçam a passagem de turno em caso de erro.
-   **[TEST]** **DummyBot Validation:** Criação de um ambiente de teste estéril (`DummyBot`) para validar matematicamente a passagem de turnos antes de integrar a IA complexa.

---

## V5.3.7 - The TypeScript Migration (Type Safety)
**Data:** 28/01/2026
**Status:** Tech Debt Clean-up

Finalização da migração massiva da base de código legada (JavaScript solto) para **TypeScript Strict Mode**.

### 🛡️ Type Safety & Compiler
-   **[TS]** **Strict Null Checks:** Eliminada toda uma classe de erros (`undefined is not an object`) ao forçar verificação de nulidade em tempo de compilação.
-   **[REFACTOR]** **Interfaces de Contrato:** Definição formal de interfaces para `Action`, `GameState`, `Player` e `BotMemory`. Isso garante que o Bot e o Servidor falem exatamente a mesma língua.
-   **[DEV]** **Automator Tooling:** Criação do `PvEAutomator`, uma ferramenta que joga o jogo contra si mesmo 1000x em segundos para encontrar edge-cases que testes manuais perderiam.

---

## V5.3.5 - Tavern Expansion (Content Update)
**Data:** 25/01/2026
**Status:** Content Release

Expansão significativa do conteúdo visual e interatividade da "Taverna" (Menu de Opções).

### 🏰 Expansão da Taverna (Settings)
-   **[FEAT]** **Drag & Drop Posters:** Pôsteres na parede agora são interativos, podendo ser arrastados e reposicionados livremente.
-   **[CONTENT]** **World Building:** Adição de mapas, quests e tesouros espalhados pelo cenário de fundo.
-   **[PROCEDURAL]** **Povoamento Aleatório:** Sistema que distribui 30+ itens decorativos aleatoriamente a cada carregamento.
-   **[UX]** **Zoom & Pan:** Redimensionamento e navegação interativa pelo cenário da taverna usando scroll do mouse.

---

## V5.3.0 - Navigation & Lobby Update
**Data:** 23/01/2026
**Status:** Feature Release

Reformulação completa do fluxo de navegação e introdução do sistema de Lobby.

### 🧭 Navegação & Telas
-   **[NEW]** **GameModesScreen:** Nova tela intermediária separando modos de jogo (Tutorial, PvE, Online).
-   **[REFACTOR]** **MainMenu Simplificado:** Menu principal reduzido para 3 botões essenciais (Jogar, Opções, Personalização).
-   **[ARCH]** **ScreenManager:** Centralização da lógica de transição de telas (`navigateTo`, `hideAll`).

### 🌐 Sincronização Online (Lobby)
-   **[NEW]** **LobbyScreen:** Interface dedicada para criação e entrada em salas online.
-   **[NET]** **Nickname Sync:** Sincronização automática de inputs de nome entre telas de criar/entrar.
-   **[UX]** **Safety Zones:** Correção de limites de tela para evitar elementos cortados em diferentes resoluções.

---

## V5.2.0 - Global Localization (I18n)
**Data:** 22/01/2026
**Status:** Feature Release

Implementação do sistema de internacionalização para suporte a múltiplos idiomas.

### 🌎 Sistema de Idiomas (LocaleManager)
-   **[NEW]** **Locale Engine:** Carregamento assíncrono de arquivos de tradução JSON (`pt-BR.json`, `en-US.json`).
-   **[FEAT]** **Hot-Swap:** Troca de idioma em tempo real sem recarregar a página (Event-Driven).
-   **[ARCH]** **Smart Fallback:** Sistema robusto que reverte para o idioma padrão se uma chave de tradução estiver faltando.
-   **[DEV]** **Nested Keys:** Suporte a chaves aninhadas (ex: `menu.play`) para melhor organização semântica.

---

## V5.0.0 - Modular Architecture (Clean Code)
**Data:** 21/01/2026
**Status:** Structural Foundation

O ponto de virada do projeto. O antigo arquivo monolítico `script.js` (3000+ linhas) foi explodido em uma arquitetura modular moderna baseada em domínios.

### 🧱 Domínios do Sistema
-   **src/core/**: Regras puras do jogo (`GameRules`). Sem dependência de UI. Testável unitariamente.
-   **src/ui/**: Camada de apresentação (`Renderer`). Só sabe desenhar, não sabe regras.
-   **src/ai/**: Cérebro do bot. Só recebe input e devolve output.
-   **src/net/**: Camada de rede (`Firebase`). Abstrai a complexidade de sincronização realtime.

Essa separação permitiu que trabalhássemos na IA sem quebrar a UI, e na Interface sem quebrar o Multiplayer.

---

## V4.0 - A Era Multiplayer (Realtime Database)
**Data:** 08/01/2026
**Status:** Feature Release

Implementação do suporte a Jogador vs Jogador via Internet.

### 🌐 Sincronização em Tempo Real
-   **[NET]** **Optimistic Updates:** A UI atualiza imediatamente ao clicar, e reverte se o servidor rejeitar a ação, garantindo sensação de latência zero.
-   **[ARCH]** **Lobby System:** Criação de salas persistentes, códigos de convite e sistema de espectadores.
-   **[SEC]** **Validação Server-Side (Simulada):** Regras de validação duplicadas no cliente receptor para impedir movimentos ilegais de clientes modificados.

---

## V1.0 - Genesis (Prototype)
**Data:** 02/07/2025
**Status:** Legacy

O protótipo inicial.
-   **Features:** Jogo local (seat-hot), mecânicas básicas.
-   **Tecnologia:** Vanilla JS, CSS sem processador.
-   **Objetivo:** Provar que a mecânica de Tellstones era traduzível para web.
