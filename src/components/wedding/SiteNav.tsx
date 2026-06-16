import { useEffect, useState } from "react";

const sections = [
  { id: "home", label: "Início" },
  { id: "historia", label: "Nossa História" },
  { id: "info", label: "Informações" },
  { id: "rsvp", label: "Confirmar Presença" },
  { id: "presentes", label: "Presentes" },
  { id: "galeria", label: "Galeria" },
];

export function SiteNav({ dateLabel, venue }: { dateLabel: string; venue: string }) {
  const [active, setActive] = useState("home");

  useEffect(() => {
    const onScroll = () => {
      const offset = window.innerHeight / 3;
      for (const s of [...sections].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= offset) {
          setActive(s.id);
          return;
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed left-0 top-0 h-full w-14 md:w-24 border-r border-charcoal/5 flex flex-col items-center justify-between py-8 md:py-12 z-50 bg-ivory"
    >
      <span className="mono text-[9px] md:text-[10px] uppercase tracking-widest -rotate-90 origin-center whitespace-nowrap text-charcoal">
        {dateLabel}
      </span>
      <div className="space-y-4 md:space-y-6 flex flex-col items-center">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-label={s.label}
            title={s.label}
            className={`block size-2 rounded-full transition-all ${
              active === s.id ? "bg-rose scale-125" : "border border-charcoal/25"
            }`}
          />
        ))}
      </div>
      <span className="mono text-[9px] md:text-[10px] uppercase tracking-widest rotate-90 origin-center whitespace-nowrap text-charcoal max-w-[1rem]">
        {venue}
      </span>
    </nav>
  );
}
