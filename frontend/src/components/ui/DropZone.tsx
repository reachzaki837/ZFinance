import { useRef, useState, type ReactNode } from "react";

interface DropZoneProps {
  /** Called with the chosen file, whether picked via the dialog or dropped. */
  onSelect: (file: File) => void;
  /** "success" tints the zone green — used once a file has been staged. */
  state?: "idle" | "success";
  disabled?: boolean;
  /** Icon rendered above the body. Callers supply their own so each screen keeps its treatment. */
  icon?: ReactNode;
  accept?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Shared dashed upload surface used by Transactions and Reconciliation.
 * Owns the border/background/drag-state pattern and the hidden file input;
 * callers pass their own icon and body content via props.
 */
export function DropZone({
  onSelect,
  state = "idle",
  disabled = false,
  icon,
  accept = ".csv",
  className = "p-8",
  children,
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const borderClasses =
    state === "success"
      ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_6%,transparent)]"
      : dragging
      ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
      : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]";

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onSelect(file);
      }}
      className={`border-2 border-dashed rounded-xl flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${borderClasses} ${className}`}
    >
      {icon}
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
      />
    </div>
  );
}
