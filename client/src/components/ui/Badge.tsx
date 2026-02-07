interface BadgeProps {
  active: boolean;
  text: string;
}

export function Badge({ active, text }: BadgeProps) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors duration-500 ${
        active
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : "bg-white/5 text-slate-500 border border-white/5"
      }`}
    >
      {text}
    </span>
  );
}
