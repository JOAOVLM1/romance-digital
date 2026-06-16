import { useEffect, useState } from "react";

function diff(target: Date) {
  const now = new Date();
  const ms = Math.max(0, target.getTime() - now.getTime());
  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  const seg = Math.floor((ms % 60000) / 1000);
  return { dias, horas, min, seg };
}

export function Countdown({ date }: { date: string }) {
  const target = new Date(date);
  const [t, setT] = useState(() => diff(target));
  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [date]);

  const cell = (label: string, value: number) => (
    <div className="flex flex-col items-center">
      <span className="serif text-3xl md:text-4xl text-charcoal tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-2">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex gap-8 md:gap-14">
      {cell("dias", t.dias)}
      <span className="text-gold/50 self-center serif text-2xl">·</span>
      {cell("horas", t.horas)}
      <span className="text-gold/50 self-center serif text-2xl">·</span>
      {cell("min", t.min)}
      <span className="text-gold/50 self-center serif text-2xl hidden md:inline">·</span>
      <span className="hidden md:block">{cell("seg", t.seg)}</span>
    </div>
  );
}
