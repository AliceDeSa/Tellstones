# 📘 Tellstones - Padrões de Qualidade de Projeto
**Template de Referência para Desenvolvimento de Aplicações Web & Games**

> Este documento compila todas as tecnologias, arquiteturas, padrões e boas práticas utilizadas no desenvolvimento do Tellstones. 
> O objetivo é servir como **base de qualidade** para futuros projetos, evitando retrabalhos, refatorações complexas e dívida técnica desde o início.

---

## 📑 Índice

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura de Pastas](#3-arquitetura-de-pastas)
4. [Princípio de Isolamento de Módulos](#4-princípio-de-isolamento-de-módulos)
5. [Sistema EventBus](#5-sistema-eventbus)
6. [Sistema de Internacionalização (i18n)](#6-sistema-de-internacionalização-i18n)
7. [Política de Z-Index](#7-política-de-z-index)
8. [Sistema de Logging Centralizado](#8-sistema-de-logging-centralizado)
9. [Padronização de Comentários e Código](#9-padronização-de-comentários-e-código)
10. [Sistema de Changelog Versionado](#10-sistema-de-changelog-versionado)
11. [Contratos de Interface](#11-contratos-de-interface)
12. [Sistema de Temas Dinâmicos](#12-sistema-de-temas-dinâmicos)
13. [Progressive Web App (PWA)](#13-progressive-web-app-pwa)
14. [Estratégias de Otimização](#14-estratégias-de-otimização)
15. [Checklist de Validação pré-Commit](#15-checklist-de-validação-pré-commit)
16. [Template para Novos Projetos](#16-template-para-novos-projetos)

---

## 1. Visão Geral do Projeto

**Tellstones: King's Gambit** é uma aplicação web que evoluiu de um protótipo simples (v1.0) para uma Progressive Web App (PWA) completa (v6.0+), implementando:

- Jogo de memória e blefe para 2-4 jogadores
- Modos: Tutorial, PvE (vs IA), Multiplayer Online, Campanha (em dev)
- Inteligência Artificial com sistema de memória avançado
- Autenticação Firebase (Google, Email, Guest)
- Internacionalização (PT-BR, EN-US)
- Sistema de temas visuais dinâmicos
- Ambiente 3D navegável (em desenvolvimento)

### Evolução Arquitetural

| Versão | Arquitetura | Problemas |
|--------|-------------|-----------|
| v1.0 | Monolítico (`script.js` 3000+ linhas) | Não testável, alto acoplamento |
| v3.0 | Módulos soltos | Dependências circulares, vazamento de estado |
| v5.0 | **Clean Architecture** | ✅ Isolamento, testabilidade, escalabilidade |
| v6.0 | Clean + Auth + i18n | ✅ Autenticação, multi-idioma |

> **Lição Aprendida:** Iniciar com arquitetura modular desde o início evita refatorações massivas no futuro.

---

## 2. Stack Tecnológica

### 2.1 Linguagens

| Linguagem | Uso | Configuração |
|-----------|-----|--------------|
| **TypeScript** | Código principal (100%) | `strict: true` no tsconfig.json |
| **HTML5** | Estrutura semântica | Tags modernas (`<section>`, `<article>`, etc) |
| **CSS3** | Estilos avançados | Variáveis CSS, Flexbox, Grid, Keyframes |
| **JavaScript (ES6+)** | Legado/Fallback | Módulos ES (`import/export`) |

### 2.2 Configuração TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "allowJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 2.3 Ferramentas de Build

| Ferramenta | Propósito |
|------------|-----------|
| **Vite** | Build tool e dev server (HMR ultrarrápido) |
| **TypeScript Compiler** | Transpilação TS → JS |
| **Jest** | Testes unitários |
| **Husky** | Git hooks (pré-commit) |

### 2.4 Serviços Backend

| Serviço | Uso |
|---------|-----|
| **Firebase Auth** | Autenticação (Google, Email, Guest) |
| **Firebase Realtime Database** | Estado de jogo multiplayer em tempo real |
| **Google Analytics 4** | Telemetria e métricas de balanceamento |
| **Service Workers** | Cache para PWA (Stale-While-Revalidate) |

### 2.5 Bibliotecas 3D (v7.0+)

| Biblioteca | Uso |
|------------|-----|
| **Three.js** | Renderização 3D |
| **React Three Fiber** | Integração React + Three.js |
| **@react-three/drei** | Helpers e componentes |
| **@react-three/postprocessing** | Efeitos visuais (bloom, etc) |

---

## 3. Arquitetura de Pastas

```
src/
├── core/           # 🧠 Núcleo do Sistema
│   ├── EventBus.ts           # Hub de comunicação entre módulos
│   ├── GameController.ts     # Gerenciador de estado global
│   ├── GameRules.ts          # Regras puras (sem side-effects)
│   ├── MatchManager.ts       # Orquestração de partidas
│   ├── RoomManager.ts        # Gerenciamento de salas online
│   ├── AuthManager.ts        # Autenticação centralizada
│   ├── ChallengeResolver.ts  # Resolução de desafios/boast
│   └── InputHandler.ts       # Captura de inputs do jogador
│
├── screens/        # 📱 Telas da Aplicação
│   ├── ScreenManager.ts      # Navegação entre telas
│   ├── MainMenu.ts           # Menu principal
│   ├── GameModes.ts          # Seleção de modo de jogo
│   ├── Settings.ts           # Configurações
│   ├── LoginScreen.ts        # Autenticação UI
│   └── Customization.ts      # Personalização visual
│
├── modes/          # 🎮 Modos de Jogo (ISOLADOS!)
│   ├── GameMode.ts           # Interface base (contrato)
│   ├── TutorialMode.ts       # Lógica exclusiva do tutorial
│   ├── PvEMode.ts            # Lógica vs Bot
│   ├── MultiplayerMode.ts    # Lógica multiplayer
│   └── tutorial/             # Sub-componentes do tutorial
│
├── ai/             # 🤖 Sistema de Inteligência Artificial
│   ├── BotBrain.ts           # Núcleo de decisão do Bot
│   ├── BotMemory.ts          # Sistema de memória (com decay)
│   ├── BotController.ts      # Orquestrador de ações
│   └── personality/          # Perfis de comportamento
│
├── ui/             # 🎨 Camada de Apresentação
│   ├── Renderer.ts           # Manipulação do DOM
│   ├── ThemeManager.ts       # Gerenciamento de temas
│   ├── AnimationManager.ts   # Controle de animações
│   ├── AudioManager.ts       # Som e música
│   └── NotificationManager.ts # Toasts e notificações
│
├── data/           # 💾 Persistência de Dados
│   ├── SaveManager.ts        # Salvamento local
│   ├── SettingsManager.ts    # Preferências do usuário
│   └── LocaleManager.ts      # Gerenciador de idiomas
│
├── i18n/           # 🌍 Arquivos de Tradução
│   ├── pt-BR.json            # Português (Brasil)
│   └── en-US.json            # Inglês (EUA)
│
├── tavern/         # 🏰 Ambiente 3D (React + Three.js)
│   ├── TavernCanvas.tsx      # Canvas principal
│   ├── SceneManager.tsx      # Gerenciador de cenas
│   ├── zones/                # Áreas navegáveis
│   └── components/           # Objetos 3D interativos
│
├── utils/          # 🔧 Utilitários
│   ├── Logger.ts             # Log centralizado
│   └── utils.ts              # Helpers genéricos
│
└── main.ts         # 🚀 Ponto de Entrada da Aplicação

config/             # ⚙️ Configurações (Firebase rules, etc)
docs/               # 📚 Documentação
assets/             # 📦 Recursos estáticos (imagens, sons, temas)
tests/              # 🧪 Testes automatizados
scripts/            # 🛠️ Scripts de desenvolvimento
```

### Regras de Organização

1. **Um arquivo = Uma responsabilidade** (Single Responsibility)
2. **Pastas por domínio** (não por tipo de arquivo)
3. **Índices explícitos** quando há muitos exports
4. **Sub-pastas** para módulos complexos (ex: `ai/personality/`)

---

## 4. Princípio de Isolamento de Módulos

> **Regra de Ouro:** Cada módulo faz UMA coisa e não acessa outros módulos diretamente.

### 4.1 Regras de Dependência

```
✅ PERMITIDO                         ❌ PROIBIDO
─────────────────────────────────    ─────────────────────────────────
Screens → EventBus                   Tutorial → PvEMode
Modes → EventBus                     PvEMode → CampaignMode
Modes → GameRules                    Screen → GameController (direta)
Modes → BotBrain (via interface)     Módulo A → variável interna de B
UI → EventBus
```

### 4.2 Comunicação Correta

```typescript
// ✅ CORRETO: Comunicação via EventBus
EventBus.emit('GAME:START', { mode: 'pve' });
EventBus.on('GAME:END', (data) => this.handleGameEnd(data));

// ❌ ERRADO: Chamada direta a outro módulo
pveMode.start();  // NUNCA faça isso!
tutorialMode.currentStep;  // Acesso indevido a estado interno
```

### 4.3 Por que Isolar?

| Problema Evitado | Descrição |
|------------------|-----------|
| **Dependências Circulares** | A depende de B, B depende de A → Travamento |
| **Vazamento de Estado** | Alterações inesperadas por outros módulos |
| **Dificuldade de Testes** | Precisa mockar o sistema inteiro |
| **Efeito Dominó** | Uma mudança quebra módulos não relacionados |

---

## 5. Sistema EventBus

O **EventBus** é o hub central de comunicação entre módulos, implementando o padrão **Publisher-Subscriber**.

### 5.1 Implementação Base

```typescript
// src/core/EventBus.ts
type EventCallback = (data?: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        Logger.sys(`EventBus Error on ${event}:`, error);
      }
    });
  }

  // Limpa todos os listeners (útil para cleanup)
  clear(): void {
    this.listeners.clear();
  }
}

export default new EventBus();
```

### 5.2 Eventos Padrão do Sistema

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `SCREEN:CHANGE` | `{ screen: string }` | Navegação entre telas |
| `GAME:START` | `{ mode: string, config?: object }` | Início de partida |
| `GAME:END` | `{ winner: string, score: object }` | Fim de partida |
| `TURN:CHANGE` | `{ player: string, index: number }` | Mudança de turno |
| `SETTINGS:UPDATE` | `{ key: string, value: any }` | Configuração alterada |
| `THEME:CHANGE` | `{ theme: string }` | Tema visual alterado |
| `LOCALE:CHANGE` | `{ locale: string }` | Idioma alterado |
| `AUTH:STATE_CHANGED` | `{ user: User \| null }` | Estado de autenticação |
| `AUDIO:MUTE:CHANGED` | `{ isMuted: boolean }` | Estado do áudio |

### 5.3 Convenção de Nomenclatura

```
DOMÍNIO:AÇÃO[:DETALHE]

Exemplos:
- GAME:START
- GAME:END
- TURN:CHANGE
- PLAYER:ACTION:PLACE
- BOT:DECISION:MADE
- UI:ANIMATION:COMPLETE
```

### 5.4 Boas Práticas

1. **Sempre tipar o payload** com interfaces
2. **Documentar eventos** no arquivo de definições
3. **Não criar eventos para cada micro-ação**
4. **Usar `off()` no cleanup** para evitar memory leaks
5. **Envolver callbacks em try-catch** no emit

---

## 6. Sistema de Internacionalização (i18n)

### 6.1 Arquitetura

```
src/i18n/
├── pt-BR.json     # Traduções Português (Brasil)
└── en-US.json     # Traduções Inglês (EUA)

src/data/
└── LocaleManager.ts  # Gerenciador de idiomas
```

### 6.2 Estrutura do Arquivo de Tradução

```json
{
  "menu": {
    "play": "JOGAR",
    "options": "OPÇÕES",
    "gameModes": "Modos de Jogo"
  },
  "game": {
    "yourTurn": "Sua vez",
    "actions": {
      "place": "Colocar",
      "hide": "Esconder"
    },
    "stones": {
      "Crown": "Coroa",
      "Sword": "Espada"
    }
  },
  "notifications": {
    "peeked": "Você espiou: {stone}"
  }
}
```

### 6.3 LocaleManager

```typescript
// src/data/LocaleManager.ts
class LocaleManager {
  private translations: Record<string, any> = {};
  private currentLocale: string = 'pt-BR';
  private fallbackLocale: string = 'pt-BR';

  async loadLocale(locale: string): Promise<void> {
    try {
      const response = await fetch(`/src/i18n/${locale}.json`);
      this.translations = await response.json();
      this.currentLocale = locale;
      EventBus.emit('LOCALE:CHANGE', { locale });
    } catch (error) {
      Logger.sys(`Falha ao carregar idioma ${locale}, usando fallback`);
      if (locale !== this.fallbackLocale) {
        await this.loadLocale(this.fallbackLocale);
      }
    }
  }

  // Obtém tradução por chave aninhada: t('game.actions.place')
  t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let value: any = this.translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        Logger.sys(`[i18n] Chave não encontrada: ${key}`);
        return key; // Retorna a chave como fallback
      }
    }

    // Substituição de parâmetros: {stone} -> "Coroa"
    if (params && typeof value === 'string') {
      for (const [param, replacement] of Object.entries(params)) {
        value = value.replace(`{${param}}`, replacement);
      }
    }

    return value;
  }

  getCurrentLocale(): string {
    return this.currentLocale;
  }
}

export default new LocaleManager();
```

### 6.4 Uso no Código

```typescript
import LocaleManager from './data/LocaleManager.ts';

// Texto simples
const label = LocaleManager.t('menu.play');  // "JOGAR"

// Texto com parâmetros
const msg = LocaleManager.t('notifications.peeked', { stone: 'Coroa' });
// Resultado: "Você espiou: Coroa"

// Troca de idioma
await LocaleManager.loadLocale('en-US');
```

### 6.5 Boas Práticas i18n

1. **Nunca hardcode strings na UI** - Sempre usar `LocaleManager.t()`
2. **Organizar por domínio** - menu, game, settings, etc
3. **Usar parâmetros** para strings dinâmicas
4. **Manter fallback** para idioma padrão
5. **Emitir evento** ao trocar idioma para atualizar UI

---

## 7. Política de Z-Index

Sistema de camadas visuais padronizado para evitar conflitos de sobreposição.

### 7.1 Faixas de Z-Index

| Camada | Faixa | Uso |
|--------|-------|-----|
| **Base** | 100-149 | Tabuleiro, Pedras (estado normal) |
| **Active** | 150-199 | Itens arrastáveis, Moeda animada |
| **UI** | 200-299 | HUD, Placares, Botões laterais |
| **Modals** | 1000-1049 | Card de ações, Popup de regras |
| **Overlay** | 1050-1099 | Ícones flutuantes, Botões de fechar |
| **Critical** | 2000-2199 | Toasts, Telas de vitória/derrota |
| **Auth** | 10000-10100 | Modais de login/autenticação |
| **Debug** | 9000+ | Dev Tools, Logger visual |

### 7.2 Exemplos CSS

```css
/* ✅ CORRETO: Usar faixas definidas */
.pedra { z-index: 100; }
.pedra.dragging { z-index: 150; }
.modal { z-index: 1000; }
.toast { z-index: 2100; }
.login-modal { z-index: 10001; }

/* ❌ PROIBIDO: Números mágicos */
.toast { z-index: 99999; }  /* NUNCA faça isso! */
.overlay { z-index: 10005; }  /* Evite! */
```

### 7.3 Constantes TypeScript

```typescript
// src/core/constants.ts
export const Z_INDEX = {
  BASE: 100,
  ACTIVE: 150,
  UI: 250,
  MODAL: 1000,
  OVERLAY: 1050,
  CRITICAL: 2100,
  AUTH: 10001,
  DEBUG: 9000
} as const;
```

---

## 8. Sistema de Logging Centralizado

### 8.1 Por que Centralizar?

- **Filtrar por categoria** (AI, Game, Network, etc)
- **Desligar logs em produção** facilmente
- **Formatação consistente** com timestamps e cores
- **Rastreabilidade** em debugging complexo

### 8.2 Implementação

```typescript
// src/utils/Logger.ts
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const COLORS = {
  SYS: '#888',
  GAME: '#4CAF50',
  AI: '#FF9800',
  NET: '#2196F3',
  UI: '#9C27B0',
  AUTH: '#E91E63',
  I18N: '#00BCD4',
  TUT: '#FFEB3B'
};

class Logger {
  private enabled: boolean = true;
  private minLevel: LogLevel = 'DEBUG';

  sys(message: string, ...args: any[]): void {
    this.log('SYS', message, args);
  }

  game(message: string, ...args: any[]): void {
    this.log('GAME', message, args);
  }

  ai(message: string, ...args: any[]): void {
    this.log('AI', message, args);
  }

  net(message: string, ...args: any[]): void {
    this.log('NET', message, args);
  }

  ui(message: string, ...args: any[]): void {
    this.log('UI', message, args);
  }

  auth(message: string, ...args: any[]): void {
    this.log('AUTH', message, args);
  }

  private log(category: keyof typeof COLORS, message: string, args: any[]): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().slice(11, 23);
    const color = COLORS[category];
    
    console.log(
      `%c[${timestamp}] [${category}]`,
      `color: ${color}; font-weight: bold`,
      message,
      ...args
    );
  }

  disable(): void { this.enabled = false; }
  enable(): void { this.enabled = true; }
}

export default new Logger();
```

### 8.3 Uso Correto

```typescript
import Logger from './utils/Logger';

// ✅ CORRETO
Logger.sys('Aplicação inicializada');
Logger.game('Turno avançou para jogador 2');
Logger.ai('Bot decidiu: place na posição 3');
Logger.net('Sala criada: ABC123');
Logger.auth('Usuário autenticado:', user.email);

// ❌ ERRADO
console.log('debug aqui');  // NUNCA use console.log direto!
console.warn('algo deu errado');  // Use Logger.sys() com contexto
```

### 8.4 Categorias Padrão

| Método | Uso | Cor |
|--------|-----|-----|
| `sys()` | Sistema, inicialização, erros gerais | Cinza |
| `game()` | Regras, turnos, jogadas | Verde |
| `ai()` | Decisões do bot, memória | Laranja |
| `net()` | Rede, Firebase, rooms | Azul |
| `ui()` | Atualizações visuais, DOM | Roxo |
| `auth()` | Login, logout, sessão | Rosa |
| `tut()` | Tutorial steps | Amarelo |

---

## 9. Padronização de Comentários e Código

### 9.1 Idioma

- **Comentários**: Português (PT-BR)
- **Código**: Inglês (variáveis, funções, classes)
- **Commits**: Português (descrição) + Inglês (prefixo)

### 9.2 Formato de Comentários

```typescript
// ========================
// SEÇÃO PRINCIPAL
// ========================

// --- Subseção ---

/**
 * Descrição da função/classe.
 * @param parametro - Descrição do parâmetro
 * @returns Descrição do retorno
 */
function exemplo(parametro: string): boolean {
  // Comentário inline explicando lógica complexa
  return true;
}

// TODO: Tarefa pendente
// FIXME: Bug conhecido
// HACK: Solução temporária (explicar porquê)
// NOTE: Observação importante
```

### 9.3 Nomenclatura

```typescript
// Classes: PascalCase
class GameController {}
class BotBrain {}

// Interfaces: PascalCase (com prefixo I opcional)
interface GameState {}
interface IRenderer {}

// Funções/Métodos: camelCase
function handlePlayerAction() {}
function calculateScore() {}

// Variáveis: camelCase
const currentPlayer = 'Alice';
let gameState = {};

// Constantes: SCREAMING_SNAKE_CASE
const MAX_PLAYERS = 4;
const DEFAULT_THEME = 'tellstones';

// Arquivos: PascalCase para classes, kebab-case para utils
// GameController.ts, BotBrain.ts
// utils.ts, helpers.ts

// Eventos: DOMAIN:ACTION (screaming case com dois-pontos)
'GAME:START'
'TURN:CHANGE'
```

### 9.4 Formatação de Código

- **Indentação**: 2 ou 4 espaços (consistente no projeto)
- **Ponto e vírgula**: Obrigatório
- **Aspas**: Template literals para strings dinâmicas
- **Linha máxima**: ~120 caracteres
- **Espaçamento**: Linha em branco entre seções lógicas

---

## 10. Sistema de Changelog Versionado

### 10.1 Localização

```
docs/CHANGELOG.md
```

### 10.2 Formato de Entrada

```markdown
## V[X.Y.Z] - [Nome da Atualização]
**Data:** DD/MM/AAAA
**Status:** [Major Release | Feature Release | Hotfix | Tech Debt]

[Descrição breve do foco da versão]

### [Categoria] Título da Mudança
- **[TAG]** **Nome:** Descrição detalhada da mudança.

### Categorias Padrão:
- 🔐 Sistema de Autenticação
- 🎨 UI/UX
- 🏗️ Arquitetura
- 🧠 Inteligência Artificial
- 🌐 Multiplayer
- 🐛 Correções
- 📱 Mobile/PWA
- 🔧 Ferramentas de Dev
```

### 10.3 Tags de Mudança

| Tag | Significado |
|-----|-------------|
| `[NEW]` | Nova funcionalidade |
| `[FIX]` | Correção de bug |
| `[REFACTOR]` | Refatoração sem mudança de comportamento |
| `[ARCH]` | Mudança arquitetural |
| `[UI]` | Mudança visual/interface |
| `[UX]` | Melhoria de experiência |
| `[PERF]` | Otimização de performance |
| `[SEC]` | Correção de segurança |
| `[DOCS]` | Documentação |
| `[TEST]` | Testes |
| `[DEV]` | Ferramentas de desenvolvimento |

### 10.4 Versionamento Semântico

```
MAJOR.MINOR.PATCH

MAJOR: Mudanças incompatíveis (breaking changes)
MINOR: Novas funcionalidades retrocompatíveis
PATCH: Correções de bugs retrocompatíveis

Exemplos:
- v5.0.0 → Reescrita da arquitetura (breaking)
- v5.4.0 → Nova feature de IA (compatible)
- v5.4.1 → Correção de bug (patch)
```

---

## 11. Contratos de Interface

Interfaces TypeScript que definem o **contrato** que cada tipo de módulo deve seguir.

### 11.1 GameMode (Modo de Jogo)

```typescript
interface GameMode {
  /** Inicia o modo de jogo com configuração opcional */
  start(config?: GameModeConfig): void;
  
  /** Para o modo e libera recursos */
  stop(): void;
  
  /** Processa ação do jogador */
  handlePlayerAction(action: PlayerAction): void;
  
  /** Retorna estado atual do jogo */
  getState(): GameState;
  
  /** Limpa recursos (listeners, timers, etc) */
  cleanup(): void;
  
  /** Verifica se uma ação é permitida no momento */
  canPerformAction(action: string): boolean;
}
```

### 11.2 BotInterface (Inteligência Artificial)

```typescript
interface BotInterface {
  /** Decide a próxima jogada baseado no estado */
  decideMove(state: GameState): Promise<BotAction>;
  
  /** Calcula tempo de "pensamento" para parecer humano */
  calculateThinkTime(state: GameState): number;
  
  /** Prediz o símbolo de uma pedra oculta */
  predictStone(slot: number, state: GameState): string;
  
  /** Decide resposta a um Boast (Se Gabar) */
  decideBoastResponse(state: GameState): 'believe' | 'doubt' | 'boast';
  
  /** Atualiza memória após observar uma ação */
  updateMemory(action: ObservedAction): void;
}
```

### 11.3 Screen (Tela)

```typescript
interface Screen {
  /** Exibe a tela */
  show(): void;
  
  /** Oculta a tela */
  hide(): void;
  
  /** Atualiza conteúdo da tela */
  update(data?: any): void;
  
  /** Destrói a tela e limpa recursos */
  destroy(): void;
}
```

### 11.4 ThemeAssets (Tema Visual)

```typescript
interface ThemeAssets {
  name: string;
  board: string;           // Caminho para imagem do tabuleiro
  background: string;      // Caminho para background
  optionsPanel?: string;   // Painel de opções customizado
  stones?: Record<string, string>;  // Sprites das pedras
}
```

---

## 12. Sistema de Temas Dinâmicos

### 12.1 Arquitetura

```
assets/themes/
├── tellstones/          # Tema padrão
│   ├── board.png
│   ├── background.jpg
│   └── stones/
├── tavern/              # Tema Taberna Medieval
│   ├── board.png
│   ├── background.jpg
│   ├── optionsPanel.png
│   └── stones/
└── manifest.json        # Registro de temas
```

### 12.2 ThemeManager

```typescript
class ThemeManager {
  private currentTheme: string = 'tellstones';
  private themes: Map<string, ThemeAssets> = new Map();

  async loadTheme(themeName: string): Promise<void> {
    const assets = this.themes.get(themeName);
    if (!assets) {
      Logger.ui(`Tema não encontrado: ${themeName}`);
      return;
    }

    // Aplica assets
    this.applyBackground(assets.background);
    this.applyBoard(assets.board);
    if (assets.optionsPanel) {
      this.applyOptionsPanel(assets.optionsPanel);
    }

    this.currentTheme = themeName;
    EventBus.emit('THEME:CHANGE', { theme: themeName });
    Logger.ui(`Tema aplicado: ${themeName}`);
  }

  private applyBackground(path: string): void {
    document.body.style.backgroundImage = `url(${path})`;
  }

  // ... outros métodos de aplicação
}
```

### 12.3 Preloading de Assets

```typescript
async preloadTheme(themeName: string): Promise<void> {
  const assets = this.themes.get(themeName);
  if (!assets) return;

  const preloadPromises = [
    this.preloadImage(assets.background),
    this.preloadImage(assets.board)
  ];

  await Promise.all(preloadPromises);
  Logger.ui(`Tema ${themeName} pré-carregado`);
}

private preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}
```

---

## 13. Progressive Web App (PWA)

### 13.1 Manifest

```json
{
  "name": "Tellstones: King's Gambit",
  "short_name": "Tellstones",
  "description": "Jogo de memória e blefe",
  "start_url": "/",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#1a1a2e",
  "theme_color": "#d4a356",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 13.2 Service Worker (Cache Strategy)

```javascript
// service-worker.js
const CACHE_NAME = 'tellstones-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/main.css',
  '/dist/main.js',
  '/assets/themes/tellstones/board.png'
];

// Stale-While-Revalidate
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request).then(response => {
        // Atualiza cache em background
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      });

      // Retorna cache imediatamente, atualiza em background
      return cachedResponse || networkFetch;
    })
  );
});
```

### 13.3 Mobile Considerations

```css
/* Previne scroll indesejado */
body {
  position: fixed;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

/* Touch targets mínimos (44px recomendado) */
.btn-action {
  min-width: 44px;
  min-height: 44px;
}

/* Feedback visual touch */
.interactive {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

---

## 14. Estratégias de Otimização

### 14.1 Performance JavaScript

```typescript
// ✅ Debounce para eventos frequentes
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Uso
window.addEventListener('resize', debounce(handleResize, 100));

// ✅ Lazy loading de módulos
const TavernCanvas = await import('./tavern/TavernCanvas');

// ✅ Object pooling para elementos reutilizáveis
class StonePool {
  private available: Stone[] = [];
  
  acquire(): Stone {
    return this.available.pop() || new Stone();
  }
  
  release(stone: Stone): void {
    stone.reset();
    this.available.push(stone);
  }
}
```

### 14.2 Performance CSS

```css
/* ✅ Propriedades que triggeram apenas Composite */
.animated {
  transform: translateX(100px);  /* Compose only */
  opacity: 0.5;                   /* Compose only */
}

/* ❌ Evitar: Triggeram Layout + Paint */
.avoid {
  width: 100px;   /* Layout */
  top: 50px;      /* Layout */
  box-shadow: ...;  /* Paint */
}

/* ✅ will-change para elementos animados */
.draggable {
  will-change: transform;
}

/* ✅ contain para isolamento de repaint */
.game-board {
  contain: layout paint;
}
```

### 14.3 Carregamento de Assets

```typescript
// Preload crítico no <head>
<link rel="preload" href="/assets/board.png" as="image">
<link rel="preload" href="/dist/main.js" as="script">

// Lazy load para assets não críticos
const backgroundMusic = new Audio();
backgroundMusic.src = '/assets/audio/ambience.mp3';
backgroundMusic.load(); // Não bloqueia
```

---

## 15. Checklist de Validação pré-Commit

Execute antes de qualquer commit para garantir qualidade:

### 15.1 Funcionalidade

- [ ] Tutorial ainda funciona?
- [ ] PvE (vs Bot) ainda funciona?
- [ ] Multiplayer Online ainda funciona?
- [ ] Navegação entre telas funciona?
- [ ] Login/Logout funcionam?

### 15.2 Qualidade de Código

- [ ] Nenhum erro no console do navegador?
- [ ] TypeScript compila sem erros (`tsc --noEmit`)?
- [ ] Testes passam (`npm test`)?
- [ ] EventBus usado (não chamadas diretas entre módulos)?
- [ ] Contratos de interface respeitados?
- [ ] Logger usado (não `console.log`)?

### 15.3 Performance

- [ ] Nenhum memory leak óbvio?
- [ ] Animações fluidas (60fps)?
- [ ] Carregamento inicial < 3s?

### 15.4 Documentação

- [ ] CHANGELOG.md atualizado?
- [ ] Comentários em código complexo?
- [ ] Novos eventos documentados?

### 15.5 Comando de Validação Rápida

```bash
# Script de validação
npm run lint && \
npm test && \
tsc --noEmit && \
echo "✅ Validação OK!"
```

---

## 16. Template para Novos Projetos

### 16.1 Estrutura Inicial Recomendada

```
novo-projeto/
├── src/
│   ├── core/
│   │   ├── EventBus.ts      # Copiar do Tellstones
│   │   └── constants.ts     # Z-Index, configs
│   ├── screens/
│   │   └── ScreenManager.ts
│   ├── ui/
│   │   └── Renderer.ts
│   ├── data/
│   │   └── LocaleManager.ts # Copiar se usar i18n
│   ├── i18n/
│   │   └── pt-BR.json
│   ├── utils/
│   │   └── Logger.ts        # Copiar do Tellstones
│   └── main.ts
├── assets/
├── docs/
│   └── CHANGELOG.md
├── tests/
├── .cursorrules             # Regras do projeto
├── tsconfig.json
├── package.json
└── README.md
```

### 16.2 Arquivos para Copiar do Tellstones

1. **`src/core/EventBus.ts`** - Sistema de eventos
2. **`src/utils/Logger.ts`** - Logging centralizado
3. **`src/data/LocaleManager.ts`** - Sistema i18n
4. **`src/core/constants.ts`** - Constantes de z-index
5. **`tsconfig.json`** - Configuração TypeScript
6. **`.cursorrules`** - Adaptar regras para novo projeto

### 16.3 Checklist de Setup

- [ ] Criar estrutura de pastas
- [ ] Configurar `tsconfig.json` com `strict: true`
- [ ] Copiar e adaptar EventBus
- [ ] Copiar e adaptar Logger
- [ ] Definir política de z-index
- [ ] Criar arquivo de regras (`.cursorrules`)
- [ ] Configurar Vite (ou bundler escolhido)
- [ ] Inicializar `CHANGELOG.md`
- [ ] Definir eventos padrão do sistema
- [ ] Criar contratos de interface base

### 16.4 Princípios Inegociáveis

> **Estes princípios devem ser seguidos desde o DIA 1 do projeto:**

1. ✅ **TypeScript Strict** - Nunca desabilitar `strict`
2. ✅ **Isolamento de Módulos** - EventBus para comunicação
3. ✅ **Logger, não console.log** - Centralização obrigatória
4. ✅ **Política de Z-Index** - Faixas definidas desde o início
5. ✅ **Contratos de Interface** - Definir antes de implementar
6. ✅ **Changelog desde v0.0.1** - Documentar todas as mudanças
7. ✅ **Comentários em PT-BR** - Consistência de idioma
8. ✅ **Testes desde o início** - Não deixar para depois

---

## 🏁 Conclusão

Este documento representa **meses de aprendizado** através de refatorações, bugs e melhorias no projeto Tellstones. Seguir estes padrões desde o início de um novo projeto irá:

- **Evitar retrabalho** - Arquitetura correta desde o começo
- **Facilitar escalabilidade** - Módulos isolados crescem independentemente
- **Melhorar manutenibilidade** - Código previsível e documentado
- **Acelerar debugging** - Logs organizados e tipagem forte
- **Permitir colaboração** - Padrões claros para toda a equipe

> *"Uma arquitetura bem planejada no início economiza semanas de refatoração no futuro."*

---

**Versão do Documento:** 1.0.0  
**Última Atualização:** 07/02/2026  
**Projeto Base:** Tellstones v6.1.1  
**Autor:** Alice DeSa  

---

*Este documento faz parte do projeto Tellstones e pode ser utilizado como referência para novos desenvolvimentos.*
