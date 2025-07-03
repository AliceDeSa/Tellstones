# TellStones Online

Um jogo digital inspirado no Tellstones: King's Gambit, totalmente em português, com suporte a partidas online, lobby, espectadores e interface intuitiva!

## 🎮 Sobre o Jogo
TellStones é um jogo de blefe, memória e desafio para 2 ou 4 jogadores (duplas). O objetivo é marcar pontos acertando a posição das pedras ou desafiando o adversário.

- **Memorize. Blefe. Desafie.**
- Jogue online com amigos, crie salas ou entre como espectador.
- Interface moderna, responsiva e fácil de usar.

## 📜 Regras Básicas
- Cada jogador, na sua vez, pode colocar, mover, virar, espiar ou desafiar.
- O objetivo é marcar 3 pontos ou vencer em um desafio de "Se Gabar".
- Para mais detalhes, acesse o card de ações dentro do jogo.

## 🚀 Como Rodar Localmente
### 1. Modo Web (mais simples)
1. Baixe/clique duas vezes no arquivo `index.html`.
2. O jogo abrirá no seu navegador (requer conexão com a internet para salvar partidas online).

### 2. Modo Executável (Electron)
1. Instale o [Node.js](https://nodejs.org/).
2. No terminal, execute:
   ```bash
   npm install electron --save-dev
   ```
3. Crie um arquivo `main.js` com o seguinte conteúdo:
   ```js
   const { app, BrowserWindow } = require('electron');
   function createWindow() {
     const win = new BrowserWindow({ width: 1024, height: 700 });
     win.loadFile('index.html');
   }
   app.whenReady().then(createWindow);
   ```
4. Adicione ao seu `package.json`:
   ```json
   "main": "main.js",
   "scripts": { "start": "electron ." }
   ```
5. Rode:
   ```bash
   npm start
   ```
6. (Opcional) Use `electron-packager` ou `electron-builder` para gerar um `.exe`.

## 🛠️ Tecnologias Utilizadas
- HTML5, CSS3, JavaScript
- Firebase Realtime Database
- Electron (opcional para desktop)

## 👩‍💻 Contribuindo
1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature-nome`)
3. Commit suas alterações (`git commit -m 'feat: minha melhoria'`)
4. Push na branch (`git push origin feature-nome`)
5. Abra um Pull Request

## 🙏 Créditos
- Desenvolvido por AliceDeSa
- Imagens e sons: direitos de Tellstones: King's Gambit (Riot Games)
- Widget de apoio: Ko-fi

---

**Divirta-se, desafie seus amigos e mostre sua memória!** 