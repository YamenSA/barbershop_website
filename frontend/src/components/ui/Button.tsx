import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type CommonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
  size?: "md" | "lg";
  className?: string;
};

type LinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonProps | "disabled"> & {
    disabled?: never;
  };

type NativeButtonProps = CommonProps &
  Omit<ComponentProps<"button">, keyof CommonProps> & {
    href?: never;
  };

export type ButtonProps = LinkProps | NativeButtonProps;

const variants = {
  primary:
    "bg-gold-500 text-surface-pitch hover:bg-gold-400 active:bg-gold-600 active:scale-[.98]",
  secondary: "border border-gold-500 text-gold-300 hover:bg-surface-card",
  text: "text-gold-300 hover:text-ink hover:underline underline-offset-4",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const disabled = props.href === undefined && props.disabled;
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-[8px] px-6 font-text font-bold transition-[background-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300",
    size === "md" ? "h-12" : "h-14",
    disabled
      ? "bg-surface-hover text-ink-disabled cursor-not-allowed"
      : variants[variant],
    className,
  ].join(" ");
  const content = (
    <>
      {children}
      {variant === "text" && <span aria-hidden="true">→</span>}
    </>
  );

  if (props.href !== undefined) {
    return <Link {...props} className={classes}>{content}</Link>;
  }

  return <button type="button" {...props} className={classes}>{content}</button>;
}
