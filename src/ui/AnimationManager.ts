interface Point {
    left: number;
    top: number;
}

class AnimationManager {
    static playSwap(idxA: number, idxB: number, callback?: () => void): void {
        const GameConfig = (window as any).GameConfig || { 
            LAYOUT: { STONE_SIZE: 68.39 },
            Z_INDEX: { ANIMATION_OVERLAY: 2000, CLONE: 2001 },
            ANIMATION: { SWAP_DURATION: 600, ARC_HEIGHT: 100, SAFETY_TIMEOUT: 2000 }
        };
        const CFG = GameConfig;

        // VALIDATION: Check elements
        const elA = document.querySelector(`.pedra-mesa[data-idx='${idxA}']`) as HTMLElement;
        const elB = document.querySelector(`.pedra-mesa[data-idx='${idxB}']`) as HTMLElement;

        // Heuristic: If empty/invisible, skip animation
        const isEmpty = (el: HTMLElement | null): boolean => !el || el.style.pointerEvents === "none";

        // CRITICAL FIX: If either element is missing from DOM, cannot animate.
        if (!elA || !elB) {
            console.warn(`[AnimationManager] Missing elements for swap: ${idxA} <-> ${idxB}`);
            if (callback) callback();
            return;
        }

        const emptyA = isEmpty(elA);
        const emptyB = isEmpty(elB);

        if (emptyA && emptyB) {
            if (callback) callback();
            return;
        }

        // Lock Global Flag
        (window as any).animacaoTrocaEmAndamento = true;

        // Safety Timeout
        const safetyTimeout = window.setTimeout(() => {
            if ((window as any).animacaoTrocaEmAndamento) {
                console.warn("Animation Safety Timeout Triggered");
                (window as any).animacaoTrocaEmAndamento = false;
                const ov = document.getElementById("troca-circular-overlay");
                if (ov) ov.remove();
                if (window.Renderer) window.Renderer.renderizarMesa();
                if (callback) callback();
            }
        }, CFG.ANIMATION.SAFETY_TIMEOUT);

        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper) return; // Safety check
        const wrapperRect = wrapper.getBoundingClientRect();

        // Overlay to block interaction
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed", left: "0", top: "0", width: "100vw", height: "100vh",
            zIndex: CFG.Z_INDEX.ANIMATION_OVERLAY, background: "rgba(0,0,0,0)"
        });
        overlay.id = "troca-circular-overlay";
        document.body.appendChild(overlay);

        // Get centers accounting for transforms
        function getCenter(element: HTMLElement): Point {
            const rect = element.getBoundingClientRect();
            return {
                left: rect.left + rect.width / 2,
                top: rect.top + rect.height / 2
            };
        }

        const slotA = getCenter(elA);
        const slotB = getCenter(elB);

        // Clones
        const cloneA = elA.cloneNode(true) as HTMLElement;
        const cloneB = elB.cloneNode(true) as HTMLElement;

        // ROBUST MOBILE FIX:
        // Instead of calculating scale factor, simply force the clone to match the 
        // EXACT rendered dimensions of the original element.
        const rectA = elA.getBoundingClientRect();
        const rectB = elB.getBoundingClientRect();

        [cloneA, cloneB].forEach((c, idx) => {
            const r = idx === 0 ? rectA : rectB;
            c.style.position = "fixed";
            c.style.zIndex = CFG.Z_INDEX.CLONE;
            c.style.pointerEvents = "none";
            c.style.border = "none";

            // Force exact visual size
            c.style.width = r.width + "px";
            c.style.height = r.height + "px";
            c.style.minWidth = "0"; // Override any CSS min-width
            c.style.maxWidth = "none";

            // Center on coordinate
            c.style.transform = "translate(-50%, -50%)";
            // Ensure children fill the clone
            const childCalls = c.querySelectorAll("div, img");
            childCalls.forEach(child => {
                (child as HTMLElement).style.width = "100%";
                (child as HTMLElement).style.height = "100%";
            });
        });

        cloneA.style.left = slotA.left + "px";
        cloneA.style.top = slotA.top + "px";
        cloneB.style.left = slotB.left + "px";
        cloneB.style.top = slotB.top + "px";

        document.body.appendChild(cloneA);
        document.body.appendChild(cloneB);

        // Hide originals
        elA.style.visibility = "hidden";
        elB.style.visibility = "hidden";

        // Animation Math
        const centerY = wrapperRect.top + wrapperRect.height / 2;
        const dur = CFG.ANIMATION.SWAP_DURATION;
        const arcH = CFG.ANIMATION.ARC_HEIGHT;

        function arco(t: number, start: Point, end: Point, porCima: boolean): Point {
            const cx = (start.left + end.left) / 2;
            const cy = centerY + (porCima ? -arcH : arcH);
            const ang0 = Math.atan2(start.top - cy, start.left - cx);
            const ang1 = Math.atan2(end.top - cy, end.left - cx);
            const ang = ang0 + (ang1 - ang0) * t;
            const r = Math.hypot(start.left - cx, start.top - cy);
            return {
                left: cx + r * Math.cos(ang),
                top: cy + r * Math.sin(ang)
            };
        }

        let startTime: number | null = null;
        function animarFrame(now: number) {
            if (!startTime) startTime = now;
            let t = Math.min(1, (now - startTime) / dur);

            // Easing (Ease In Out Quad)
            const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            const posA = arco(easedT, slotA, slotB, true);
            const posB = arco(easedT, slotB, slotA, false);

            cloneA.style.left = posA.left + "px";
            cloneA.style.top = posA.top + "px";
            cloneB.style.left = posB.left + "px";
            cloneB.style.top = posB.top + "px";

            if (t < 1) {
                requestAnimationFrame(animarFrame);
            } else {
                cloneA.remove();
                cloneB.remove();
                elA.style.visibility = "";
                elB.style.visibility = "";
                overlay.remove();
                clearTimeout(safetyTimeout);
                (window as any).animacaoTrocaEmAndamento = false;
                if (window.Renderer) window.Renderer.renderizarMesa();
                if (callback) callback();
            }
        }
        requestAnimationFrame(animarFrame);
    }
}

(window as any).AnimationManager = AnimationManager;
