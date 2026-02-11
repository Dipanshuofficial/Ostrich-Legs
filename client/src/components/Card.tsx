import { type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "flat" | "elevated" | "glass";
}

export const Card = ({
  children,
  className,
  variant = "elevated",
}: CardProps) => {
  const variants = {
    flat: "bg-surface-white border border-border-soft",
    elevated: "soft-card",
    glass: "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg",
  };

  return <div className={cn(variants[variant], className)}>{children}</div>;
};
