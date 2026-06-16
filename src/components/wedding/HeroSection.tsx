import { Countdown } from "./Countdown";
import type { ConfigMap } from "@/lib/wedding/queries";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function HeroSection({ config }: { config: ConfigMap }) {
  const noiva = config.nome_noiva || "Mariana";
  const noivo = config.nome_noivo || "Gabriel";
  const tagline = config.tagline || "Dois corações, uma história";
  const data = config.data_casamento;

  return (
    <section
      id="home"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center border-b border-charcoal/5 relative"
    >
      {/* Subtle botanical decoration */}
      <svg
        aria-hidden="true"
        className="absolute top-20 right-8 md:right-24 w-24 md:w-40 opacity-20 text-sage"
        viewBox="0 0 100 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      >
        <path d="M50,10 Q50,80 50,190" />
        <path d="M50,40 Q30,45 18,30" />
        <path d="M50,55 Q70,60 82,42" />
        <path d="M50,75 Q28,82 14,68" />
        <path d="M50,95 Q72,102 84,86" />
        <path d="M50,120 Q30,128 18,114" />
        <path d="M50,145 Q70,153 82,140" />
        <ellipse cx="22" cy="32" rx="6" ry="3" transform="rotate(-25 22 32)" />
        <ellipse cx="78" cy="44" rx="6" ry="3" transform="rotate(25 78 44)" />
        <ellipse cx="18" cy="70" rx="6" ry="3" transform="rotate(-25 18 70)" />
        <ellipse cx="80" cy="88" rx="6" ry="3" transform="rotate(25 80 88)" />
      </svg>

      <div className="wedding-reveal" style={{ animationDelay: "200ms" }}>
        <p className="mono text-[11px] uppercase tracking-[0.3em] text-sage mb-8">
          Convidamos para o casamento de
        </p>
        <h1 className="serif text-6xl md:text-8xl lg:text-9xl leading-[0.85] mb-10 italic text-charcoal">
          {noiva}
          <br />
          <span className="pl-10 md:pl-24 not-italic font-light">&</span>{" "}
          <span>{noivo}</span>
        </h1>
        <p className="serif text-xl md:text-2xl italic text-rose max-w-sm mx-auto mb-4">
          “{tagline}”
        </p>
        {data && (
          <p className="mono text-[10px] uppercase tracking-[0.3em] text-charcoal/60 mb-16">
            {formatDate(data)}
          </p>
        )}
      </div>

      {data && (
        <div className="wedding-reveal" style={{ animationDelay: "400ms" }}>
          <Countdown date={data} />
        </div>
      )}
    </section>
  );
}
