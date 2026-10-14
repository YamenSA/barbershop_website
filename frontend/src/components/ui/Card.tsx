import type { ComponentProps } from "react";

export type CardProps = ComponentProps<"div">;

export default function Card({ className = "", ...props }: CardProps) {
  return <div {...props} className={`min-w-0 rounded-xl border border-line bg-surface-card p-4 font-text text-ink md:p-6 ${className}`} />;
}
