import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function Card({
  children,
  className,
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={twMerge(
        "arc-card relative overflow-hidden group",
        noPadding ? "" : "p-8",
        className,
      )}
    >
      {/* Subtle Inner Glow on Hover */}
      <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
