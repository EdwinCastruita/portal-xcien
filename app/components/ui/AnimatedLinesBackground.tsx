"use client";
import { useEffect, useRef } from "react";

export default function AnimatedLinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width: number;
    let height: number;
    let animationFrameId: number;
    let time = 0;

    const lines = 25;
    const amplitude = 40;
    const frequency = 0.002;
    const speed = 0.01;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        ctx.lineWidth = 1;

        const opacity = 0.15 + (i / lines) * 0.4;
        ctx.strokeStyle = `rgba(234, 179, 8, ${opacity})`;

        for (let x = 0; x <= width; x += 10) {
          const y =
            height / 2 +
            Math.sin(x * frequency + time + i * 0.3) * amplitude +
            i * 12;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      time += speed;
      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10" />
  );
}
