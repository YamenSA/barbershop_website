import type { ComponentProps } from "react";

export type ContainerProps = ComponentProps<"div">;

export default function Container({ className = "", ...props }: ContainerProps) {
  return (
    <div
      {...props}
      className={`mx-auto w-full max-w-[1200px] px-4 md:px-8 ${className}`}
    />
  );
}
