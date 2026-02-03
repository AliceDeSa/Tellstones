import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';

type SoundKey = 'click' | 'press' | 'challenge' | 'success' | 'failure';

class AudioManager {
    public isMuted: boolean = false;
    private bgMusic: HTMLAudioElement | null = null;
    private pendingMusicVolume: number | null = null;
    private pendingSfxVolume: number | null = null;

    private sounds: Record<SoundKey, HTMLAudioElement | null> = {
        click: null,
        press: null,
        challenge: null,
        success: null,
        failure: null
    };

    constructor() {
        // Defer initialization to ensure DOM elements exist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    private init(): void {
        this.bgMusic = document.getElementById("som-fundo") as HTMLAudioElement;

        // Map of sound effects
        this.sounds = {
            click: document.getElementById("som-click") as HTMLAudioElement,
            press: document.getElementById("som-press") as HTMLAudioElement,
            challenge: document.getElementById("som-desafio") as HTMLAudioElement,
            success: document.getElementById("som-sucesso") as HTMLAudioElement,
            failure: document.getElementById("som-falha") as HTMLAudioElement
        };

        // Initialize volumes (apply pending if any)
        if (this.pendingMusicVolume !== null && this.bgMusic) {
            this.bgMusic.volume = this.pendingMusicVolume;
        }

        if (this.sounds.challenge) this.sounds.challenge.volume = 0.4;
        if (this.sounds.success) this.sounds.success.volume = 0.5;
        if (this.sounds.failure) this.sounds.failure.volume = 0.5;

        // Apply pending SFX volume globally if set
        if (this.pendingSfxVolume !== null) {
            this.setSfxVolume(this.pendingSfxVolume);
        }

        // Register EventBus listeners
        this.registerEventListeners();

        console.log("[AudioManager] Initialized with detected elements:", {
            bgMusic: !!this.bgMusic,
            click: !!this.sounds.click
        });
    }

    /**
     * Registra listeners do EventBus para controle remoto de áudio
     */
    private registerEventListeners(): void {
        // Volume da música
        EventBus.on(EventType.AUDIO_MUSIC_VOLUME, (data) => {
            this.setMusicVolume(data.volume);
        });

        // Volume dos efeitos
        EventBus.on(EventType.AUDIO_SFX_VOLUME, (data) => {
            this.setSfxVolume(data.volume);
        });

        // Reproduzir sons
        EventBus.on(EventType.AUDIO_PLAY_CLICK, () => {
            this.playClick();
        });

        EventBus.on(EventType.AUDIO_PLAY_PRESS, () => {
            this.playPress();
        });

        // Mute global
        EventBus.on(EventType.AUDIO_MUTE_CHANGED, (data) => {
            this.isMuted = data.isMuted;
            (window as any).isMuted = data.isMuted;

            if (data.isMuted) {
                this.stopAmbience();
            }
        });

        console.log("[AudioManager] EventBus listeners registrados");
    }

    private play(key: SoundKey): void {
        const audio = this.sounds[key];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.warn(`Error playing sound '${key}':`, e));
        }
    }

    public playClick(): void { this.play('click'); }
    public playPress(): void { this.play('press'); }

    // Game Action Sounds
    public playPlace(): void { this.play('press'); }
    public playFlip(): void { this.play('click'); }
    public playMove(): void { this.play('click'); }

    public setMusicVolume(value: number): void {
        const clamped = Math.max(0, Math.min(1, value));
        if (this.bgMusic) {
            this.bgMusic.volume = clamped;
        } else {
            this.pendingMusicVolume = clamped;
        }
    }

    public setSfxVolume(value: number): void {
        const clamped = Math.max(0, Math.min(1, value));

        // If sounds not loaded yet, store pending
        if (!this.sounds.click) {
            this.pendingSfxVolume = clamped;
            return;
        }

        Object.values(this.sounds).forEach(audio => {
            if (audio) audio.volume = clamped;
        });
    }

    public playChallenge(): void { this.play('challenge'); }
    public playSuccess(): void { this.play('success'); }
    public playFailure(): void { this.play('failure'); }

    public playAmbience(): void {
        if (this.isMuted || !this.bgMusic) return;
        this.bgMusic.volume = 0.5;
        this.bgMusic.play().catch(() => { });
    }

    public stopAmbience(): void {
        if (this.bgMusic) this.bgMusic.pause();
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        (window as any).isMuted = this.isMuted; // Sync with global legacy flag if needed

        if (this.isMuted) {
            this.stopAmbience();
        } else {
            // Check context? Try to resume if we are in a screen that allows it
        }
        return this.isMuted;
    }
}

// Global Assignment
window.audioManager = new AudioManager();
