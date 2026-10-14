import Link from "next/link";
import type { ComponentProps } from "react";

export type TextLinkProps = ComponentProps<typeof Link>;

export default function TextLink({ children, className = "", ...props }: TextLinkProps) {
  return (
    <Link {...props} className={`inline-flex min-h-12 items-center gap-2 font-text font-semibold text-gold-300 underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${className}`}>
      {children}<span aria-hidden="true">→</span>
    </Link>
  );
}
