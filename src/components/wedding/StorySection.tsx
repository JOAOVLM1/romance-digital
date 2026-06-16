import { useEffect, useRef } from "react";
import type { Momento } from "@/lib/wedding/queries";

export function StorySection({ momentos }: { momentos: Momento[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("wedding-fade");
        });
      },
      { threshold: 0.15 },
    );
    ref.current?.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [momentos]);

  return (
    <section id="historia" className="max-w-4xl mx-auto py-24 md:py-32 px-6">
      <header className="text-center mb-20 md:mb-28">
        <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage mb-4">Capítulo I</p>
        <h2 className="serif text-4xl md:text-5xl italic text-charcoal">Nossa História</h2>
      </header>

      <div ref={ref} className="space-y-32 md:space-y-48">
        {momentos.length === 0 && (
          <p className="text-center text-muted-foreground">Em breve…</p>
        )}
        {momentos.map((m, i) => (
          <div
            key={m.id}
            data-reveal
            className="opacity-0 grid md:grid-cols-2 gap-10 md:gap-16 items-center"
          >
            <div className={i % 2 === 0 ? "" : "md:order-2"}>
              {m.foto_url ? (
                <img
                  src={m.foto_url}
                  alt={m.titulo}
                  className="w-full aspect-[4/5] object-cover rounded-sm grayscale-[20%]"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[4/5] bg-sage/5 border border-charcoal/5 rounded-sm grid place-items-center">
                  <svg viewBox="0 0 60 80" className="w-20 text-sage/40" fill="none" stroke="currentColor" strokeWidth="0.6">
                    <path d="M30,5 Q30,40 30,75" />
                    <path d="M30,20 Q15,25 8,12" />
                    <path d="M30,32 Q45,38 52,22" />
                    <path d="M30,48 Q15,55 6,42" />
                    <path d="M30,62 Q45,68 52,55" />
                  </svg>
                </div>
              )}
            </div>
            <div className={`space-y-5 ${i % 2 === 0 ? "" : "md:order-1 md:text-right"}`}>
              <p className="mono text-[10px] uppercase tracking-widest text-rose">
                {m.data_momento}
              </p>
              <h3 className="serif text-3xl md:text-4xl text-charcoal italic">{m.titulo}</h3>
              <p className="text-charcoal/70 leading-relaxed text-pretty">{m.descricao}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
