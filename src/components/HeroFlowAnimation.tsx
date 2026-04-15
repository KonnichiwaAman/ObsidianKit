import { useEffect, useMemo, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  FileText,
  Film,
  Image,
  Lock,
  QrCode,
  Ruler,
  ScanSearch,
  Scissors,
  Shield,
  Type,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroFlowAnimationProps {
  className?: string;
  iconCount?: number;
}

interface FlowNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  drift: number;
  icon: LucideIcon;
}

const ICONS: LucideIcon[] = [
  Image,
  FileText,
  Film,
  Ruler,
  Calculator,
  Type,
  QrCode,
  Scissors,
  Shield,
  Lock,
  Zap,
  ScanSearch,
];

function createNode(icon: LucideIcon, width: number, height: number): FlowNode {
  // Keep nodes concentrated around the headline area for a calm, premium backdrop.
  const spread = 0.14;
  const centerX = width * 0.5;
  const centerY = height * 0.4;

  return {
    x: centerX + (Math.random() * 2 - 1) * width * spread * 2.4,
    y: centerY + (Math.random() * 2 - 1) * height * spread * 2,
    vx: (Math.random() * 2 - 1) * 0.16,
    vy: (Math.random() * 2 - 1) * 0.16,
    size: 8 + Math.random() * 4,
    phase: Math.random() * Math.PI * 2,
    drift: 0.004 + Math.random() * 0.006,
    icon,
  };
}

