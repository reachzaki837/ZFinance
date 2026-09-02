import { type ReactNode, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "ghost" | "outline" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  /** "icon" is square padding for icon-only buttons (toggles, pagination arrows). */
  size?: "sm" | "md" | "lg" | "icon";
}

const variants: Record<ButtonVariant, string> = {
  default: "bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-[0.98]",
  ghost: "bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)]",
  outline: "bg-transparent border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-border)]",
  danger: "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_20%,transparent)]",
};

const sizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
  icon: "p-2",
};

/**
 * Utility families where a caller-supplied class must *replace* the built-in one.
 * Tailwind emits every utility it sees, so `className="rounded-none"` would otherwise
 * only beat the base `rounded-lg` if its rule happened to sort later in the stylesheet.
 */
const FAMILIES = [
  /^(inline-flex|flex|inline-block|block)$/,
  /^rounded(-|$)/,
  /^p-/,
  /^px-/,
  /^py-/,
  /^gap-/,
  /^text-(xs|sm|base|lg)$/,
];

/** Compose base + variant + size classes, dropping any the caller overrides. */
function mergeClasses(base: string, override: string): string {
  const overrides = override.split(/\s+/).filter(Boolean);
  const kept = base.split(/\s+/).filter((cls) => {
    const family = FAMILIES.find((re) => re.test(cls));
    return !family || !overrides.some((o) => family.test(o));
  });
  return [...kept, ...overrides].join(" ");
}

export function Button({ children, variant = "default", size = "md", className = "", disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={mergeClasses(
        `inline-flex items-center gap-2 rounded-lg font-medium font-[var(--font-display)] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`,
        className
      )}
    >
      {children}
    </button>
  );
}
