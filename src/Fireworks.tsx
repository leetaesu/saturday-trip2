import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  drag: number;
  twinkle: boolean;
  trail: Array<[number, number]>;
}

const PALETTE = [
  '#ff7a59',
  '#ffb74d',
  '#ffd54f',
  '#f06292',
  '#ff9aa2',
  '#fff1a8',
  '#81c784',
  '#ba8cff',
];

export default function Fireworks({ durationMs = 5000, onDone }: { durationMs?: number; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const immediate = setTimeout(() => onDoneRef.current(), 0);
      return () => clearTimeout(immediate);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setAttribute('popover', 'manual');
    const showInTopLayer = () => {
      try {
        if ('showPopover' in canvas && typeof canvas.showPopover === 'function') {
          if (canvas.matches(':popover-open') && 'hidePopover' in canvas && typeof canvas.hidePopover === 'function') {
            canvas.hidePopover();
          }
          canvas.showPopover();
        }
      } catch {
        // Ignore if Popover API is unsupported; fixed z-index still displays after dialog closes.
      }
    };
    const rafPromote = requestAnimationFrame(showInTopLayer);

    let width = window.innerWidth;
    let height = window.innerHeight;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    const burst = (cx: number, cy: number, count: number, power: number) => {
      const mainColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const subColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.22;
        const speed = power * (0.45 + Math.random() * 0.72);
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          color: i % 3 === 0 ? subColor : mainColor,
          size: 2.2 + Math.random() * 2.4,
          alpha: 1,
          decay: 0.011 + Math.random() * 0.01,
          gravity: 0.065,
          drag: 0.968,
          twinkle: i % 4 === 0,
          trail: [],
        });
      }
    };

    const focusWidth = Math.min(width, 460);
    const leftEdge = (width - focusWidth) / 2;
    const burstPlan = [
      { delay: 80, rx: 0.28, ry: 0.24, count: 44, power: 4.8 },
      { delay: 240, rx: 0.74, ry: 0.21, count: 46, power: 5.0 },
      { delay: 620, rx: 0.5, ry: 0.16, count: 54, power: 5.6 },
      { delay: 1120, rx: 0.22, ry: 0.31, count: 42, power: 4.6 },
      { delay: 1620, rx: 0.78, ry: 0.29, count: 44, power: 4.9 },
      { delay: 2220, rx: 0.48, ry: 0.2, count: 56, power: 5.8 },
      { delay: 2820, rx: 0.3, ry: 0.25, count: 44, power: 4.8 },
      { delay: 3380, rx: 0.7, ry: 0.23, count: 48, power: 5.2 },
      { delay: 3820, rx: 0.52, ry: 0.17, count: 58, power: 5.7 },
    ];

    const timers = burstPlan
      .filter(step => step.delay < durationMs - 650)
      .map(step =>
        setTimeout(() => {
          burst(leftEdge + focusWidth * step.rx, height * step.ry, step.count, step.power);
        }, step.delay),
      );

    const fadeTimer = setTimeout(() => setFading(true), Math.max(0, durationMs - 480));
    const endTimer = setTimeout(() => onDoneRef.current(), durationMs);

    let rafId = 0;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.trail.push([p.x, p.y]);
        if (p.trail.length > 5) p.trail.shift();

        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02) {
          particles.splice(i, 1);
          continue;
        }

        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0][0], p.trail[0][1]);
          for (let j = 1; j < p.trail.length; j++) {
            ctx.lineTo(p.trail[j][0], p.trail[j][1]);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, p.size * 0.75);
          ctx.lineCap = 'round';
          ctx.globalAlpha = p.alpha * 0.45;
          ctx.stroke();
        }

        const flicker = p.twinkle ? 0.55 + Math.random() * 0.45 : 1;
        ctx.globalAlpha = p.alpha * flicker;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = p.alpha * 0.85 * flicker;
        ctx.fillStyle = '#fffdf7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafPromote);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      timers.forEach(clearTimeout);
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
      try {
        if ('hidePopover' in canvas && typeof canvas.hidePopover === 'function' && canvas.matches(':popover-open')) {
          canvas.hidePopover();
        }
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, [durationMs]);

  return <canvas ref={canvasRef} className={`fireworks-canvas ${fading ? 'is-fading' : ''}`} aria-hidden="true" />;
}
