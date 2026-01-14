// =========================
// Utilidades Gerais do Tellstones
// =========================

// Gera um código aleatório para a sala (6 caracteres, letras e números)
function gerarCodigoSala() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Exibe um toast simples na tela (mensagem temporária)
function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerHTML = msg;
    toast.style.display = "block";
    toast.style.opacity = "1";
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.style.display = "none";
        }, 400);
    }, 4000);
}

// Exibe um toast interno (mensagem temporária dentro do jogo)
function showToastInterno(msg) {
    const toast = document.getElementById("toast-interno");
    if (!toast) return;
    toast.innerHTML = msg;
    toast.classList.add("mostrar");
    setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 2200);
}

// Função auxiliar para tocar som de click
function tocarSomClick() {
    const audio = document.getElementById("som-click");
    if (audio) {
        audio.currentTime = 0; // Reinicia o som se já estiver tocando
        audio.play().catch(e => console.warn("Erro ao tocar som de click:", e));
    }
}

// Função auxiliar para tocar som de press (botões da UI)
function tocarSomPress() {
    const audio = document.getElementById("som-press");
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Erro ao tocar som de press:", e));
    }
}

// Função auxiliar para tocar som de desafio/se gabar (específico)
function tocarSomDesafio() {
    const audio = document.getElementById("som-desafio");
    if (audio) {
        audio.volume = 0.4; // Volume reduzido conforme solicitado
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Erro ao tocar som de desafio:", e));
    }
}

// Sucesso (Challenge Won)
function tocarSomSucesso() {
    const audio = document.getElementById("som-sucesso");
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Erro ao tocar som de sucesso:", e));
    }
}

// Falha (Challenge Lost)
function tocarSomFalha() {
    const audio = document.getElementById("som-falha");
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Erro ao tocar som de falha:", e));
    }
}

// Garante que o valor seja um array (Firebase pode converter para objeto)
function garantirArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;

    // Tratamento robusto para objetos esparsos (Firebase)
    // Se chaves são inteiros, reconstrói array respeitando índices
    const keys = Object.keys(val).map(Number).filter(k => !isNaN(k) && Number.isInteger(k));
    if (keys.length > 0) {
        const maxKey = Math.max(...keys);
        // Heurística: Se maxKey é razoável (ex: < 50), trata como array
        if (maxKey < 50) {
            const arr = new Array(maxKey + 1).fill(null);
            Object.entries(val).forEach(([k, v]) => {
                arr[parseInt(k)] = v;
            });
            return arr;
        }
    }

    return Object.values(val);
}
