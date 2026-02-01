"use strict";
class AudioManager {
    constructor() {
        this.isMuted = false;
        this.bgMusic = null;
        this.pendingMusicVolume = null;
        this.pendingSfxVolume = null;
        this.sounds = {
            click: null,
            press: null,
            challenge: null,
            success: null,
            failure: null
        };
        // Defer initialization to ensure DOM elements exist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        }
        else {
            this.init();
        }
    }
    init() {
        this.bgMusic = document.getElementById("som-fundo");
        // Map of sound effects
        this.sounds = {
            click: document.getElementById("som-click"),
            press: document.getElementById("som-press"),
            challenge: document.getElementById("som-desafio"),
            success: document.getElementById("som-sucesso"),
            failure: document.getElementById("som-falha")
        };
        // Initialize volumes (apply pending if any)
        if (this.pendingMusicVolume !== null && this.bgMusic) {
            this.bgMusic.volume = this.pendingMusicVolume;
        }
        if (this.sounds.challenge)
            this.sounds.challenge.volume = 0.4;
        if (this.sounds.success)
            this.sounds.success.volume = 0.5;
        if (this.sounds.failure)
            this.sounds.failure.volume = 0.5;
        // Apply pending SFX volume globally if set
        if (this.pendingSfxVolume !== null) {
            this.setSfxVolume(this.pendingSfxVolume);
        }
        console.log("[AudioManager] Initialized with detected elements:", {
            bgMusic: !!this.bgMusic,
            click: !!this.sounds.click
        });
    }
    play(key) {
        const audio = this.sounds[key];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.warn(`Error playing sound '${key}':`, e));
        }
    }
    playClick() { this.play('click'); }
    playPress() { this.play('press'); }
    // Game Action Sounds
    playPlace() { this.play('press'); }
    playFlip() { this.play('click'); }
    playMove() { this.play('click'); }
    setMusicVolume(value) {
        const clamped = Math.max(0, Math.min(1, value));
        if (this.bgMusic) {
            this.bgMusic.volume = clamped;
        }
        else {
            this.pendingMusicVolume = clamped;
        }
    }
    setSfxVolume(value) {
        const clamped = Math.max(0, Math.min(1, value));
        // If sounds not loaded yet, store pending
        if (!this.sounds.click) {
            this.pendingSfxVolume = clamped;
            return;
        }
        Object.values(this.sounds).forEach(audio => {
            if (audio)
                audio.volume = clamped;
        });
    }
    playChallenge() { this.play('challenge'); }
    playSuccess() { this.play('success'); }
    playFailure() { this.play('failure'); }
    playAmbience() {
        if (this.isMuted || !this.bgMusic)
            return;
        this.bgMusic.volume = 0.5;
        this.bgMusic.play().catch(() => { });
    }
    stopAmbience() {
        if (this.bgMusic)
            this.bgMusic.pause();
    }
    toggleMute() {
        this.isMuted = !this.isMuted;
        window.isMuted = this.isMuted; // Sync with global legacy flag if needed
        if (this.isMuted) {
            this.stopAmbience();
        }
        else {
            // Check context? Try to resume if we are in a screen that allows it
        }
        return this.isMuted;
    }
}
// Global Assignment
window.audioManager = new AudioManager();
