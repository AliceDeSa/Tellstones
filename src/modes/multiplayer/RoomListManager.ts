
import { EventBus } from '../../core/EventBus.js';
import { EventType } from '../../core/types/Events.js';
import { Logger, LogCategory } from '../../utils/Logger.js';

export interface RoomInfo {
    id: string;
    code: string;
    mode: string;
    players: number;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;
    creator: string;
}

export class RoomListManager {
    private publicRoomsRef: any;
    private rooms: RoomInfo[] = [];
    private initialized: boolean = false;
    private listenerReady: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.init();
    }

    private async init() {
        // Start initialization but don't block
        this.initPromise = this.ensureInitialized();
    }

    /**
     * Ensures Firebase is initialized with retry logic
     */
    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return;

        const maxAttempts = 5;
        const delays = [100, 500, 1000, 2000, 3000];

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if ((window as any).getDBRef) {
                this.publicRoomsRef = (window as any).getDBRef('publicRooms');
                this.startListening();
                this.initialized = true;

                // Wait a bit for listener to be fully attached
                await new Promise(resolve => setTimeout(resolve, 100));
                this.listenerReady = true;

                Logger.info(LogCategory.NETWORK, `[RoomListManager] ✅ FULLY INITIALIZED after ${attempt + 1} attempt(s), listener READY`);
                return;
            }

            if (attempt < maxAttempts - 1) {
                Logger.warn(LogCategory.NETWORK, `[RoomListManager] Firebase not ready, attempt ${attempt + 1}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
            }
        }

        Logger.error(LogCategory.NETWORK, '[RoomListManager] Failed to initialize: Firebase unavailable');
    }

    private startListening() {
        Logger.info(LogCategory.NETWORK, '[RoomListManager] Starting Firebase listener...');

        // Query only waiting rooms
        const query = this.publicRoomsRef.orderByChild('status').equalTo('waiting').limitToLast(20);
        Logger.info(LogCategory.NETWORK, '[RoomListManager] Query created with filter: status=waiting');

        query.on('value', (snapshot: any) => {
            Logger.info(LogCategory.NETWORK, `[RoomListManager] Firebase listener triggered. Snapshot exists: ${snapshot.exists()}`);
            if (snapshot.exists()) {
                Logger.info(LogCategory.NETWORK, `[RoomListManager] Raw snapshot data:`, snapshot.val());
            }
            if (!snapshot.exists()) {
                this.rooms = [];
                this.emitUpdate();
                return;
            }

            this.rooms = [];
            const now = Date.now();
            const staleRooms: string[] = [];

            snapshot.forEach((child: any) => {
                const room = child.val();
                room.id = child.key;

                // Check if room still exists in /salas
                const roomAge = now - room.createdAt;

                // Remove stale rooms (>1 hour old)
                if (roomAge > 3600000) {
                    staleRooms.push(child.key);
                    Logger.warn(LogCategory.NETWORK, `[RoomListManager] Removing stale room: ${child.key} (${Math.floor(roomAge / 60000)}min old)`);
                } else {
                    // Just add to list - periodic cleanup will handle truly stale rooms
                    this.rooms.push(room);
                }
            });

            // Clean up stale rooms
            staleRooms.forEach(roomId => this.removeRoom(roomId));

            // Sort by newest
            this.rooms.reverse();
            this.emitUpdate();
            Logger.net(`[RoomListManager] Fetched ${this.rooms.length} public rooms`);
        });
    }

    // DISABLED: Causes race condition - removes rooms before they're fully created
    // The periodic cleanupOldRooms() handles stale rooms instead
    // private verifyRoomExists(roomId: string, roomInfo: RoomInfo) {
    //     const salaRef = (window as any).getDBRef(`salas/${roomId}`);
    //     salaRef.once('value', (snapshot: any) => {
    //         if (!snapshot.exists()) {
    //             Logger.warn(LogCategory.NETWORK, `[RoomListManager] Room ${roomId} doesn't exist, removing from public list`);
    //             this.removeRoom(roomId);
    //         }
    //     });
    // }

    private emitUpdate() {
        EventBus.emit(EventType.ROOM_LIST_UPDATE, { rooms: this.rooms });
    }

    public createPublicRoomEntry(roomId: string, config: { mode: string, creator: string, maxPlayers?: number }) {
        Logger.info(LogCategory.NETWORK, `[RoomListManager] 📌 createPublicRoomEntry called for: ${roomId}`);

        // Wait for initialization before creating entry
        this.initPromise?.then(() => {
            if (!this.listenerReady) {
                Logger.error(LogCategory.NETWORK, `[RoomListManager] ⚠️ LISTENER NOT READY! Entry may not appear.`);
            }

            Logger.info(LogCategory.NETWORK, `[RoomListManager] ✅ Init complete, creating entry for: ${roomId}, listener ready: ${this.listenerReady}`);

            if (!this.publicRoomsRef) {
                Logger.error(LogCategory.NETWORK, '[RoomListManager] Cannot create public room: not initialized');
                return;
            }

            const entry: RoomInfo = {
                id: roomId,
                code: roomId,
                mode: config.mode,
                players: 1,
                maxPlayers: config.maxPlayers || (config.mode === '2x2' ? 4 : 2),
                status: 'waiting',
                createdAt: Date.now(),
                creator: config.creator
            };

            Logger.info(LogCategory.NETWORK, `[RoomListManager] 📝 Writing entry to Firebase:`, entry);

            this.publicRoomsRef.child(roomId).set(entry)
                .then(() => Logger.info(LogCategory.NETWORK, `[RoomListManager] ✅ Sala pública registrada: ${roomId}`))
                .catch((e: any) => Logger.error(LogCategory.NETWORK, `[RoomListManager] ❌ Erro ao registrar sala pública:`, e));
        });
    }

    public updateRoomStatus(roomId: string, status: string, playerCount?: number) {
        this.initPromise?.then(() => {
            if (!this.publicRoomsRef) return;

            const updates: any = { status };
            if (playerCount !== undefined) updates.players = playerCount;

            this.publicRoomsRef.child(roomId).update(updates);
        });
    }

    public removeRoom(roomId: string) {
        this.initPromise?.then(() => {
            if (!this.publicRoomsRef) return;

            this.publicRoomsRef.child(roomId).remove()
                .then(() => Logger.info(LogCategory.NETWORK, `[RoomListManager] Sala pública removida: ${roomId}`))
                .catch((e: any) => Logger.error(LogCategory.NETWORK, `[RoomListManager] Erro ao remover sala:`, e));
        });
    }

    public getRooms(): RoomInfo[] {
        return this.rooms;
    }

    public cleanupOldRooms() {
        if (!this.publicRoomsRef) return;

        const now = Date.now();
        this.publicRoomsRef.once('value', (snapshot: any) => {
            if (!snapshot.exists()) return;

            snapshot.forEach((child: any) => {
                const room = child.val();
                const roomAge = now - room.createdAt;

                // Remove rooms older than 1 hour OR with status 'finished'
                if (roomAge > 3600000 || room.status === 'finished') {
                    Logger.info(LogCategory.NETWORK, `[RoomListManager] Cleaning up room: ${child.key}`);
                    this.publicRoomsRef.child(child.key).remove();
                }
            });
        });
    }
}

// Global Assignment for usage in RoomManager
const roomListManagerInstance = new RoomListManager();
(window as any).RoomListManager = roomListManagerInstance;

// Cleanup old rooms every 5 minutes
setInterval(() => {
    roomListManagerInstance.cleanupOldRooms();
}, 300000);
