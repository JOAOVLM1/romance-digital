import type { ConfigMap } from "@/lib/wedding/queries";

export function InfoSection({ config }: { config: ConfigMap }) {
  const mapa = config.cerimonia_mapa;

  const blocks = [
    {
      tag: "Cerimônia",
      title: config.cerimonia_local || "—",
      lines: [
        config.cerimonia_horario && `${config.cerimonia_horario}h`,
        config.cerimonia_endereco,
      ].filter(Boolean) as string[],
    },
    {
      tag: "Recepção",
      title: config.recepcao_local || "—",
      lines: [
        config.recepcao_horario && `${config.recepcao_horario}h`,
        config.recepcao_endereco,
      ].filter(Boolean) as string[],
    },
    {
      tag: "Traje",
      title: config.traje || "—",
      lines: [config.notas_adicionais].filter(Boolean) as string[],
    },
  ];

  return (
    <section id="info" className="bg-sage/5 py-24 md:py-32 px-6 border-y border-charcoal/5">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-16">
          <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage mb-4">Capítulo II</p>
          <h2 className="serif text-4xl md:text-5xl italic text-charcoal">Informações</h2>
        </header>

        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          {blocks.map((b) => (
            <div key={b.tag} className="space-y-4">
              <p className="mono text-[10px] uppercase tracking-widest text-rose">{b.tag}</p>
              <h4 className="serif text-2xl text-charcoal">{b.title}</h4>
              {b.lines.map((l, i) => (
                <p key={i} className="text-sm text-charcoal/70 leading-relaxed text-pretty">{l}</p>
              ))}
            </div>
          ))}
        </div>

        {mapa && (
          <div className="mt-16 max-w-4xl mx-auto">
            <p className="mono text-[10px] uppercase tracking-widest text-sage mb-4 text-center">
              Como chegar
            </p>
            <div className="aspect-video w-full overflow-hidden rounded-sm border border-charcoal/10">
              <iframe
                src={<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3842.5439410417903!2d-56.0456211!3d-15.615996899999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x939db10322743d35%3A0x86060229f73aecbf!2sVivans%20Complexo%20de%20Eventos!5e0!3m2!1spt-BR!2sbr!4v1781874854125!5m2!1spt-BR!2sbr" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa do local"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
