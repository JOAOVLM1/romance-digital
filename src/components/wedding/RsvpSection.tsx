import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convidadosQuery, type Convidado, type ConfigMap } from "@/lib/wedding/queries";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function RsvpSection({
  convidados,
  config,
}: {
  convidados: Convidado[];
  config: ConfigMap;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Convidado | null>(null);
  const [mensagem, setMensagem] = useState("");
  const qc = useQueryClient();

  const prazo = config.rsvp_prazo ? new Date(config.rsvp_prazo) : null;
  const expirado = !!prazo && prazo.getTime() < Date.now();

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = normalize(query);
    return convidados.filter((c) => normalize(c.nome).includes(q)).slice(0, 6);
  }, [query, convidados]);

  const mutate = useMutation({
    mutationFn: async (status: "confirmado" | "recusado") => {
      if (!selected) return;
      const { error } = await supabase
        .from("convidados")
        .update({
          rsvp_status: status,
          confirmado_em: new Date().toISOString(),
          mensagem: mensagem || null,
        })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      toast.success(
        status === "confirmado"
          ? "Confirmação salva — mal podemos esperar!"
          : "Resposta registrada. Vamos sentir sua falta.",
      );
      qc.invalidateQueries({ queryKey: convidadosQuery.queryKey });
      setSelected(null);
      setQuery("");
      setMensagem("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  return (
    <section id="rsvp" className="py-24 md:py-32 px-6">
      <div className="max-w-xl mx-auto border border-charcoal/10 p-10 md:p-16 text-center relative bg-card">
        <div className="absolute top-3 left-3 size-8 border-t border-l border-gold/50" />
        <div className="absolute top-3 right-3 size-8 border-t border-r border-gold/50" />
        <div className="absolute bottom-3 left-3 size-8 border-b border-l border-gold/50" />
        <div className="absolute bottom-3 right-3 size-8 border-b border-r border-gold/50" />

        <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage mb-4">Capítulo III</p>
        <h2 className="serif text-4xl md:text-5xl italic text-charcoal mb-4">
          Confirmar Presença
        </h2>
        {prazo && (
          <p className="text-sm text-charcoal/50 mb-10">
            Por favor, confirme até{" "}
            {prazo.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </p>
        )}

        {expirado ? (
          <div className="mt-8 p-6 bg-sage/5 border border-sage/20 rounded-sm">
            <p className="serif italic text-lg text-charcoal">
              O prazo para confirmação encerrou.
            </p>
            <p className="text-sm text-charcoal/60 mt-2">
              Entre em contato diretamente com os noivos.
            </p>
          </div>
        ) : selected ? (
          <div className="space-y-6 text-left">
            <div className="text-center pb-4 border-b border-charcoal/10">
              <p className="mono text-[10px] uppercase tracking-widest text-sage mb-1">
                Você é
              </p>
              <p className="serif text-2xl italic text-charcoal">{selected.nome}</p>
              <p className="text-xs text-charcoal/50 mt-1">
                {selected.lugares} {selected.lugares === 1 ? "lugar" : "lugares"} reservado
                {selected.lugares === 1 ? "" : "s"}
              </p>
            </div>

            <div>
              <label className="mono text-[10px] uppercase tracking-widest text-charcoal/60 block mb-2">
                Mensagem para os noivos (opcional)
              </label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full border border-charcoal/10 bg-transparent p-3 text-sm font-sans focus:outline-none focus:border-rose resize-none"
                placeholder="Deixe um recado..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={mutate.isPending}
                onClick={() => mutate.mutate("recusado")}
                className="py-3 border border-charcoal/15 text-xs uppercase tracking-widest hover:bg-charcoal/5 transition-colors disabled:opacity-50"
              >
                Não poderei
              </button>
              <button
                type="button"
                disabled={mutate.isPending}
                onClick={() => mutate.mutate("confirmado")}
                className="py-3 bg-charcoal text-ivory text-xs uppercase tracking-widest hover:bg-rose transition-colors duration-500 disabled:opacity-50"
              >
                {mutate.isPending ? "Salvando..." : "Sim, irei"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-charcoal/40 hover:text-charcoal underline"
            >
              voltar
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-b border-charcoal/10 pb-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite seu nome"
                className="w-full bg-transparent outline-none text-center font-serif text-xl italic placeholder:text-charcoal/25"
              />
            </div>

            {query.trim().length >= 2 && (
              <div className="space-y-2 text-left">
                {matches.length === 0 ? (
                  <div className="p-4 bg-sage/5 border border-sage/20 rounded-sm text-sm text-charcoal/70 text-center">
                    Não encontramos seu nome. Por favor, entre em contato com os noivos para
                    confirmar.
                  </div>
                ) : (
                  matches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelected(c);
                        setMensagem(c.mensagem || "");
                      }}
                      className="w-full text-left p-3 border border-charcoal/10 hover:border-rose hover:bg-rose/5 transition-colors flex justify-between items-center"
                    >
                      <span className="serif italic text-lg">{c.nome}</span>
                      <span className="mono text-[10px] uppercase tracking-widest text-charcoal/50">
                        {c.rsvp_status === "confirmado"
                          ? "Confirmado"
                          : c.rsvp_status === "recusado"
                            ? "Recusado"
                            : "Pendente"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
