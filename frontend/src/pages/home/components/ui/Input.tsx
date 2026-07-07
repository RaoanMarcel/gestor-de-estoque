import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}

        <div
          className={clsx(
            "flex items-center rounded-xl border bg-slate-900 transition-all duration-200",
            error
              ? "border-red-500 focus-within:ring-2 focus-within:ring-red-500/30"
              : "border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
          )}
        >
          {leftIcon && (
            <div className="pl-4 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={clsx(
              "w-full bg-transparent px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="pr-4 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-sm text-red-400">
            {error}
          </p>
        ) : (
          hint && (
            <p className="text-xs text-slate-500">
              {hint}
            </p>
          )
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;