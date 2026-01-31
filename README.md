# Tellstones: King's Gambit - Online Edition (v5.4.1 - UI Polish)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)]()
[![Version](https://img.shields.io/badge/Version-5.4.1-blue.svg)]()
[![License](https://img.shields.io/badge/License-Fan_Project-purple.svg)]()
[![PWA](https://img.shields.io/badge/PWA-Supported-orange.svg)]()

> **"Memorize. Blefe. Desafie."**

Este projeto foi construído como um estudo avançado de desenvolvimento web moderno, inteligência artificial e estado de jogo em tempo real.

🔗 **Jogue Agora:** [Tellstones Online](https://alicedesa.github.io/Tellstones/)

---

## 📖 Sobre o Jogo

Tellstones é um jogo de memória e blefe para 2 ou 4 jogadores. O objetivo é simples: ser o primeiro a marcar **3 pontos**. 
Os pontos são conquistados ao **desafiar** o oponente a adivinhar o símbolo de uma pedra oculta, ou ao **se gabar** dizendo que você conhece todas as pedras da mesa.

### As Pedras (Tokens)
O jogo utiliza 7 pedras com símbolos distintos:
- 👑 **Coroa**, ⚔️ **Espada**, ⚖️ **Balança**, 🐴 **Cavalo**, 🛡️ **Escudo**, 🚩 **Bandeira**, 🔨 **Martelo**.

### Ações Possíveis
Em seu turno, o jogador pode realizar uma ação:
1.  **Colocar**: Adicionar uma pedra da mão para a mesa (visível).
2.  **Esconder**: Virar uma pedra da mesa para baixo (oculta).
3.  **Trocar**: Mover duas pedras de lugar (pode trocar pedras ocultas!).
4.  **Espiar**: Olhar secretamente uma pedra oculta.
5.  **Desafiar**: Escolher uma pedra oculta do oponente e desafiá-lo a dizer qual é.
    - Se o oponente acertar: Ele ganha 1 ponto.
    - Se errar: Você ganha 1 ponto.
6.  **Se Gabar (Boast)**: Declarar que sabe todas as pedras ocultas. O oponente pode Acreditar (te dá 1 ponto), Duvidar (você prova; se acertar ganha o jogo, se errar perde), ou Se Gabar (aumenta a aposta).

---

## 🚀 Funcionalidades Principais

Este projeto evoluiu de um protótipo simples para uma aplicação web robusta (PWA).

### 🤖 Modo PvE (Inteligência Artificial)
Enfrente um Bot desenvolvido com **arquitetura limpa** e **sistema de memória com decay**.
-   **Memória com Decay**: O Bot "esquece" pedras antigas conforme turnos passam (15% por turno).
-   **Predição Inteligente**: Usa memória e eliminação de pedras visíveis para adivinhar.
-   **Decisões Ponderadas**: Sistema de pontuação para escolher melhor jogada.
-   **Zero Bugs**: Recriado do zero (v5.0) - 100% funcional e estável.

### 🌍 Multiplayer Online
Jogue contra amigos em tempo real.
-   **Sincronização Realtime**: Uso do Firebase Realtime Database para latência mínima.
-   **Resiliência**: Sistema de reconexão automática; se recarregar a página, você volta para a sala.
-   **Lobby e Espectadores**: Suporte para espectadores assistirem a partida.
-   **Nickname Sync**: Inputs de nome sincronizados automaticamente entre formulários.

### 🎨 Sistema de Temas
Personalize a experiência visual do jogo.
-   **Múltiplos Temas**: Tellstones (padrão), Taberna Medieval (em desenvolvimento).
-   **Assets Dinâmicos**: Cada tema possui tabuleiro, background e painel de opções únicos.
-   **Hot-Swap**: Troca de tema em tempo real sem recarregar a página.
-   **Extensível**: Arquitetura preparada para futuros temas (CyberPunk, Coliseum, Arcane).

### 📱 Progressive Web App (PWA)
-   **Instalável**: Pode ser instalado como App no Android/iOS/Desktop.
-   **Offline First**: Assets cacheados via Service Worker para carregamento instantâneo.
-   **Mobile First**: Design responsivo com suporte a rotação e toque otimizado.

### 🎓 Modo Tutorial
-   Um guia interativo passo-a-passo que ensina as regras jogando.
-   Scriptado para garantir que o jogador entenda cada mecânica.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído com foco em **TypeScript** e **Vanilla JS** para máximo controle de performance, tipagem estática e aprendizado profundo, sem dependência de frameworks pesados.

### Frontend
-   **TypeScript (Strict)**: 100% da base de código tipada para segurança e manutenibilidade.
-   **HTML5 Semantic**: Estrutura acessível e moderna.
-   **CSS3 Advanced**:
    -   Variáveis CSS para temas.
    -   Flexbox & Grid Layouts.
    -   Keyframe Animations para transições suaves de pedras.
    -   Modularização via `@import` (Clean Architecture).
-   **JavaScript (ES6+)**:
    -   Módulos ES (`import/export`).
    -   Classes para encapsulamento (`GameController`, `BotBrain`, `Renderer`).
    -   Async/Await para operações de rede.

### Backend & Serviços
-   **Firebase Realtime Database**: Gerenciamento de estado de jogo (Salas, Jogadores, Movimentos).
-   **Google Analytics 4**: Telemetria para balanceamento de jogo (Vitórias do Bot vs Jogador).
-   **Service Workers**: Cache strategy (Stale-While-Revalidate) para PWA.

### Ferramentas de Desenvolvimento
-   **Jest**: Testes unitários para regras de jogo e lógica do Bot.
-   **Husky**: Git Hooks para garantir qualidade antes do commit.
-   **Visual Studio Code**: IDE principal com suporte a Debugging.

---

### 🧠 Nova Arquitetura de IA (BotBrain v5)
A partir da versão v5.4.0, o sistema de Inteligência Artificial foi completamente reescrito para suportar **Turnos Individuais Detalhados** e **Lógica Autônoma**.

#### 1. Turnos Individuais (Individual Turn System)
Diferente da versão antiga (monolítica), o controle do jogo agora opera em um sistema de *passagem de bastão*.
-   **Orquestração**: O `GameController` gerencia o estado global, mas não decide pelo jogador/bot.
-   **Isolamento**: Quando é a vez do Bot, o sistema concede controle total a ele. O Bot processa o estado, consulta sua memória, toma uma decisão e devolve uma `Action` para o controlador.
-   **Assincronia**: Todas as tomadas de decisão são assíncronas, permitindo animações suaves e "tempo de pensamento" sem travar a UI.

#### 2. Bots Autônomos (Decentralized Logic)
Cada Bot é agora uma instância independente (`BotBrain`) com sua própria "psique":
-   **Memória Privada**: Cada bot mantém sua própria instância de `BotMemory`. Eles não sabem o que está na mesa a menos que tenham visto (e lembrado).
-   **Decay de Memória**: A memória falha. O Bot esquece pedras antigas ou se confunde quando muitas trocas ocorrem (simulação de carga cognitiva humana).
-   **Personalidade Modular**: A arquitetura permite injetar diferentes "perfis" de comportamento (Agressivo, Cauteloso, Trapaceiro) que avaliam riscos de forma diferente.

#### 3. Recriação dos Sistemas (System Rewrite)
-   **Clean Architecture**: Separação estrita entre Regras (`GameRules`), Estado (`GameState`) e Apresentação (`Renderer`).
-   **Event-Driven**: A comunicação entre sistemas ocorre via `EventBus`, reduzindo acoplamento.
-   **TypeScript Strict**: Garantia de integridade de dados em todo o fluxo de jogo.

---

## 📂 Estrutura do Projeto

A arquitetura foi refatorada na versão 5.0 para seguir princípios de **Clean Code** e **Separação de Responsabilidades**.

```bash
src/
├── ai/                 # Inteligência Artificial
│   ├── BotBrain.ts     # "Cérebro" do Bot v5.0 (Decisão)
│   ├── BotMemory.ts    # Sistema de Memória (Decay)
│   └── DummyBot.ts     # Bot de Teste (Validação)
├── config/             # Configurações
│   ├── firebase-config.js
│   └── GameConfig.js
├── core/               # Lógica de Negócio (Core Domain)
│   ├── GameController.js # Gerente de Estado Global
│   ├── GameRules.js      # Regras Puras (Validação)
│   ├── RoomManager.js    # Gestão de Multiplayer
│   └── InputHandler.js   # Entradas do Jogador
├── modes/              # Controladores de Modos de Jogo
│   ├── PvEMode.js      # Lógica vs Bot
│   ├── MultiplayerMode.js
│   └── TutorialMode.js
├── ui/                 # Camada de Apresentação
│   ├── Renderer.js     # Manipulação do DOM
│   ├── AnimationManager.js
│   ├── NotificationManager.js
│   ├── ChangelogManager.js
│   └── effects/        # Efeitos Visuais (Confetti, etc)
└── utils/              # Utilitários
    ├── AudioManager.js # Gerenciador de Som
    └── Logger.js       # Log Centralizado
assets/                 # Recursos Estáticos
├── css/                # Estilos Modularizados (Layout, Components)
├── img/                # Sprites e UI
└── audio/              # Efeitos Sonoros e Música
```

---

## 📅 Histórico de Atualizações (Changelog)

### v5.4.1 - UI Polish & Theme System (Atual)
-   **Refinamento UI**: Correção de alinhamento do GameModes, slogan unificado, emojis removidos.
-   **Menu Online**: Navegação corrigida, seleção Jogador/Espectador restaurada, nickname sync.
-   **Sistema de Temas**: Suporte para `optionsPanel` personalizado, cada tema com painel de opções único.
-   **Bug Fixes**: mainMenuBtns error, CSS paths, screen registration.

### v5.4.0 - BotBrain Reborn
-   **Recriação Total da IA**: BotBrain v5.0 (~320 linhas, 50% menos código).
-   **Sistema de Memória**: BotMemory separado com decay automático.
-   **Zero Bugs**: Eliminados 100% dos travamentos do bot.
-   **DummyBot**: Bot de teste para validação do sistema de turnos.

### v5.1.0 - The Quality Update
-   **Refatoração Completa**: Migração de `script.js` monolítico para arquitetura modular.
-   **Novo Sistema de IA**: Implementação de lógica de "Match Point" (Bot não aceita blefes se estiver perto de perder).
-   **Tratamento de Erros**: Correção de "Hangs" (travamentos) em turnos assíncronos.
-   **Mobile UI**: Correção de sobreposição de elementos em telas pequenas (Z-Index fix).

### v4.0 - The Online Update
-   Introdução do Multiplayer via Firebase.
-   Criação de Salas e Códigos de Acesso.

### v3.0 - The AI Update
-   Introdução do Bot inicial.
-   Sistema de Memória de Curto Prazo simulada.

---

## 💿 Como Executar Localmente

1.  **Clone o Repositório**:
    ```bash
    git clone https://github.com/AliceDeSa/Tellstones.git
    cd Tellstones
    ```

2.  **Instale Dependências (Opcional, para testes)**:
    ```bash
    npm install
    ```

3.  **Execute um Servidor Local**:
    Como utilizamos Módulos ES6, é necessário um servidor HTTP (não abra o `index.html` direto).
    Você pode usar a extensão **Live Server** do VS Code ou:
    ```bash
    npx serve .
    ```

4.  **Acesse**:
    Abra `http://localhost:5000` (ou a porta indicada).

---

## 📜 Licença e Créditos

Este é um **Projeto de Fã** sem fins lucrativos.
Todo o código fonte é livre para fins educacionais.

-   **Desenvolvimento**: AliceDeSa
-   **Conceito & Referencias**: [Riot Games](https://www.riotgames.com/). *Tellstones* é uma marca registrada da Riot Games. Este projeto não é afiliado à Riot Games.

---
*Feito com 💙 e TypeScript.*
