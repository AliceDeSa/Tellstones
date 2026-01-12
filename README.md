https://alicedesa.github.io/Tellstones/

# TellStones Online (v3.0)

Esta versão (**New Horizons**) reescreveu a arquitetura do zero, trazendo estabilidade profissional, modularidade e suporte robusto para múltiplos modos de jogo.

> **"Memorize. Blefe. Desafie."**

## 🚀 Novidades da Versão 3.0

- **Arquitetura Modular**: Código completamente reestruturado de um arquivo monolítico para módulos organizados (`core`, `modes`, `ui`, `services`).
- **Modos Isolados**:
  - **PvE (Bot)**: Jogue contra uma Inteligência Artificial com memória dinâmica.
  - **Multijogador**: Sincronização em tempo real via Firebase, agora mais estável e com tratamento de desconexão.
  - **Tutorial Interativo**: Guia imersivo para novos jogadores.
- **Mobile First**: Interface polida e responsiva, com Card de Ações otimizado para celulares.
- **Log Sanitation**: Console limpo, apenas com logs essenciais para monitoramento.

## ✨ Funcionalidades Principais

- **Lógica de Jogo Completa**:
  - **Ações**: Colocar, Virar, Trocar, Espiar.
  - **Desafios**: Desafie o conhecimento do oponente sobre uma pedra escondida.
  - **Se Gabar (Boast)**: Afirme conhecer todo o tabuleiro e vença instantaneamente se provar (ou perca se falhar).
- **IA Adaptativa**: O Bot possui níveis de dificuldade e simula esquecimento natural e erros de troca.
- **Sincronização Atômica**: O multiplayer usa transações atômicas para evitar conflitos de pontuação e turnos.

## 📂 Estrutura do Projeto (Arquitetura)

A base de código foi refatorada para facilitar manutenção e expansão:

```
src/
├── core/
│   ├── GameController.js   # Orquestrador central de regras e estado
│   ├── GameRules.js        # Lógica pura de validação e criação de estado
│   ├── InputHandler.js     # Gerenciamento de Drag & Drop (Mouse/Touch)
│   └── constants.js        # Configurações globais
├── modes/
│   ├── GameMode.js         # Classe abstrata base
│   ├── MultiplayerMode.js  # Lógica de rede e sync Firebase
│   ├── PvEMode.js          # Lógica local e loop do Bot
│   └── TutorialMode.js     # Script de cenários guiados
├── services/
│   └── network.js          # Abstração de Firebase e LocalDB
├── ui/
│   └── Renderer.js         # Manipulação do DOM e Canvas visual
└── utils/
    └── utils.js            # Helpers (Toast, RNG, Sons)
```

- **Raiz**:
  - `script.js`: Ponto de entrada (Entry Point) simplificado.
  - `bot.js`: Lógica da Inteligência Artificial.
  - `index.html`: Estrutura HTML única.
  - `style.css`: Estilos globais e responsivos.

## 🎮 Como Jogar

1. **Acesse**: Abra o link ou o arquivo `index.html`.
2. **Escolha o Modo**:
   - **Tutorial**: Aprenda as regras.
   - **vs Bot**: Treine suas habilidades contra a IA.
   - **Online**: Crie uma sala e envie o código de 6 letras para um amigo.
3. **Objetivo**: O primeiro a marcar **3 pontos** vence.

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules).
- **Backend**: Firebase Realtime Database (Serverless).
- **Assets**: Gráficos e sons otimizados para web.

## 🤝 Contribuindo

Projeto de código aberto para fins educacionais. Sinta-se à vontade para abrir Issues ou Pull Requests.

1. Fork o projeto.
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`).
3. Commit suas mudanças.
4. Push para a branch.
5. Abra um PR.

## © Créditos e Licença

- **Desenvolvimento e Refatoração**: [AliceDeSa](https://github.com/AliceDeSa)
- **Propriedade Intelectual**: Tellstones: King's Gambit é marca registrada da **Riot Games**. Este projeto é uma fan-made sem fins lucrativos, criado sob a política de "Lenga Lenga Legal" da Riot Games.
- **Apoio**: [Ko-fi](https://ko-fi.com/alicedesa)

---
*Versão Atual: v3.1 (Final Polish Edition)*
*Última atualização: 12/01/2026*

