let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx!;
}

export function playTone(freq: number, type: OscillatorType, duration: number, delay = 0, soundEnabled = true) {
  if (!soundEnabled || typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    }, delay * 1000);
  } catch {
    // Ignore audio errors on autoplay-restricted devices
  }
}

export function playMessageChime(soundEnabled = true) {
  playTone(523.25, "sine", 0.25, 0, soundEnabled);    // C5
  playTone(659.25, "sine", 0.35, 0.08, soundEnabled); // E5
  playTone(783.99, "sine", 0.45, 0.16, soundEnabled); // G5
}

export function playLoveNudgeChime(soundEnabled = true) {
  playTone(440, "triangle", 0.3, 0, soundEnabled);      // A4
  playTone(554.37, "triangle", 0.3, 0.1, soundEnabled); // C#5
  playTone(659.25, "triangle", 0.3, 0.2, soundEnabled); // E5
  playTone(880, "triangle", 0.6, 0.3, soundEnabled);    // A5
}

export function burstHearts(count = 28) {
  if (typeof document === "undefined" || !document.body) return;

  // Haptic feedback on mobile if supported
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([35, 50, 35]);
    } catch {}
  }

  // Ensure dedicated full-screen overlay container exists with top z-index
  let container = document.getElementById("floating-hearts-overlay");
  if (!container) {
    container = document.createElement("div");
    container.id = "floating-hearts-overlay";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100vw";
    container.style.height = "100dvh";
    container.style.pointerEvents = "none";
    container.style.zIndex = "999999";
    container.style.overflow = "hidden";
    document.body.appendChild(container);
  }

  const icons = ["💖", "💕", "❤️", "🥰", "🌸", "✨", "💋", "💌", "🌷", "💗", "💘", "🌹", "🦋", "💍", "💓"];

  for (let i = 0; i < count; i++) {
    const delayMs = Math.random() * 650;
    setTimeout(() => {
      if (!container) return;

      const el = document.createElement("span");
      el.textContent = icons[Math.floor(Math.random() * icons.length)];
      el.style.position = "absolute";
      el.style.bottom = "-40px";
      el.style.left = `${Math.random() * 86 + 7}%`;
      el.style.fontSize = `${(Math.random() * 1.1 + 1.5).toFixed(2)}rem`;
      el.style.userSelect = "none";
      el.style.pointerEvents = "none";
      el.style.willChange = "transform, opacity";
      el.style.filter = "drop-shadow(0 0 10px rgba(225, 29, 72, 0.75))";
      el.style.zIndex = "999999";

      container.appendChild(el);

      const durationMs = Math.random() * 800 + 2400; // 2.4s to 3.2s
      const swayPx = Math.random() * 90 - 45;       // -45px to +45px
      const rotDeg = Math.random() * 50 - 25;       // -25deg to +25deg
      const peakScale = (Math.random() * 0.4 + 1.2).toFixed(2);

      // Web Animations API (Ultra-smooth 60fps/120fps hardware acceleration on iOS & Android)
      if (typeof el.animate === "function") {
        const anim = el.animate(
          [
            { transform: "translate3d(0, 0, 0) scale(0.6) rotate(0deg)", opacity: 0 },
            { transform: `translate3d(${swayPx * 0.3}px, -100px, 0) scale(${peakScale}) rotate(${rotDeg * 0.4}deg)`, opacity: 1, offset: 0.15 },
            { transform: `translate3d(${swayPx * 0.7}px, -50vh, 0) scale(${peakScale}) rotate(${rotDeg * 0.8}deg)`, opacity: 0.95, offset: 0.7 },
            { transform: `translate3d(${swayPx}px, -112vh, 0) scale(1.05) rotate(${rotDeg}deg)`, opacity: 0 }
          ],
          {
            duration: durationMs,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards"
          }
        );
        anim.onfinish = () => el.remove();
      } else {
        // Fallback for older browsers
        el.className = "floating-heart";
        setTimeout(() => el.remove(), durationMs + 200);
      }
    }, delayMs);
  }
}
