# TellStones Online

Um jogo digital fielmente inspirado no **Tellstones: King's Gambit**, desenvolvido como projeto de estudo. O jogo é totalmente em português e suporta partidas online em tempo real, modo espectador e um tutorial interativo completo.

## � Funcionalidades Principais

- **Multiplayer Online Real-Time**: Crie salas, entre em lobbies e jogue contra amigos em qualquer lugar (suportado por Firebase).
- **Modo Espectador**: Assista a partidas em andamento sem interferir.
- **Tutorial Interativo**: Um guia passo-a-passo scriptado que ensina todas as mecânicas do jogo, desde o básico até o blefe avançado ("Se Gabar").
- **Mecânicas Completas**:
  - **Colocar / Virar / Trocar / Espiar**: Ações básicas fiéis ao jogo original.
  - **Desafiar**: Teste a memória do seu oponente.
  - **Se Gabar (Boast)**: A mecânica de alto risco/recompensa onde você afirma saber todo o tabuleiro. Se o oponente duvidar, você deve provar!
- **Interface Responsiva**: Design moderno adaptado para Desktop e Mobile.
- **Assets Locais**: Todo o conteúdo visual e sonoro é carregado localmente para melhor performance.

## 🎮 Como Jogar

1. **Acesse o Jogo**: Abra o `index.html` em seu navegador.
2. **Escolha o Modo**:
   - **Tutorial**: Recomendado para novos jogadores. Aprenda as regras na prática.
   - **Jogo PvE (Bot)**: *Em desenvolvimento.*
   - **Jogo Online**:
     - **Criar Sala**: Gere um código único.
     - **Entrar em Sala**: Use o código para desafiar um amigo.
3. **Objetivo**: O primeiro a marcar **3 pontos** vence. Pontos são ganhos ao vencer desafios ou quando o oponente falha em provar um blefe.

## 🛠️ Tecnologias

- **Frontend**: HTML5 Puro, CSS3 (Sem frameworks), JavaScript (Vanilla ES6+).
- **Backend / Realtime**: Google Firebase Realtime Database.
- **Infraestrutura**: Client-side logic com sincronização de estados via WebSocket (Firebase).

## 📂 Estrutura do Projeto

- `index.html`: Ponto de entrada e estrutura UI.
- `style.css`: Estilização global, animações e responsividade.
- `script.js`: Lógica principal do jogo online, gerenciamento de estado e regras.
- `tutorial.js`: Lógica isolada para o modo tutorial scriptado.
- `bot.js`: Lógica básica para interações automatizadas (usado no tutorial).
- `assets/`: Imagens (tokens, tabuleiro) e sons armazenados localmente.

## 🤝 Contribuindo

Contribuições são bem-vindas! Se você quiser melhorar a IA do Bot, adicionar novas animações ou corrigir bugs:

1. Faça um Fork deste repositório.
2. Crie uma Branch (`git checkout -b feature/nova-melhoria`).
3. Commit suas alterações (`git commit -m 'feat: Adiciona animação de vitória'`).
4. Push para a Branch (`git push origin feature/nova-melhoria`).
5. Abra um Pull Request.

## � Créditos e Licença

- **Desenvolvimento e Código**: [AliceDeSa](https://github.com/AliceDeSa)
- **Game Design Original e Arte**: Tellstones: King's Gambit é uma propriedade intelectual da © **Riot Games**. Este é um projeto de fã sem fins lucrativos.
- **Apoio**: [Ko-fi](https://ko-fi.com/alicedesa)

---

**"Memorize. Blefe. Desafie."**
