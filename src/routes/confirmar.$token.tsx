import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  configQuery,
  convidadoByTokenQuery,
  type Convidado,
  type ExpectedAttendee,
} from "@/lib/wedding/queries";

export const Route = createFileRoute("/confirmar/$token")({
  head: () => ({
    meta: [
      { title: "Confirmar Presença" },
      { name: "description", content: "Confirme sua presença no nosso casamento." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="serif italic text-2xl text-charcoal mb-2">Algo deu errado</p>
        <p className="text-sm text-charcoal/60">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="serif italic text-2xl text-charcoal">Convite não encontrado</p>
    </div>
  ),
  component: ConfirmarPage,
});

type Decision = "yes" | "no" | null;
type Slot = { id: string; name: string; decision: Decision; preset: boolean };

function ConfirmarPage() {
  const { token } = Route.useParams();
  const convidadoQ = useQuery(convidadoByTokenQuery(token));
  const configQ = useQuery(configQuery);

  if (convidadoQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="mono text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
          Carregando seu convite...
        </p>
      </div>
    );
  }

  if (!convidadoQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="serif italic text-3xl text-charcoal mb-2">Convite não encontrado</p>
          <p className="text-sm text-charcoal/60 mb-6">
            O link parece estar incorreto. Entre em contato com os noivos.
          </p>
          <Link to="/" className="mono text-[10px] uppercase tracking-widest underline">
            Ir para o site
          </Link>
        </div>
      </div>
    );
  }

  return <ConvitePersonalizado convidado={convidadoQ.data} config={configQ.data ?? {}} />;
}

function ConvitePersonalizado({
  convidado,
  config,
}: {
  convidado: Convidado;
  config: Record<string, string>;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const max = convidado.lugares;
  const expected = convidado.expected_attendees || [];

  const [slots, setSlots] = useState<Slot[]>(() => buildInitialSlots(convidado));
  const [mensagem, setMensagem] = useState(convidado.mensagem || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [declined, setDeclined] = useState(convidado.rsvp_status === "recusado");
  const [done, setDone] = useState(convidado.rsvp_status !== "pendente");

  useEffect(() => {
    setSlots(buildInitialSlots(convidado));
    setDeclined(convidado.rsvp_status === "recusado");
    setDone(convidado.rsvp_status !== "pendente");
  }, [convidado.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmados = slots.filter((s) => s.decision === "yes" && s.name.trim());
  const recusados = slots.filter((s) => s.decision === "no");
  const allDecided = slots.every((s) => s.decision !== null);
  const allDeclined = slots.length > 0 && slots.every((s) => s.decision === "no");

  const mutation = useMutation({
    mutationFn: async (payload: {
      status: "confirmado" | "recusado";
      nomes: string[];
      vagas: number;
    }) => {
      const { error } = await supabase
        .from("convidados")
        .update({
          rsvp_status: payload.status,
          vagas_confirmadas: payload.vagas,
          acompanhantes: payload.nomes,
          confirmado_em: new Date().toISOString(),
          mensagem: mensagem.trim() || null,
        } as any)
        .eq("rsvp_token", convidado.rsvp_token);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "confirmado"
          ? "Presença confirmada! 💍"
          : "Resposta registrada. Vamos sentir sua falta.",
      );
      qc.invalidateQueries({ queryKey: ["wedding", "convidado-token", convidado.rsvp_token] });
      router.invalidate();
      setDone(true);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  function setSlot(id: string, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function enviar() {
    const validos = confirmados.filter((s) => s.name.trim());
    if (validos.length !== confirmados.length) {
      toast.error("Preencha o nome de todos os confirmados.");
      return;
    }
    if (!allDecided) {
      toast.error("Marque a presença de cada convidado.");
      return;
    }
    if (validos.length > max) {
      toast.error(`Limite de ${max} pessoas para este convite.`);
      return;
    }
    const status = validos.length === 0 ? "recusado" : "confirmado";
    mutation.mutate({
      status,
      nomes: validos.map((s) => s.name.trim()),
      vagas: validos.length,
    });
  }

  function recusarTudo() {
    if (!confirm("Tem certeza? Marcaremos todos como ausentes.")) return;
    mutation.mutate({ status: "recusado", nomes: [], vagas: 0 });
    setDeclined(true);
  }

  const dataCasamento = config.data_casamento
    ? new Date(config.data_casamento).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  if (done) {
    return (
      <ConfirmacaoFinal
        convidado={convidado}
        config={config}
        confirmados={
          confirmados.length > 0
            ? confirmados.map((s) => s.name)
            : (convidado.acompanhantes || [])
        }
        recusados={recusados.map((s) => s.name).filter(Boolean)}
        declined={declined || convidado.rsvp_status === "recusado"}
        onReabrir={() => setDone(false)}
        dataCasamento={dataCasamento}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ivory py-12 md:py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage mb-3">
            Convite especial
          </p>
          <h1 className="serif text-4xl md:text-5xl italic text-charcoal mb-3">
            Olá! Encontramos seu convite 🎉
          </h1>
          <p className="text-sm text-charcoal/60">
            Este convite é para{" "}
            <strong className="text-charcoal">{convidado.nome}</strong>
            {" — "}até {max} {max === 1 ? "pessoa" : "pessoas"}.
          </p>
          {expected.length > 0 ? (
            <p className="text-sm text-charcoal/60 mt-2">
              Confirme abaixo a presença de cada convidado:
            </p>
          ) : (
            <p className="text-sm text-charcoal/60 mt-2">
              Adicione os nomes de quem irá comparecer:
            </p>
          )}
        </div>

        <div className="space-y-3 mb-8">
          {slots.map((slot, idx) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              index={idx}
              editing={editingId === slot.id}
              setEditing={(v) => setEditingId(v ? slot.id : null)}
              onChange={(patch) => setSlot(slot.id, patch)}
            />
          ))}
        </div>

        <div className="border-t border-charcoal/10 pt-6 mb-6">
          <label className="mono text-[10px] uppercase tracking-widest text-charcoal/60 block mb-2">
            Deixe um recado para os noivos (opcional)
          </label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border border-charcoal/10 bg-card p-3 text-sm font-sans focus:outline-none focus:border-rose resize-none"
            placeholder="Um recado especial..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={mutation.isPending || !allDecided}
            onClick={enviar}
            className="flex-1 py-4 bg-charcoal text-ivory text-xs uppercase tracking-widest hover:bg-rose transition-colors duration-500 disabled:opacity-40"
          >
            {mutation.isPending ? "Salvando..." : "Confirmar Respostas"}
          </button>
        </div>

        {allDeclined && allDecided && (
          <p className="text-xs text-rose text-center mt-4 italic">
            Todos foram marcados como ausentes. Ao confirmar, registraremos como recusado.
          </p>
        )}

        <div className="text-center mt-10">
          <button
            type="button"
            onClick={recusarTudo}
            className="text-xs text-charcoal/50 hover:text-rose underline"
          >
            Nenhum dos convidados deste convite poderá comparecer
          </button>
        </div>
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  index,
  editing,
  setEditing,
  onChange,
}: {
  slot: Slot;
  index: number;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onChange: (patch: Partial<Slot>) => void;
}) {
  const isNo = slot.decision === "no";
  const isYes = slot.decision === "yes";
  return (
    <div
      className={`border p-5 transition-all duration-300 bg-card ${
        isYes
          ? "border-sage/60 bg-sage/5"
          : isNo
            ? "border-charcoal/10 opacity-60"
            : "border-charcoal/15"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="size-9 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal/60">
          👤
        </span>
        <div className="flex-1 min-w-0">
          {slot.preset && !editing ? (
            <p
              className={`serif text-lg ${
                isNo ? "line-through text-charcoal/50" : "text-charcoal italic"
              }`}
            >
              {slot.name || `Convidado ${index + 1}`}
            </p>
          ) : (
            <input
              type="text"
              value={slot.name}
              onChange={(e) => onChange({ name: e.target.value })}
              onBlur={() => slot.preset && setEditing(false)}
              placeholder={`Nome completo do convidado ${index + 1}`}
              className="w-full bg-transparent border-b border-charcoal/20 focus:outline-none focus:border-rose serif italic text-lg py-1"
              autoFocus={editing}
            />
          )}
          {slot.preset && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[10px] uppercase tracking-widest text-charcoal/40 hover:text-rose mt-1 mono"
            >
              editar nome
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ decision: "yes" })}
          className={`py-2 text-xs uppercase tracking-widest transition-colors ${
            isYes
              ? "bg-sage text-ivory"
              : "border border-charcoal/15 text-charcoal/70 hover:border-sage hover:text-sage"
          }`}
        >
          Vou comparecer
        </button>
        <button
          type="button"
          onClick={() => onChange({ decision: "no" })}
          className={`py-2 text-xs uppercase tracking-widest transition-colors ${
            isNo
              ? "bg-charcoal text-ivory"
              : "border border-charcoal/15 text-charcoal/70 hover:border-charcoal/40"
          }`}
        >
          Não poderei ir
        </button>
      </div>
    </div>
  );
}

function ConfirmacaoFinal({
  convidado,
  config,
  confirmados,
  recusados,
  declined,
  onReabrir,
  dataCasamento,
}: {
  convidado: Convidado;
  config: Record<string, string>;
  confirmados: string[];
  recusados: string[];
  declined: boolean;
  onReabrir: () => void;
  dataCasamento: string | null;
}) {
  return (
    <div className="min-h-screen bg-ivory py-16 md:py-24 px-4">
      <div className="max-w-xl mx-auto border border-charcoal/10 bg-card p-8 md:p-12 text-center relative">
        <div className="absolute top-3 left-3 size-8 border-t border-l border-gold/50" />
        <div className="absolute top-3 right-3 size-8 border-t border-r border-gold/50" />
        <div className="absolute bottom-3 left-3 size-8 border-b border-l border-gold/50" />
        <div className="absolute bottom-3 right-3 size-8 border-b border-r border-gold/50" />

        <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage mb-3">
          Confirmação recebida
        </p>
        <h1 className="serif text-4xl italic text-charcoal mb-2">
          {declined ? "Vamos sentir sua falta" : "Mal podemos esperar!"} 💍
        </h1>
        <p className="serif italic text-xl text-rose mb-8">{convidado.nome}</p>

        {confirmados.length > 0 && (
          <div className="text-left mb-6">
            <p className="mono text-[10px] uppercase tracking-widest text-sage mb-2">
              ✅ Confirmados ({confirmados.length}{" "}
              {confirmados.length === 1 ? "pessoa" : "pessoas"})
            </p>
            <ul className="space-y-1">
              {confirmados.map((n, i) => (
                <li key={i} className="serif italic text-lg text-charcoal">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recusados.length > 0 && (
          <div className="text-left mb-6">
            <p className="mono text-[10px] uppercase tracking-widest text-charcoal/50 mb-2">
              ❌ Não poderão comparecer
            </p>
            <ul className="space-y-1">
              {recusados.map((n, i) => (
                <li key={i} className="serif italic text-charcoal/60 line-through">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!declined && (dataCasamento || config.local_cerimonia) && (
          <div className="border-t border-charcoal/10 pt-5 mb-6 text-sm text-charcoal/70 space-y-1">
            {dataCasamento && <p>Nos vemos em {dataCasamento}!</p>}
            {config.local_cerimonia && <p className="italic">{config.local_cerimonia}</p>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!declined && (
            <Link
              to="/"
              hash="presentes"
              className="py-3 px-6 bg-charcoal text-ivory text-xs uppercase tracking-widest hover:bg-rose transition-colors duration-500"
            >
              Ver Lista de Presentes
            </Link>
          )}
          <button
            type="button"
            onClick={onReabrir}
            className="py-3 px-6 border border-charcoal/15 text-xs uppercase tracking-widest hover:bg-charcoal/5 transition-colors"
          >
            Editar resposta
          </button>
        </div>
      </div>
    </div>
  );
}

function buildInitialSlots(c: Convidado): Slot[] {
  const expected = (c.expected_attendees || []) as ExpectedAttendee[];
  const acomp = c.acompanhantes || [];
  const isDone = c.rsvp_status !== "pendente";

  if (expected.length > 0) {
    const slots: Slot[] = expected.map((e) => ({
      id: e.id,
      name: e.name || "",
      decision: isDone
        ? acomp.includes(e.name)
          ? "yes"
          : c.rsvp_status === "recusado"
            ? "no"
            : null
        : null,
      preset: !!e.name?.trim(),
    }));
    // Pad remaining slots up to lugares
    while (slots.length < c.lugares) {
      slots.push({
        id: `extra-${slots.length}`,
        name: "",
        decision: null,
        preset: false,
      });
    }
    return slots;
  }

  // Scenario C: no pre-registered, render lugares empty slots (or restore from acompanhantes if done)
  const slots: Slot[] = [];
  for (let i = 0; i < c.lugares; i++) {
    const presetName = acomp[i] || "";
    slots.push({
      id: `slot-${i}`,
      name: presetName,
      decision: isDone
        ? presetName
          ? "yes"
          : c.rsvp_status === "recusado"
            ? "no"
            : null
        : null,
      preset: false,
    });
  }
  return slots;
}
