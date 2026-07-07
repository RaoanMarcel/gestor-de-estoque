import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;

  hover?: boolean;

  clickable?: boolean;

  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  children,
  hover = false,
  clickable = false,
  padding = "md",
  className,
  ...props
}: CardProps) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      {...props}
      className={clsx(
        "rounded-2xl border border-slate-800 bg-slate-900 shadow-sm transition-all duration-200",

        hover &&
          "hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10",

        clickable && "cursor-pointer",

        paddings[padding],

        className
      )}
    >
      {children}
    </div>
  );
}
interface CardHeaderProps {
  children: ReactNode;
}

export function CardHeader({
  children,
}: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-center justify-between">
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
}

export function CardTitle({
  children,
}: CardTitleProps) {
  return (
    <h2 className="text-lg font-semibold text-slate-100">
      {children}
    </h2>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
}

export function CardDescription({
  children,
}: CardDescriptionProps) {
  return (
    <p className="text-sm text-slate-400">
      {children}
    </p>
  );
}

interface CardContentProps {
  children: ReactNode;
}

export function CardContent({
  children,
}: CardContentProps) {
  return <div>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
}

export function CardFooter({
  children,
}: CardFooterProps) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
      {children}
    </div>
  );
}