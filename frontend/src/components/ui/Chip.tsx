import { type ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  /** Hex/CSS color the chip tints itself with. Falls back to the neutral border/muted pair. */
  color?: string;
  /** Filled (selected) rather than tinted. Only meaningful alongside onClick. */
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const BASE =
  "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium font-[var(--font-display)] border transition-all duration-150";

/**
 * Single pill style shared by every chip in the app — category filters, table category
 * tags, and reconciliation candidate refs. Renders a <button> when onClick is supplied,
 * otherwise a <span>, so non-interactive tags stay out of the tab order.
 */
export function Chip({ children, color, active = false, onClick, className = "" }: ChipProps) {
  const style = color
    ? {
        color: active ? "white" : color,
        background: active ? color : `color-mix(in srgb, ${color} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      }
    : {
        color: active ? "var(--color-ink)" : "var(--color-muted)",
        background: "var(--color-border)",
        borderColor: "var(--color-border)",
      };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${BASE} cursor-pointer ${className}`}
        style={style}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={`${BASE} ${className}`} style={style}>
      {children}
    </span>
  );
}
