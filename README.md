https://alicedesa.github.io/Tellstones/

# TellStones Online (v5.1.0 - The Quality Update)

Um jogo digital fielmente inspirado no **Tellstones: King's Gambit**, desenvolvido como projeto de estudo avançado. Esta versão (**The Quality Update**) foca na robustez técnica, organização e garantia de qualidade.

> **"Memorize. Blefe. Desafie."**

## 🚀 Novidades da Versão 5.1.0

- **Qualidade de Código**:
  - Testes Automatizados (Jest) cobrindo regras e IA.
  - CI/CD com Husky para blindar o repositório.
- **Organização**:
  - Refatoração da estrutura de pastas (Clean Architecture).
  - Centralização de Logs (`Logger.js`).
- **Correções**:
  - Crash do Tutorial no momento da vitória resolvido.
  - Visualização de logs de Analytics aprimorada.

## 🚀 Funcionalidades Anteriores (v3.0 - v4.5)

- **Modo PvE (Bot)**: I.A. com memória, perfis de personalidade (Lógico, Trapaceiro, Agressivo) e Meta-Reasoning.
- **Modos Isolados**: PvE, Multiplayer e Tutorial.
- **Sincronização Atômica**: Multiplayer robusto.
- **Mobile First**: Design responsivo com suporte a landscape.

## 📂 Estrutura do Projeto (V5)

```
src/
├── core/   # GameRules, GameController, RoomManager, AnalyticsManager
├── modes/  # Lógica específica (PvE, Multiplayer, Tutorial)
├── ui/     # Renderer, ChangelogManager, NotificationManager
├── ai/     # BotBrain (IA Lógica e Emocional)
└── utils/  # AudioManager, Helpers
tests/      # Testes Unitários (Jest)
```

## 🛠️ Tecnologias e Ferramentas

- **Frontend**: Vanilla JS (ES6+ Modules), CSS3 (Variables, Animations).
- **Backend (Serverless)**: Firebase Realtime Database.
- **Testing**: Jest, Husky (Git Hooks).
- **Analytics**: Google Analytics 4.

## 🎮 Como Jogar

1. **Acesse**: [Tellstones Online](https://alicedesa.github.io/Tellstones/)
2. **Escolha**:
   - **Tutorial**: Aprenda as mecânicas.
   - **PvE**: Treine contra a máquina.
   - **Online**: Crie uma sala e jogue com um amigo.
3. **Vença**: O primeiro a marcar **3 pontos** ganha.

## © Créditos

- **Dev**: [AliceDeSa](https://github.com/AliceDeSa)
- **Design**: Inspiration from Riot Games. Tellstones is a trademark of Riot Games.

---
*Versão Atual: v5.1.0 (The Quality Update)*
*Última atualização: 21/01/2026*
