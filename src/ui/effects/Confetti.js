class Confetti {
    constructor() {
        this.container = null;
        this.isRunning = false;
        this.colors = ['#FFC700', '#FF0000', '#2E3192', '#41BBC7', '#8a2be2', '#00ff00'];
        this.interval = null;

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            .confetti-particle {
                position: absolute;
                top: -20px;
                pointer-events: none; /* Ensure clicks pass through */
            }
        `;
        document.head.appendChild(style);
    }

    createContainer() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'confetti-container';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100vw';
        this.container.style.height = '100vh';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '2147483647'; // Max Z-Index

        document.body.appendChild(this.container);
        // console.log('[Confetti] Container created and appended to body.');
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.createContainer();

        this.interval = setInterval(() => {
            if (this.isRunning) this.spawn();
        }, 50);

        setTimeout(() => {
            this.stop();
        }, 5000); // Stop automatically after 5 seconds
    }

    stop() {
        console.log('[Confetti] Stopping...');
        this.isRunning = false;
        clearInterval(this.interval);
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    spawn() {
        if (!this.container) return;

        const particleCount = 5;

        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.classList.add('confetti-particle');

            // Random properties
            const x = Math.random() * 100 + 'vw';
            const color = this.colors[Math.floor(Math.random() * this.colors.length)];
            const size = Math.random() * 10 + 5 + 'px';

            p.style.backgroundColor = color;
            p.style.left = x;
            p.style.width = size;
            p.style.height = size;

            this.container.appendChild(p);

            // Animate
            const fallDuration = Math.random() * 2000 + 1000;
            const rotation = Math.random() * 360; // deg

            if (p.animate) {
                p.animate([
                    { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: 1 },
                    { transform: `translate3d(${Math.random() * 100 - 50}px, 100vh, 0) rotate(${rotation}deg)`, opacity: 0 }
                ], {
                    duration: fallDuration,
                    easing: 'linear',
                    fill: 'forwards'
                }).onfinish = () => {
                    p.remove();
                };
            } else {
                // Fallback for no Web Animations API
                p.style.top = '100vh';
                p.style.transition = `top ${fallDuration}ms linear`;
                setTimeout(() => p.remove(), fallDuration);
            }
        }
    }
}

// Global instance
window.ConfettiManager = new Confetti();
