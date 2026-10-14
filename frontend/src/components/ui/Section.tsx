import type { ComponentProps } from "react";
import Container from "./Container";

export type SectionProps = ComponentProps<"section"> & {
  tone?: "base" | "raise";
};

export default function Section({
  children,
  tone = "base",
  className = "",
  ...props
}: SectionProps) {
  return (
    <section
      {...props}
      className={`py-12 text-ink lg:py-24 ${tone === "raise" ? "bg-surface-raise" : "bg-surface-base"} ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}
