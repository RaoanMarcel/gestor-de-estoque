import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, className, id, required, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
          >
            {label.replace(/\s*\*\s*$/, "")}
            {(required || /\*\s*$/.test(label)) && (
              <span className="text-blue-600">*</span>
            )}
          </label>
        )}

        <div
          className={clsx(
            "group flex items-center rounded-lg border bg-white transition-all duration-200",
            "shadow-[inset_0_1px_0_rgba(15,23,42,0.02)]",
            error
              ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_8px_24px_-12px_rgba(239,68,68,0.35)]"
              : "border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 focus-within:shadow-[0_0_0_1px_rgba(37,99,235,0.15),0_8px_24px_-12px_rgba(37,99,235,0.3)]"
          )}
        >
          {leftIcon && (
            <div className="pl-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors [&>svg]:h-4 [&>svg]:w-4">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            className={clsx(
              "w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
              "font-normal caret-blue-600",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="pr-3.5 text-slate-400 group-focus-within:text-slate-600 transition-colors [&>svg]:h-4 [&>svg]:w-4">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
            <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
            {error}
          </p>
        ) : (
          hint && <p className="text-[11px] text-slate-500 leading-relaxed">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
