import { type ReactNode, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "ghost" | "outline" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
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
};

export function Button({ children, variant = "default", size = "md", className = "", disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg font-medium font-[var(--font-display)] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
