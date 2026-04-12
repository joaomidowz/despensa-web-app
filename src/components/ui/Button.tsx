import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isFullWidth?: boolean;
  rendered?: boolean;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-tertiary",
  secondary: "bg-card text-tertiary hover:bg-secondary",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-tertiary hover:bg-secondary",
  outline: "bg-transparent text-tertiary border border-border/30 hover:bg-secondary",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-12 px-5 text-sm",
  lg: "min-h-14 px-6 text-base",
};

export function Button({
  children,
  className = "",
  disabled,
  isFullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  rendered = true,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  if (!rendered) return null;

  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
        variantClassMap[variant],
        sizeClassMap[size],
        isFullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? <Spinner /> : leftIcon}
      <span>{isLoading ? "Carregando..." : children}</span>
      {!isLoading ? rightIcon : null}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}
