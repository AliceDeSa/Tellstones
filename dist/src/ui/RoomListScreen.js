import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
export class RoomListScreen {
    constructor() {
        this.container = null;
        this.listContainer = null;
        this.refreshBtn = null;
        this.tabBtn = null;
        this.init();
    }
    init() {
        this.container = document.getElementById('room-list-view');
        this.listContainer = document.getElementById('room-list-container');
        this.refreshBtn = document.getElementById('refresh-rooms-btn');
        this.tabBtn = document.getElementById('list-rooms-btn');
        this.registerEventListeners();
        this.registerDOMEvents();
    }
    registerEventListeners() {
        EventBus.on(EventType.ROOM_LIST_UPDATE, (data) => {
            this.renderList(data.rooms);
        });
    }
    registerDOMEvents() {
        // Tab Switching Logic (Should ideally be unified in main.ts, but handling here for modularity)
        if (this.tabBtn) {
            this.tabBtn.addEventListener('click', () => {
                this.show();
            });
        }
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => {
                // Trigger refresh logic (RoomListManager automatically listens, but we could force re-fetch if needed)
                // For now, Firebase `on` listener handles updates automatically, but we can simulate feedback
                if (this.refreshBtn)
                    this.refreshBtn.innerText = "Atualizando...";
                setTimeout(() => { if (this.refreshBtn)
                    this.refreshBtn.innerText = "Atualizar"; }, 1000);
            });
        }
        // Logic to hide other tabs when Create/Join are clicked
        const createBtn = document.getElementById('create-room-btn');
        const joinBtn = document.getElementById('join-room-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.hide());
        }
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.hide());
        }
    }
    show() {
        if (this.container)
            this.container.style.display = 'flex';
        // Hide others
        const createDiv = document.getElementById('room-options');
        const joinDiv = document.getElementById('join-room');
        if (createDiv)
            createDiv.style.display = 'none';
        if (joinDiv)
            joinDiv.style.display = 'none';
        // Update active tab style if needed
    }
    hide() {
        if (this.container)
            this.container.style.display = 'none';
    }
    renderList(rooms) {
        if (!this.listContainer)
            return;
        if (rooms.length === 0) {
            this.listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: #888;">Nenhuma sala encontrada</div>';
            return;
        }
        this.listContainer.innerHTML = '';
        rooms.forEach(room => {
            const el = document.createElement('div');
            el.className = 'room-item';
            el.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #333; font-size: 0.9em;';
            el.innerHTML = `
                <span style="flex: 2; color: #fff;">${room.creator || 'Desconhecido'}</span>
                <span style="flex: 1; color: #aaa;">${room.mode}</span>
                <span style="flex: 1; color: #aaa;">${room.players}/${room.maxPlayers}</span>
                <span style="flex: 1;"><button class="join-btn" style="padding: 2px 8px; font-size: 0.8em; cursor: pointer;">Entrar</button></span>
            `;
            const btn = el.querySelector('.join-btn');
            if (btn) {
                btn.addEventListener('click', () => this.joinRoom(room));
            }
            this.listContainer.appendChild(el);
        });
    }
    joinRoom(room) {
        // Fill the join form and submit
        const tabs = document.getElementById('online-tabs-container');
        if (tabs) {
            const joinBtn = document.getElementById('join-room-btn');
            if (joinBtn)
                joinBtn.click(); // Switch tab
        }
        const roomInput = document.getElementById('room-code');
        if (roomInput)
            roomInput.value = room.code;
        // Auto-focus name input
        const nameInput = document.getElementById('nome-entrar');
        if (nameInput)
            nameInput.focus();
    }
}
