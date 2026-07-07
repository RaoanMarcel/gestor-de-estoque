import { type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "relative inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:translate-y-[0.5px] select-none";

  const variants = {
    primary:
      "bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white ring-1 ring-inset ring-blue-400/50 shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] focus-visible:ring-blue-500",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-slate-300 shadow-sm focus-visible:ring-slate-400",
    success:
      "bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white ring-1 ring-inset ring-emerald-400/50 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] focus-visible:ring-emerald-500",
    danger:
      "bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white ring-1 ring-inset ring-red-400/50 shadow-[0_4px_14px_-4px_rgba(239,68,68,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] focus-visible:ring-red-500",
    ghost:
      "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400",
  };

  const sizes = {
    sm: "h-9 px-3.5 text-xs",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-6 text-sm",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(baseClasses, variants[variant], sizes[size], fullWidth && "w-full", className)}
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25" />
            <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="tracking-wide">Processando</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
