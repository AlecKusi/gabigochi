import { reducedMotion } from './transition';

const COLORS = ['#b48ae0', '#7a4fb3', '#ff7fb0', '#ffd34d', '#5aa8f0', '#ffffff', '#e0384f'];
const SCALE = 3;

/** Konfetti z pikselowych kwadracików na całym ekranie. */
export function confetti(host: HTMLElement, count = 90): void {
  if (reducedMotion()) return;
  const w = Math.ceil(host.clientWidth / SCALE);
  const hgt = Math.ceil(host.clientHeight / SCALE);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  canvas.className = 'px confetti';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const parts = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.8,
    y: -Math.random() * hgt * 0.3,
    vx: (Math.random() - 0.5) * 40,
    vy: 10 + Math.random() * 40,
    size: Math.random() < 0.3 ? 2 : 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    wobble: Math.random() * Math.PI * 2,
  }));
  const start = performance.now();
  let last = start;
  const frame = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.clearRect(0, 0, w, hgt);
    for (const p of parts) {
      p.vy += 60 * dt;
      p.wobble += dt * 8;
      p.x += (p.vx + Math.sin(p.wobble) * 10) * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    if (t - start < 2200) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
