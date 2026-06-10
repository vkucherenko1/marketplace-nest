import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type IconButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
>;

export function IconButton({
  children,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