export function HeroFlowAnimation({ className, iconCount = 22 }: HeroFlowAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);
  const nodesRef = useRef<FlowNode[]>([]);

  const icons = useMemo(() => {
    const count = Math.max(12, Math.min(iconCount, 30));
    return Array.from({ length: count }, (_, index) => ICONS[index % ICONS.length]);
  }, [iconCount]);

  useEffect(() => {
    iconRefs.current = iconRefs.current.slice(0, icons.length);
  }, [icons.length]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const containerElement = container;
    const canvasElement = canvas;
    const context2d = context;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let destroyed = false;
    let isCompactViewport = false;
    let lastRenderedAt = 0;
    let isDocumentVisible = !document.hidden;
    let isIntersectingViewport = true;
    let shouldAnimate = false;
    let intersectionObserver: IntersectionObserver | null = null;

    nodesRef.current = [];

    const pointer = { x: 0, y: 0, active: false };
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactViewportQuery = window.matchMedia("(max-width: 767px)");
    const coarsePointerQuery = window.matchMedia("(hover: none) and (pointer: coarse)");

    const palette = {
      lineRgb: "161,161,170",
      glowRgb: "245,245,245",
      iconColor: "#d4d4d8",
    };

    function syncPalette() {
      const isLightMode = document.documentElement.classList.contains("light");
      palette.lineRgb = isLightMode ? "63,63,70" : "161,161,170";
      palette.glowRgb = isLightMode ? "10,10,10" : "245,245,245";
      palette.iconColor = isLightMode ? "#27272a" : "#d4d4d8";
      containerElement.style.setProperty("--hero-icon-color", palette.iconColor);
    }

    function setCanvasSize() {
      const rect = containerElement.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      isCompactViewport = compactViewportQuery.matches;

      canvasElement.width = Math.floor(width * dpr);
      canvasElement.height = Math.floor(height * dpr);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;

      context2d.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (nodesRef.current.length !== icons.length) {
        nodesRef.current = icons.map((icon) => createNode(icon, width, height));
      }
    }

    function stopAnimationLoop() {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function startAnimationLoop() {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    }

    function updateAnimationState() {
      const nextShouldAnimate =
        !reduceMotionQuery.matches && isDocumentVisible && isIntersectingViewport;

      if (nextShouldAnimate === shouldAnimate) {
        return;
      }

      shouldAnimate = nextShouldAnimate;

      if (shouldAnimate) {
        startAnimationLoop();
      } else {
        stopAnimationLoop();
        renderFrame(performance.now());
      }
    }

    function handleVisibilityChange() {
      isDocumentVisible = !document.hidden;
      updateAnimationState();
    }

    function handleReduceMotionChange() {
      updateAnimationState();

      if (reduceMotionQuery.matches) {
        renderFrame(performance.now());
      }
    }

    function updatePointer(event: PointerEvent) {
      if (coarsePointerQuery.matches) {
        pointer.active = false;
        return;
      }

      const rect = containerElement.getBoundingClientRect();
      const insideX = event.clientX >= rect.left && event.clientX <= rect.right;
      const insideY = event.clientY >= rect.top && event.clientY <= rect.bottom;

      if (!insideX || !insideY) {
        pointer.active = false;
        return;
      }

      pointer.active = true;
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    }

    function clearPointer() {
      pointer.active = false;
    }

    function renderFrame(timestamp: number) {
      if (destroyed) return;

      if (!reduceMotionQuery.matches && isCompactViewport) {
        if (timestamp - lastRenderedAt < 32) {
          rafId = window.requestAnimationFrame(renderFrame);
          return;
        }
        lastRenderedAt = timestamp;
      }

      const nodes = nodesRef.current;
      context2d.clearRect(0, 0, width, height);

      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];

        if (!reduceMotionQuery.matches) {
          node.phase += node.drift;
          node.vx += Math.cos(node.phase) * 0.003;
          node.vy += Math.sin(node.phase * 1.2) * 0.003;
        }

        if (pointer.active && !isCompactViewport) {
          // Gentle local repulsion adds subtle pointer reactivity without visual chaos.
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const influenceRadius = 180;

          if (distance < influenceRadius) {
            const force = ((influenceRadius - distance) / influenceRadius) * 0.035;
            node.vx += (dx / distance) * force;
            node.vy += (dy / distance) * force;
          }
        }

        node.vx *= 0.985;
        node.vy *= 0.985;

        if (!reduceMotionQuery.matches) {
          node.x += node.vx;
          node.y += node.vy;
        }

        const padding = isCompactViewport ? 20 : 28;

        if (node.x < padding) {
          node.x = padding;
          node.vx *= -0.85;
        }
        if (node.x > width - padding) {
          node.x = width - padding;
          node.vx *= -0.85;
        }
        if (node.y < padding) {
          node.y = padding;
          node.vy *= -0.85;
        }
        if (node.y > height - padding) {
          node.y = height - padding;
          node.vy *= -0.85;
        }

        const icon = iconRefs.current[index];
        if (icon) {
          const pulse = reduceMotionQuery.matches
            ? 0
            : Math.sin((timestamp * 0.0012) + node.phase) * 0.04;
          icon.style.transform = `translate3d(${node.x}px, ${node.y}px, 0) translate(-50%, -50%) scale(${1 + pulse})`;
          icon.style.opacity = "0.78";
        }
      }

      if (!isCompactViewport) {
        const maxDistance = 175;
        // Draw a soft network between nearby nodes.
        for (let i = 0; i < nodes.length; i += 1) {
          for (let j = i + 1; j < nodes.length; j += 1) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance >= maxDistance) continue;

            const alpha = (1 - distance / maxDistance) ** 1.8 * 0.48;
            context2d.beginPath();
            context2d.moveTo(a.x, a.y);
            context2d.lineTo(b.x, b.y);
            context2d.strokeStyle = `rgba(${palette.lineRgb}, ${alpha.toFixed(4)})`;
            context2d.lineWidth = 1;
            context2d.stroke();
          }
        }
      }

      for (const node of nodes) {
        // Glow under each icon keeps contrast readable behind hero copy.
        const glowRadius = isCompactViewport ? node.size * 2.4 : node.size * 3.2;
        const glow = context2d.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
        glow.addColorStop(0, `rgba(${palette.glowRgb}, 0.18)`);
        glow.addColorStop(1, "rgba(0,0,0,0)");

        context2d.beginPath();
        context2d.fillStyle = glow;
        context2d.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        context2d.fill();

        context2d.beginPath();
        context2d.fillStyle = `rgba(${palette.glowRgb}, 0.75)`;
        context2d.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        context2d.fill();
      }

      if (shouldAnimate) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    }

    const themeObserver = new MutationObserver(syncPalette);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    syncPalette();
    setCanvasSize();

    window.addEventListener("resize", setCanvasSize);
    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });

    if (typeof compactViewportQuery.addEventListener === "function") {
      compactViewportQuery.addEventListener("change", setCanvasSize);
    } else {
      compactViewportQuery.addListener(setCanvasSize);
    }

    if (typeof reduceMotionQuery.addEventListener === "function") {
      reduceMotionQuery.addEventListener("change", handleReduceMotionChange);
    } else {
      reduceMotionQuery.addListener(handleReduceMotionChange);
    }

    if (!coarsePointerQuery.matches) {
      window.addEventListener("pointermove", updatePointer, { passive: true });
      window.addEventListener("pointerleave", clearPointer);
    }

    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          isIntersectingViewport = entry?.isIntersecting ?? true;
          updateAnimationState();
        },
        { threshold: 0.02 },
      );
      intersectionObserver.observe(containerElement);
    }

    renderFrame(0);
    updateAnimationState();

    return () => {
      destroyed = true;
      stopAnimationLoop();
      window.removeEventListener("resize", setCanvasSize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (typeof compactViewportQuery.removeEventListener === "function") {
        compactViewportQuery.removeEventListener("change", setCanvasSize);
      } else {
        compactViewportQuery.removeListener(setCanvasSize);
      }
      if (typeof reduceMotionQuery.removeEventListener === "function") {
        reduceMotionQuery.removeEventListener("change", handleReduceMotionChange);
      } else {
        reduceMotionQuery.removeListener(handleReduceMotionChange);
      }
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerleave", clearPointer);
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
      themeObserver.disconnect();
    };
  }, [icons]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="absolute inset-0">
        {icons.map((Icon, index) => (
          <div
            key={`${Icon.displayName ?? Icon.name}-${index}`}
            ref={(node) => {
              iconRefs.current[index] = node;
            }}
            className="absolute left-0 top-0 text-[var(--hero-icon-color)]"
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        ))}
      </div>
    </div>
  );
}
