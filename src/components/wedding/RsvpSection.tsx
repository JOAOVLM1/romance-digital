import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convidadosQuery, type Convidado, type ConfigMap } from "@/lib/wedding/queries";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

type Modo = "search" | "form" | "done";

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
  const [vagas, setVagas] = useState(1);
  const [nomes, setNomes] = useState<string[]>([""]);
  const [intencao, setIntencao] = useState<"confirmar" | "recusar" | null>(null);
  const [modo, setModo] = useState<Modo>("search");
  const qc = useQueryClient();

  const prazo = config.rsvp_prazo ? new Date(config.rsvp_prazo) : null;
  const expirado = !!prazo && prazo.getTime() < Date.now();

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = normalize(query);
    return convidados.filter((c) => normalize(c.nome).includes(q)).slice(0, 6);
  }, [query, convidados]);

  // sync nomes length with vagas
  useEffect(() => {
    setNomes((prev) => {
      const next = [...prev];
      while (next.length < vagas) next.push("");
      next.length = vagas;
      return next;
    });
  }, [vagas]);

  function escolher(c: Convidado) {
    setSelected(c);
    setMensagem(c.mensagem || "");
    if (c.rsvp_status !== "pendente") {
      setModo("done");
      setIntencao(c.rsvp_status === "confirmado" ? "confirmar" : "recusar");
      setVagas(c.vagas_confirmadas || 0);
      setNomes(Array.isArray(c.acompanhantes) ? c.acompanhantes : []);
    } else {
      setModo("form");
      setIntencao(null);
      setVagas(Math.min(1, c.lugares));
      setNomes([c.nome]);
    }
  }

  function resetar() {
    setSelected(null);
    setQuery("");
    setMensagem("");
    setIntencao(null);
    setVagas(1);
    setNomes([""]);
    setModo("search");
  }

  const mutate = useMutation({
    mutationFn: async () => {
      if (!selected || !intencao) return;
      if (intencao === "confirmar") {
        if (vagas < 1 || vagas > selected.lugares) {
          throw new Error(`Seu convite permite no máximo ${selected.lugares} pessoa(s).`);
        }
        const limpos = nomes.map((n) => n.trim()).filter(Boolean);
        if (limpos.length !== vagas) {
          throw new Error("Preencha o nome de todos os convidados.");
        }
        const { error } = await supabase
          .from("convidados")
          .update({
            rsvp_status: "confirmado",
            vagas_confirmadas: vagas,
            acompanhantes: limpos,
            confirmado_em: new Date().toISOString(),
            mensagem: mensagem || null,
          } as any)
          .eq("id", selected.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("convidados")
          .update({
            rsvp_status: "recusado",
            vagas_confirmadas: 0,
            acompanhantes: [],
            confirmado_em: new Date().toISOString(),
            mensagem: mensagem || null,
          } as any)
          .eq("id", selected.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        intencao === "confirmar"
          ? "Presença confirmada — mal podemos esperar!"
          : "Resposta registrada. Vamos sentir sua falta.",
      );
      qc.invalidateQueries({ queryKey: convidadosQuery.queryKey });
      setModo("done");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  return (
    <section id="rsvp" className="py-24 md:py-32 px-6">
      <div className="max-w-xl mx-auto border border-charcoal/10 p-8 md:p-14 text-center relative bg-card">
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
        ) : modo === "done" && selected ? (
          <ConfirmacaoCard
            selected={selected}
            intencao={intencao}
            nomes={nomes}
            config={config}
            onVoltar={resetar}
          />
        ) : modo === "form" && selected ? (
          <FormConvite
            selected={selected}
            intencao={intencao}
            setIntencao={setIntencao}
            vagas={vagas}
            setVagas={setVagas}
            nomes={nomes}
            setNomes={setNomes}
            mensagem={mensagem}
            setMensagem={setMensagem}
            onCancelar={resetar}
            onEnviar={() => mutate.mutate()}
            enviando={mutate.isPending}
          />
        ) : (
          <Busca
            query={query}
            setQuery={setQuery}
            matches={matches}
            escolher={escolher}
          />
        )}
      </div>
    </section>
  );
}

function Busca({
  query,
  setQuery,
  matches,
  escolher,
}: {
  query: string;
  setQuery: (s: string) => void;
  matches: Convidado[];
  escolher: (c: Convidado) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="border-b border-charcoal/10 pb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite seu nome ou código"
          className="w-full bg-transparent outline-none text-center font-serif text-xl italic placeholder:text-charcoal/25"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="space-y-2 text-left">
          {matches.length === 0 ? (
            <div className="p-4 bg-sage/5 border border-sage/20 rounded-sm text-sm text-charcoal/70 text-center">
              Seu nome não foi encontrado na lista. Entre em contato com os noivos.
            </div>
          ) : (
            matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => escolher(c)}
                className="w-full text-left p-3 border border-charcoal/10 hover:border-rose hover:bg-rose/5 transition-colors flex justify-between items-center"
              >
                <div>
                  <p className="serif italic text-lg">{c.nome}</p>
                  <p className="mono text-[9px] uppercase tracking-widest text-charcoal/40 mt-0.5">
                    Convite para {c.lugares} {c.lugares === 1 ? "pessoa" : "pessoas"}
                  </p>
                </div>
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
  );
}

function FormConvite({
  selected,
  intencao,
  setIntencao,
  vagas,
  setVagas,
  nomes,
  setNomes,
  mensagem,
  setMensagem,
  onCancelar,
  onEnviar,
  enviando,
}: {
  selected: Convidado;
  intencao: "confirmar" | "recusar" | null;
  setIntencao: (i: "confirmar" | "recusar" | null) => void;
  vagas: number;
  setVagas: (n: number) => void;
  nomes: string[];
  setNomes: (n: string[]) => void;
  mensagem: string;
  setMensagem: (s: string) => void;
  onCancelar: () => void;
  onEnviar: () => void;
  enviando: boolean;
}) {
  const max = selected.lugares;
  const singular = max === 1;
  const preenchidos = nomes.filter((n) => n.trim()).length;

  return (
    <div className="space-y-6 text-left">
      <div className="text-center pb-4 border-b border-charcoal/10">
        <p className="mono text-[10px] uppercase tracking-widest text-sage mb-1">Olá</p>
        <p className="serif text-2xl italic text-charcoal">{selected.nome}</p>
        <p className="text-xs text-charcoal/60 mt-2">
          Seu convite é para até <strong className="text-charcoal">{max}</strong>{" "}
          {singular ? "pessoa" : "pessoas"}.
        </p>
      </div>

      {!intencao && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setIntencao("confirmar");
              setVagas(singular ? 1 : 1);
              setNomes(singular ? [selected.nome] : [selected.nome]);
            }}
            className="py-4 bg-charcoal text-ivory text-xs uppercase tracking-widest hover:bg-rose transition-colors duration-500"
          >
            Sim, vou comparecer
          </button>
          <button
            type="button"
            onClick={() => setIntencao("recusar")}
            className="py-4 border border-charcoal/15 text-xs uppercase tracking-widest hover:bg-charcoal/5 transition-colors"
          >
            Não poderei comparecer
          </button>
        </div>
      )}

      {intencao === "confirmar" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
          {!singular && (
            <div>
              <label className="mono text-[10px] uppercase tracking-widest text-charcoal/60 block mb-3">
                Quantas pessoas irão comparecer?
              </label>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => setVagas(Math.max(1, vagas - 1))}
                  disabled={vagas <= 1}
                  className="size-10 border border-charcoal/20 text-xl hover:border-rose hover:text-rose transition-colors disabled:opacity-30"
                >
                  −
                </button>
                <span
                  key={vagas}
                  className="serif italic text-4xl text-charcoal min-w-[2ch] text-center animate-in zoom-in-50 duration-200"
                >
                  {vagas}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (vagas >= max) {
                      toast.error(`Seu convite permite no máximo ${max} pessoa(s).`);
                      return;
                    }
                    setVagas(vagas + 1);
                  }}
                  className="size-10 border border-charcoal/20 text-xl hover:border-rose hover:text-rose transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-center text-[11px] text-charcoal/40 mt-2 mono uppercase tracking-widest">
                {preenchidos} de {vagas} vagas preenchidas
              </p>
            </div>
          )}

          <div className="space-y-2">
            {nomes.map((n, i) => (
              <div
                key={i}
                className="animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <label className="mono text-[9px] uppercase tracking-widest text-charcoal/50 block mb-1">
                  Nome do convidado {i + 1}
                </label>
                <input
                  type="text"
                  value={n}
                  onChange={(e) => {
                    const copy = [...nomes];
                    copy[i] = e.target.value;
                    setNomes(copy);
                  }}
                  placeholder="Nome completo"
                  className="w-full border border-charcoal/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-rose"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {intencao === "recusar" && (
        <p className="text-center text-sm text-charcoal/70 italic serif animate-in fade-in duration-300">
          Tem certeza que não poderá comparecer?
        </p>
      )}

      {intencao && (
        <div className="space-y-4">
          <div>
            <label className="mono text-[10px] uppercase tracking-widest text-charcoal/60 block mb-2">
              Deixe um recado para os noivos (opcional)
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full border border-charcoal/10 bg-transparent p-3 text-sm font-sans focus:outline-none focus:border-rose resize-none"
              placeholder="Um recado especial..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIntencao(null)}
              className="py-3 border border-charcoal/15 text-xs uppercase tracking-widest hover:bg-charcoal/5 transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={onEnviar}
              className="py-3 bg-charcoal text-ivory text-xs uppercase tracking-widest hover:bg-rose transition-colors duration-500 disabled:opacity-50"
            >
              {enviando
                ? "Salvando..."
                : intencao === "confirmar"
                  ? "Confirmar Presença"
                  : "Confirmar Ausência"}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onCancelar}
        className="text-xs text-charcoal/40 hover:text-charcoal underline mx-auto block"
      >
        buscar outro convite
      </button>
    </div>
  );
}

function ConfirmacaoCard({
  selected,
  intencao,
  nomes,
  config,
  onVoltar,
}: {
  selected: Convidado;
  intencao: "confirmar" | "recusar" | null;
  nomes: string[];
  config: ConfigMap;
  onVoltar: () => void;
}) {
  const isConfirm = intencao === "confirmar" || selected.rsvp_status === "confirmado";
  const data = config.data_casamento
    ? new Date(config.data_casamento).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center">
        <p className="mono text-[10px] uppercase tracking-widest text-sage mb-2">
          {isConfirm ? "Presença confirmada" : "Resposta registrada"}
        </p>
        <p className="serif italic text-3xl text-charcoal">
          {isConfirm ? "Até logo," : "Vamos sentir sua falta,"}
        </p>
        <p className="serif italic text-2xl text-rose mt-1">{selected.nome}!</p>
      </div>

      {isConfirm && nomes.length > 0 && (
        <div className="border-t border-b border-charcoal/10 py-4">
          <p className="mono text-[10px] uppercase tracking-widest text-charcoal/50 text-center mb-3">
            Convidados confirmados
          </p>
          <ul className="space-y-1 text-center">
            {nomes.map((n, i) => (
              <li key={i} className="serif italic text-lg text-charcoal">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isConfirm && (data || config.local_cerimonia) && (
        <div className="text-center text-sm text-charcoal/70 space-y-1">
          {data && <p>{data}</p>}
          {config.local_cerimonia && <p className="italic">{config.local_cerimonia}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isConfirm && (
          <a
            href="#presentes"
            className="py-3 px-6 bg-charcoal text-ivory text-xs uppercase tracking-widest hover:bg-rose transition-colors duration-500 text-center"
          >
            Ver Lista de Presentes
          </a>
        )}
        <button
          type="button"
          onClick={onVoltar}
          className="py-3 px-6 border border-charcoal/15 text-xs uppercase tracking-widest hover:bg-charcoal/5 transition-colors"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
