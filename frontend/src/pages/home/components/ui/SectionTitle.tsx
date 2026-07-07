import type { ReactNode } from "react";

interface SectionTitleProps {
  title: string;

  subtitle?: string;

  actions?: ReactNode;
}

export default function SectionTitle({
  title,
  subtitle,
  actions,
}: SectionTitleProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}