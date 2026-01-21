class AudioManager {
    constructor() {
        this.isMuted = false;
        // Defer initialization to ensure DOM elements exist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
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

        // Initialize volumes
        if (this.sounds.challenge) this.sounds.challenge.volume = 0.4;
        if (this.sounds.success) this.sounds.success.volume = 0.5;
        if (this.sounds.failure) this.sounds.failure.volume = 0.5;

        console.log("[AudioManager] Initialized with detected elements:", {
            bgMusic: !!this.bgMusic,
            click: !!this.sounds.click
        });
    }



    play(key) {
        if (this.isMuted) return;

        if (!this.sounds) return;
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

    playChallenge() { this.play('challenge'); }
    playSuccess() { this.play('success'); }
    playFailure() { this.play('failure'); }

    playAmbience() {
        if (this.isMuted || !this.bgMusic) return;
        this.bgMusic.volume = 0.5;
        this.bgMusic.play().catch(() => { });
    }

    stopAmbience() {
        if (this.bgMusic) this.bgMusic.pause();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        window.isMuted = this.isMuted; // Sync with global legacy flag if needed

        if (this.isMuted) {
            this.stopAmbience();
        } else {
            // Check context? Try to resume if we are in a screen that allows it
            // Logic handled by caller usually, but we can restart if needed
        }
        return this.isMuted;
    }
}

// Global Instance
window.audioManager = new AudioManager();
