
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store';
import { getWindowSize } from '../src/utils/platform';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
    type: 'liquid' | 'sparkle' | 'bubble';
}

export const GameRenderer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const resizeTimeoutRef = useRef<number | null>(null);
  
  // Safe initial size calculation
  const getInitialSize = useCallback(() => {
    const size = getWindowSize();
    return { width: size.width, height: size.height * 0.55 };
  }, []);
  
  const [canvasSize, setCanvasSize] = useState(getInitialSize());
  const currentFill = useGameStore((state) => state.currentFill);
  const targetFill = useGameStore((state) => state.targetFill);
  const isPouring = useGameStore((state) => state.isPouring);
  const activeTapId = useGameStore((state) => state.activeTapId);
  const taps = useGameStore((state) => state.taps);
  const isFrenzyActive = useGameStore((state) => state.isFrenzyActive);
  const toasts = useGameStore((state) => state.toasts);
  const activeTap = taps.find(t => t.id === activeTapId) || taps[0];

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = window.setTimeout(() => {
      const size = getWindowSize();
      setCanvasSize({ width: size.width, height: size.height * 0.55 });
    }, 150);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
      };
    }
  }, [handleResize]);

  const triggerSparkles = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
        particles.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 12,
            vy: -Math.random() * 12 - 5,
            life: 1.5,
            color: '#facc15', // Gold
            size: Math.random() * 6 + 4,
            type: 'sparkle'
        });
    }
  };

  const createSplash = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
        particles.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 8,
            vy: -Math.random() * 5 - 2,
            life: 1.0,
            color,
            size: Math.random() * 4 + 2,
            type: 'liquid'
        });
    }
  };

  useEffect(() => {
      const lastToast = toasts[toasts.length - 1];
      if (lastToast?.type === 'PERFECT') {
          const w = canvasRef.current?.width || 0;
          const h = canvasRef.current?.height || 0;
          triggerSparkles(w/2, h/2 + 50);
      }
  }, [toasts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Glass Dimensions
      const topW = 170;
      const bottomW = 120;
      const glassH = 280;
      const glassX = w / 2;
      const glassY = h / 2 - 20;
      const baseThickness = 12;

      // Beer Style Configurations
      const beerStyles: Record<string, { foamColor: string; bubbleSpeed: number; bubbleFreq: number; haze: number; nitro: boolean }> = {
          'tap_1': { foamColor: '#ffffff', bubbleSpeed: 1, bubbleFreq: 1, haze: 0, nitro: false }, // Lager
          'tap_2': { foamColor: '#fffef0', bubbleSpeed: 0.8, bubbleFreq: 0.7, haze: 0.2, nitro: false }, // IPA
          'tap_3': { foamColor: '#f5e6d3', bubbleSpeed: 0.3, bubbleFreq: 1.5, haze: 0.5, nitro: true } // Stout
      };
      const style = beerStyles[activeTap.id] || beerStyles['tap_1'];

      // Helper for the Pint Path (tapered)
      const getPintPath = (context: CanvasRenderingContext2D, widthTop: number, widthBottom: number, height: number, x: number, y: number, radius: number = 15) => {
        const halfTop = widthTop / 2;
        const halfBottom = widthBottom / 2;
        
        context.beginPath();
        context.moveTo(x - halfTop, y); // Top Left
        context.lineTo(x + halfTop, y); // Top Right
        context.lineTo(x + halfBottom, y + height - radius); // Bottom Right start
        context.arcTo(x + halfBottom, y + height, x, y + height, radius); // Bottom Right curve
        context.arcTo(x - halfBottom, y + height, x - halfBottom, y + height - radius, radius); // Bottom Left curve
        context.lineTo(x - halfTop, y); // Back to Top Left
        context.closePath();
      };

      // 1. Draw Target Zone Shadow
      const targetY = glassY + glassH - (targetFill * glassH);
      const zoneH = 0.04 * glassH;
      ctx.fillStyle = isFrenzyActive ? 'rgba(250, 204, 21, 0.2)' : 'rgba(74, 222, 128, 0.1)';
      ctx.fillRect(0, targetY - zoneH/2, w, zoneH);
      
      // Target Line
      ctx.strokeStyle = isFrenzyActive ? 'rgba(250, 204, 21, 0.8)' : 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([8, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(glassX - topW/2 - 40, targetY);
      ctx.lineTo(glassX + topW/2 + 40, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Liquid Logic
      const fillH = Math.min(1.1, Math.max(0, currentFill)) * glassH;
      const liquidTopY = glassY + glassH - fillH;

      ctx.save();
      // Use the pint path as a clipping mask
      getPintPath(ctx, topW - 8, bottomW - 8, glassH - 6, glassX, glassY + 2, 12);
      ctx.clip();

      // Draw Main Liquid Gradient
      const grad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
      grad.addColorStop(0, activeTap.color);
      grad.addColorStop(1, '#0c0805'); 
      ctx.fillStyle = grad;
      ctx.fillRect(glassX - topW, liquidTopY, topW * 2, fillH);

      // Haze Layer (for IPA/Stout)
      if (style.haze > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${style.haze * 0.1})`;
          ctx.fillRect(glassX - topW, liquidTopY, topW * 2, fillH);
      }

      // Carbonation Bubbles
      if (currentFill > 0.05) {
          const bubbleColor = style.nitro ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)';
          ctx.fillStyle = bubbleColor;
          
          const bubbleCount = Math.floor(15 * style.bubbleFreq);
          for (let i = 0; i < bubbleCount; i++) {
              // Nitro effect: Bubbles sink slightly or settle slowly at the edges
              const time = Date.now() / (1000 / style.bubbleSpeed);
              const bOffset = (time + i * (fillH / bubbleCount)) % fillH;
              
              const yPos = style.nitro 
                ? liquidTopY + bOffset // Sinking / cascading look
                : glassY + glassH - bOffset; // Rising look
                
              const xSpread = (bottomW / 2) - 10;
              const bx = glassX + Math.sin(time + i) * xSpread;
              
              if (yPos > liquidTopY + 10 && yPos < glassY + glassH - 10) {
                  ctx.beginPath();
                  ctx.arc(bx, yPos, style.nitro ? 0.8 : 1.5, 0, Math.PI * 2);
                  ctx.fill();
              }
          }
      }

      // Foam (The Head)
      if (currentFill > 0.01) {
          const foamH = 22 + Math.sin(Date.now() / 250) * 2;
          ctx.fillStyle = isFrenzyActive ? '#fffbe6' : style.foamColor;
          
          // Draw "puffy" foam head
          const foamBubbles = 8;
          const bubbleStep = topW / (foamBubbles - 1);
          for (let i = 0; i < foamBubbles; i++) {
              const bx = (glassX - topW/2) + i * bubbleStep;
              ctx.beginPath();
              ctx.arc(bx, liquidTopY + 5, 14, 0, Math.PI * 2);
              ctx.fill();
          }
          ctx.fillRect(glassX - topW/2, liquidTopY, topW, foamH);
          
          // Surface highlights on foam
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(glassX - topW/2 + 10, liquidTopY + 5, topW - 20, 2);
      }

      ctx.restore();

      // 3. Draw Glass Body
      ctx.save();
      if (isFrenzyActive) {
          const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
          ctx.shadowBlur = 15 + pulse * 15;
          ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
      }

      // Glass Outer Stroke
      ctx.strokeStyle = isFrenzyActive ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 4;
      getPintPath(ctx, topW, bottomW, glassH, glassX, glassY, 15);
      ctx.stroke();

      // Glass Inner Rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      getPintPath(ctx, topW - 6, bottomW - 6, glassH - 4, glassX, glassY + 2, 12);
      ctx.stroke();

      // Glass Base (Solid bottom)
      ctx.fillStyle = isFrenzyActive ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(glassX - bottomW/2 + 5, glassY + glassH - baseThickness);
      ctx.lineTo(glassX + bottomW/2 - 5, glassY + glassH - baseThickness);
      ctx.arcTo(glassX + bottomW/2, glassY + glassH, glassX, glassY + glassH, 15);
      ctx.arcTo(glassX - bottomW/2, glassY + glassH, glassX - bottomW/2, glassY + glassH - baseThickness, 15);
      ctx.closePath();
      ctx.fill();

      // Reflections (The "Shine")
      const shineGrad = ctx.createLinearGradient(glassX - topW/2, 0, glassX + topW/2, 0);
      shineGrad.addColorStop(0, 'rgba(255,255,255,0)');
      shineGrad.addColorStop(0.1, 'rgba(255,255,255,0.2)');
      shineGrad.addColorStop(0.15, 'rgba(255,255,255,0)');
      shineGrad.addColorStop(0.85, 'rgba(255,255,255,0)');
      shineGrad.addColorStop(0.9, 'rgba(255,255,255,0.2)');
      shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.fillStyle = shineGrad;
      getPintPath(ctx, topW, bottomW, glassH, glassX, glassY, 15);
      ctx.fill();

      ctx.restore();

      // 4. Overfill Splash
      if (currentFill > 1.0) {
          createSplash(glassX + (Math.random()-0.5)*topW, glassY, activeTap.color, 2);
      }

      // 5. Update and Draw Particles
      particles.current = particles.current.filter(p => p.life > 0);
      particles.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3;
          p.vx *= 0.98;
          p.life -= 0.02;
          
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          
          if (p.type === 'sparkle') {
              ctx.beginPath();
              const s = p.size;
              ctx.moveTo(p.x, p.y - s);
              ctx.lineTo(p.x + s/3, p.y - s/3);
              ctx.lineTo(p.x + s, p.y);
              ctx.lineTo(p.x + s/3, p.y + s/3);
              ctx.lineTo(p.x, p.y + s);
              ctx.lineTo(p.x - s/3, p.y + s/3);
              ctx.lineTo(p.x - s, p.y);
              ctx.lineTo(p.x - s/3, p.y - s/3);
              ctx.closePath();
              ctx.fill();
          } else {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
          }
      });
      ctx.globalAlpha = 1.0;

      // 6. Pour Stream
      if (isPouring) {
        ctx.fillStyle = activeTap.color;
        const streamW = isFrenzyActive ? 22 : 14;
        // Ensure liquidTopY is valid - if fillH is 0 or negative, draw from top of glass
        const streamHeight = liquidTopY > 0 ? liquidTopY : glassY + glassH;
        ctx.fillRect(glassX - streamW/2, 0, streamW, streamHeight);
        // Foam splash at point of contact
        if (Math.random() > 0.4) {
            ctx.fillStyle = style.foamColor;
            ctx.beginPath();
            ctx.arc(glassX, streamHeight, 10, 0, Math.PI * 2);
            ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentFill, targetFill, isPouring, activeTap, isFrenzyActive, canvasSize]);

  return (
    <canvas 
      ref={canvasRef} 
      width={canvasSize.width} 
      height={canvasSize.height}
      className="w-full h-full touch-none pointer-events-none"
    />
  );
};
