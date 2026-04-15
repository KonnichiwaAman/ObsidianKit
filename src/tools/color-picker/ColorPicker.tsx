import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toHexChannel(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function rgbToHex(color: RgbColor) {
  return `#${toHexChannel(color.r)}${toHexChannel(color.g)}${toHexChannel(color.b)}`;
}

function hexToRgb(hex: string): RgbColor | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[a-fA-F0-9]{3}$|^[a-fA-F0-9]{6}$/.test(normalized)) return null;

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function rgbToHsl(color: RgbColor): HslColor {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(color: HslColor): RgbColor {
  const h = ((color.h % 360) + 360) % 360;
  const s = clamp(color.s, 0, 100) / 100;
  const l = clamp(color.l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

export default function ColorPicker() {
  const [color, setColor] = useState<RgbColor>({ r: 59, g: 130, b: 246 });
  const [copied, setCopied] = useState<string | null>(null);

  const hex = useMemo(() => rgbToHex(color), [color]);
  const hsl = useMemo(() => rgbToHsl(color), [color]);

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  }

  function updateRgbChannel(channel: keyof RgbColor, value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    setColor((current) => ({ ...current, [channel]: clamp(parsed, 0, 255) }));
  }

  function updateHslChannel(channel: keyof HslColor, value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;

    const nextHsl = {
      ...hsl,
      [channel]: channel === "h" ? clamp(parsed, 0, 360) : clamp(parsed, 0, 100),
    };

    setColor(hslToRgb(nextHsl));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
          <div className="space-y-3">
            <div
              className="h-32 w-32 rounded-2xl border border-[var(--color-border-primary)]"
              style={{ backgroundColor: hex }}
            />
            <input
              type="color"
              value={hex}
              onChange={(event) => {
                const next = hexToRgb(event.target.value);
                if (next) setColor(next);
              }}
              className="h-10 w-32 cursor-pointer rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-1"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">HEX</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={hex}
                  onChange={(event) => {
                    const next = hexToRgb(event.target.value);
                    if (next) setColor(next);
                  }}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3 text-sm font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <button
                  onClick={() => copyValue("hex", hex)}
                  className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  aria-label="Copy HEX"
                >
                  {copied === "hex" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">RGB</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={color.r}
                  onChange={(event) => updateRgbChannel("r", event.target.value)}
                  className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={color.g}
                  onChange={(event) => updateRgbChannel("g", event.target.value)}
                  className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={color.b}
                  onChange={(event) => updateRgbChannel("b", event.target.value)}
                  className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>
              <button
                onClick={() => copyValue("rgb", `rgb(${color.r}, ${color.g}, ${color.b})`)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {copied === "rgb" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy RGB string
              </button>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">HSL</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={hsl.h}
                  onChange={(event) => updateHslChannel("h", event.target.value)}
                  className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={hsl.s}
                  onChange={(event) => updateHslChannel("s", event.target.value)}
                  className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={hsl.l}
                  onChange={(event) => updateHslChannel("l", event.target.value)}
                  className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
                />
              </div>
              <button
                onClick={() => copyValue("hsl", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {copied === "hsl" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy HSL string
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
