import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Tool } from "@/types";
import { ArrowRight } from "lucide-react";
import { cn, isSafeInternalPath } from "@/lib/utils";

interface ToolCardProps {
  tool: Tool;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

function ToolCardComponent({ tool }: ToolCardProps) {
  const navigate = useNavigate();
  const Icon = tool.icon;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleSeedRef = useRef(0);
  const rippleTimersRef = useRef<number[]>([]);
  const navigateTimerRef = useRef<number | null>(null);

  const [isNavigating, setIsNavigating] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current !== null) {
        window.clearTimeout(navigateTimerRef.current);
      }

      for (const timer of rippleTimersRef.current) {
        window.clearTimeout(timer);
      }
      rippleTimersRef.current = [];
    };
  }, []);

  function addRipple(event: React.MouseEvent<HTMLButtonElement>) {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = rippleSeedRef.current + 1;
    rippleSeedRef.current = id;

    setRipples((prev) => [...prev, { id, x, y }]);
    const timer = window.setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 520);
    rippleTimersRef.current.push(timer);
  }

  function handleOpen(event: React.MouseEvent<HTMLButtonElement>) {
    if (isNavigating) return;
    if (!isSafeInternalPath(tool.path)) return;
    addRipple(event);
    setIsNavigating(true);

    navigateTimerRef.current = window.setTimeout(() => {
      navigate(tool.path);
    }, 120);
  }

  return (
    <div
      id={`tool-${tool.id}`}
      className={cn(
        "group relative flex h-full min-h-[192px] flex-col justify-between overflow-hidden rounded-2xl border sm:min-h-[220px]",
        "border-[var(--color-border-primary)] bg-[var(--color-bg-card)]",
        "p-4 sm:p-5",
        "transition-[border-color,background-color] duration-220",
        "md:hover:border-[var(--color-border-hover)] md:hover:bg-[var(--color-bg-card-hover)]",
      )}
    >
      <div className="absolute left-5 right-5 top-0 h-px bg-gradient-to-r from-transparent via-[#a1a1aa] to-transparent opacity-0 transition-opacity duration-220 md:group-hover:opacity-100" />

      <div className="relative z-[1]">
        <div
          className={cn(
            "mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-primary)] sm:mb-3 sm:h-10 sm:w-10",
            "bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]",
            "transition-all duration-220 md:group-hover:text-[var(--color-text-primary)]",
          )}
        >
          <Icon
            className={cn(
              "h-[18px] w-[18px] sm:h-5 sm:w-5",
            )}
          />
        </div>

        <h3
          className={cn(
            "font-bold tracking-tight text-[var(--color-text-primary)]",
            "text-[15px] sm:text-base",
          )}
        >
          {tool.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)] sm:mt-1.5 sm:text-sm">
          {tool.description}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Open ${tool.name}`}
        ref={buttonRef}
        onClick={handleOpen}
        className={`mobile-tap-feedback relative mt-5 flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl border
              border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-xs font-semibold sm:mt-6 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm
                    text-[var(--color-text-secondary)] transition-colors duration-180
            active:scale-[0.985] md:hover:border-[var(--color-border-hover)] md:hover:text-[var(--color-text-primary)]
                    `}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="pointer-events-none absolute h-2 w-2 animate-[tool-ripple_300ms_cubic-bezier(0.22,1,0.36,1)_forwards] rounded-full bg-[var(--color-text-primary)]/35"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}

        Open Tool
        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}

export const ToolCard = memo(ToolCardComponent);
