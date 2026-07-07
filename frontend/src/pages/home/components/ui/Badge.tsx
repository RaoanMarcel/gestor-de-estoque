import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;

  variant?:
    | "default"
    | "success"
    | "danger"
    | "warning"
    | "info";

  size?: "sm" | "md";
}

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "bg-slate-800 text-slate-300 border border-slate-700",

    success:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",

    danger:
      "bg-red-500/10 text-red-400 border border-red-500/20",

    warning:
      "bg-amber-500/10 text-amber-400 border border-amber-500/20",

    info:
      "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      {...props}
      className={clsx(
        "inline-flex items-center rounded-full font-medium",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}