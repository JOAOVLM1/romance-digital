import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Presente, ConfigMap } from "@/lib/wedding/queries";

function brl(n: number | null) {
  if (n == null) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GiftsSection({ presentes, config }: { presentes: Presente[]; config: ConfigMap }) {
  const [open, setOpen] = useState<Presente | null>(null);
  const pixKey = config.pix_chave || "";
  const pixMsg =
    config.pix_mensagem ||
    "Após realizar o PIX, entre em contato conosco para confirmar o presente!";

  const copyPix = async () => {
    if (!pixKey) return toast.error("Chave PIX ainda não configurada");
    try {
      await navigator.clipboard.writeText(pixKey);
      toast.success("Chave PIX copiada!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <section id="presentes" className="py-24 md:py-32 px-6 bg-rose/5 border-y border-charcoal/5">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-16">
          <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage mb-4">Capítulo IV</p>
          <h2 className="serif text-4xl md:text-5xl italic text-charcoal mb-4">
            Lista de Presentes
          </h2>
          <p className="text-charcoal/60 text-sm max-w-md mx-auto text-pretty">
            Sua presença é o maior presente. Se desejar nos presentear, criamos esta lista com
            carinho.
          </p>
        </header>

        {presentes.length === 0 ? (
          <p className="text-center text-muted-foreground">Em breve…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {presentes.map((p) => {
              const taken = p.status === "presenteado";
              return (
                <article
                  key={p.id}
                  className={`bg-card border border-charcoal/5 p-5 flex flex-col ${
                    taken ? "opacity-60" : ""
                  }`}
                >
                  <div className="aspect-square bg-sage/5 mb-5 overflow-hidden grid place-items-center">
                    {p.foto_url ? (
                      <img
                        src={p.foto_url}
                        alt={p.nome}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <svg viewBox="0 0 60 60" className="w-16 text-sage/40" fill="none" stroke="currentColor" strokeWidth="0.6">
                        <rect x="12" y="22" width="36" height="30" />
                        <path d="M12,30 L48,30" />
                        <path d="M30,22 L30,52" />
                        <path d="M20,22 C20,14 25,12 30,18 C35,12 40,14 40,22" />
                      </svg>
                    )}
                  </div>
                  <h3 className="serif text-xl text-charcoal mb-1">{p.nome}</h3>
                  <p
                    className={`mono text-[10px] uppercase tracking-widest mb-3 ${
                      taken ? "text-rose" : "text-sage"
                    }`}
                  >
                    {taken ? "Já presenteado" : "Disponível"}
                  </p>
                  {p.descricao && (
                    <p className="text-sm text-charcoal/60 flex-grow mb-5 text-pretty">
                      {p.descricao}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-auto">
                    <span className="serif text-lg text-charcoal">{brl(p.preco)}</span>
                    {taken ? (
                      <span className="mono text-[9px] uppercase tracking-widest text-charcoal/40">
                        Obrigado!
                      </span>
                    ) : (
                      <button
                        onClick={() => setOpen(p)}
                        className="px-4 py-2 bg-charcoal text-ivory text-[10px] uppercase tracking-widest font-medium hover:bg-rose transition-colors duration-500"
                      >
                        Presentear
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md bg-ivory border-charcoal/10">
          <DialogHeader>
            <DialogTitle className="serif text-2xl italic text-charcoal text-center">
              {open?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2 text-center">
            {open?.preco != null && (
              <p className="mono text-[10px] uppercase tracking-widest text-sage">
                Valor sugerido: {brl(open.preco)}
              </p>
            )}
            <div className="bg-sage/5 border border-charcoal/10 p-5 space-y-3">
              <p className="mono text-[10px] uppercase tracking-widest text-charcoal/60">
                Chave PIX
              </p>
              <p className="serif text-base text-charcoal break-all px-2">
                {pixKey || "(chave não configurada pelos noivos)"}
              </p>
              <button
                onClick={copyPix}
                disabled={!pixKey}
                className="w-full py-3 bg-charcoal text-ivory text-xs uppercase tracking-widest hover:bg-rose transition-colors duration-500 disabled:opacity-50"
              >
                Copiar chave PIX
              </button>
            </div>
            <p className="text-sm text-charcoal/70 italic text-pretty">{pixMsg}</p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
