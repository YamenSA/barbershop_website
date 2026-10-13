import type { ComponentProps } from "react";

const variants = {
  neutral: "bg-surface-hover text-gold-300 tracking-[.04em]",
  outline: "border border-gold-500 text-gold-300",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  placeholder: "border border-dashed border-ink-subtle text-ink-muted",
};

export type BadgeProps = ComponentProps<"span"> & {
  variant?: keyof typeof variants;
};

export default function Badge({ variant = "neutral", className = "", ...props }: BadgeProps) {
  return <span {...props} className={`inline-flex h-6 items-center gap-1 rounded-[4px] px-2 font-text text-xs font-semibold ${variants[variant]} ${className}`} />;
}
