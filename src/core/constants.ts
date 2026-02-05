// =========================
// Constantes do Tellstones
// =========================

interface Stone {
    nome: string;
    url: string;
    virada?: boolean;
}

const PEDRAS_OFICIAIS: Stone[] = [
    { nome: "Coroa", url: "assets/themes/Taberna/img/stones/demacia/Coroa.svg" },
    { nome: "Espada", url: "assets/themes/Taberna/img/stones/demacia/espada.svg" },
    { nome: "Balança", url: "assets/themes/Taberna/img/stones/demacia/Balanca.svg" },
    { nome: "Cavalo", url: "assets/themes/Taberna/img/stones/demacia/cavalo.svg" },
    { nome: "Escudo", url: "assets/themes/Taberna/img/stones/demacia/escudo.svg" },
    { nome: "Bandeira", url: "assets/themes/Taberna/img/stones/demacia/bandeira.svg" },
    { nome: "Martelo", url: "assets/themes/Taberna/img/stones/demacia/martelo.svg" }
];

// Compatibilidade Global (Legacy)
(window as any).PEDRAS_OFICIAIS = PEDRAS_OFICIAIS;
