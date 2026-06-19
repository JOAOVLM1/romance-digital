import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  convidadosQuery,
  type Convidado,
  type ExpectedAttendee,
} from "@/lib/wedding/queries";

type Filter = "todos" | "confirmado" | "pendente" | "recusado";

function genCodigo() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function rsvpUrl(token: string) {
  if (typeof window === "undefined") return `/confirmar/${token}`;
  return `${window.location.origin}/confirmar/${token}`;
}

function newAttendee(name = ""): ExpectedAttendee {
  return { id: crypto.randomUUID().slice(0, 8), name };
}

function ensureLength(list: ExpectedAttendee[], n: number): ExpectedAttendee[] {
  const out = [...list];
  while (out.length < n) out.push(newAttendee());
  out.length = n;
  return out;
}

export function AdminConvidados({ convidados }: { convidados: Convidado[] }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: convidadosQuery.queryKey });

  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [novo, setNovo] = useState<{
    nome: string;
    email: string;
    telefone: string;
    lugares: number;
    usarCodigo: boolean;
    expected: ExpectedAttendee[];
  }>({
    nome: "",
    email: "",
    telefone: "",
    lugares: 1,
    usarCodigo: false,
    expected: [newAttendee()],
  });

  const filtrados = useMemo(() => {
    let list = convidados;
    if (filter !== "todos") list = list.filter((c) => c.rsvp_status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.codigo_acesso || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [convidados, filter, search]);

  const add = useMutation({
    mutationFn: async () => {
      if (!novo.nome.trim()) throw new Error("Nome obrigatório");
      const expected = novo.expected
        .map((e) => ({ ...e, name: e.name.trim() }))
        .filter((e, i) => i < novo.lugares); // exact lugares-length, but keep blanks
      const { data, error } = await supabase
        .from("convidados")
        .insert({
          nome: novo.nome.trim(),
          email: novo.email || null,
          telefone: novo.telefone || null,
          lugares: Number(novo.lugares) || 1,
          codigo_acesso: novo.usarCodigo ? genCodigo() : null,
          expected_attendees: expected as any,
        } as any)
        .select("rsvp_token")
        .single();
      if (error) throw error;
      return data as { rsvp_token: string };
    },
    onSuccess: (data) => {
      toast.success("Convite criado");
      if (data?.rsvp_token) {
        const url = rsvpUrl(data.rsvp_token);
        navigator.clipboard?.writeText(url).catch(() => {});
        toast.message("Link copiado para a área de transferência", { description: url });
      }
      setNovo({
        nome: "",
        email: "",
        telefone: "",
        lugares: 1,
        usarCodigo: false,
        expected: [newAttendee()],
      });
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateConvidado = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("convidados").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetRsvp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("convidados")
        .update({
          rsvp_status: "pendente",
          vagas_confirmadas: 0,
          acompanhantes: [],
          confirmado_em: null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("RSVP resetado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const gerarCodigo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("convidados")
        .update({ codigo_acesso: genCodigo() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Código gerado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("convidados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite removido");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function setNovoLugares(n: number) {
    const safe = Math.max(1, Math.min(20, n || 1));
    setNovo((p) => ({ ...p, lugares: safe, expected: ensureLength(p.expected, safe) }));
  }

  const exportCSV = () => {
    const rows = [
      [
        "nome",
        "email",
        "telefone",
        "allowed_seats",
        "confirmed_seats",
        "attendees",
        "expected",
        "status",
        "confirmado_em",
        "rsvp_link",
        "codigo_acesso",
        "mensagem",
      ],
      ...convidados.map((c) => [
        c.nome,
        c.email || "",
        c.telefone || "",
        c.lugares,
        c.vagas_confirmadas,
        (c.acompanhantes || []).join(" | "),
        (c.expected_attendees || []).map((e) => e.name).filter(Boolean).join(" | "),
        c.rsvp_status,
        c.confirmado_em || "",
        rsvpUrl(c.rsvp_token),
        c.codigo_acesso || "",
        (c.mensagem || "").replace(/[\r\n,]/g, " "),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convidados.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copiar = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copiado!");
  };

  const stats = {
    convites: convidados.length,
    pendentes: convidados.filter((c) => c.rsvp_status === "pendente").length,
    confirmados: convidados.filter((c) => c.rsvp_status === "confirmado").length,
    recusados: convidados.filter((c) => c.rsvp_status === "recusado").length,
    totalVagas: convidados.reduce((s, c) => s + (c.lugares || 0), 0),
    vagasConfirmadas: convidados.reduce((s, c) => s + (c.vagas_confirmadas || 0), 0),
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          ["Convites", stats.convites],
          ["Vagas totais", stats.totalVagas],
          ["Vagas confirm.", stats.vagasConfirmadas],
          ["Pendentes", stats.pendentes],
          ["Confirmados", stats.confirmados],
          ["Recusados", stats.recusados],
        ].map(([label, value]) => (
          <div key={label as string} className="border border-charcoal/10 p-4 bg-card">
            <p className="mono text-[9px] uppercase tracking-widest text-charcoal/50">
              {label}
            </p>
            <p className="serif text-3xl text-charcoal mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="border border-charcoal/10 p-5 bg-card">
        <h3 className="serif italic text-xl text-charcoal mb-4">Novo convite</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mono text-[9px] uppercase tracking-widest text-charcoal/50">
              Nome do convite *
            </label>
            <input
              placeholder="Família Silva"
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              className="w-full border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
            />
          </div>
          <div>
            <label className="mono text-[9px] uppercase tracking-widest text-charcoal/50">
              Vagas permitidas
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={novo.lugares}
              onChange={(e) => setNovoLugares(Number(e.target.value))}
              className="w-full border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
            />
          </div>
          <div>
            <label className="mono text-[9px] uppercase tracking-widest text-charcoal/50">
              E-mail
            </label>
            <input
              placeholder="email@exemplo.com"
              type="email"
              value={novo.email}
              onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              className="w-full border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
            />
          </div>
          <div>
            <label className="mono text-[9px] uppercase tracking-widest text-charcoal/50">
              Telefone
            </label>
            <input
              placeholder="(00) 00000-0000"
              value={novo.telefone}
              onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
              className="w-full border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="mono text-[9px] uppercase tracking-widest text-charcoal/50">
            Convidados esperados (opcional)
          </p>
          <p className="text-[11px] text-charcoal/50 italic mt-1 mb-3">
            Pré-cadastre os nomes. Deixe em branco para que o convidado preencha na hora da
            confirmação.
          </p>
          <div className="space-y-2 transition-all">
            {novo.expected.map((att, i) => (
              <div
                key={att.id}
                className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200"
              >
                <span className="mono text-[10px] uppercase tracking-widest text-charcoal/40 w-24">
                  Convidado {i + 1}
                </span>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={att.name}
                  onChange={(e) => {
                    const copy = [...novo.expected];
                    copy[i] = { ...copy[i], name: e.target.value };
                    setNovo({ ...novo, expected: copy });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const next = document.querySelectorAll<HTMLInputElement>(
                        "[data-att-input]",
                      );
                      next[i + 1]?.focus();
                    }
                  }}
                  data-att-input
                  className="flex-1 border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-charcoal/70 cursor-pointer">
            <input
              type="checkbox"
              checked={novo.usarCodigo}
              onChange={(e) => setNovo({ ...novo, usarCodigo: e.target.checked })}
            />
            Gerar código de acesso único
          </label>
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending}
            className="bg-charcoal text-ivory mono text-[10px] uppercase tracking-widest hover:bg-rose transition-colors px-6 py-2 disabled:opacity-50"
          >
            {add.isPending ? "Criando..." : "Criar convite"}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="Buscar nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm w-56"
          />
          {(["todos", "pendente", "confirmado", "recusado"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`mono text-[10px] uppercase tracking-widest px-3 py-2 border ${
                filter === f
                  ? "border-rose text-rose"
                  : "border-charcoal/15 text-charcoal/60 hover:border-charcoal/40"
              }`}
            >
              {f === "todos"
                ? "Todos"
                : f === "confirmado"
                  ? "Confirmados"
                  : f === "pendente"
                    ? "Pendentes"
                    : "Recusados"}
            </button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          className="mono text-[10px] uppercase tracking-widest px-3 py-2 border border-charcoal/15 hover:border-charcoal/40"
        >
          Exportar CSV
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtrados.length === 0 && (
          <div className="text-center py-12 text-charcoal/40 border border-charcoal/10 bg-card">
            Nenhum convite encontrado.
          </div>
        )}
        {filtrados.map((c) => (
          <ConviteRow
            key={c.id}
            convidado={c}
            expanded={expandedId === c.id}
            onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            onCopy={copiar}
            onReset={() => resetRsvp.mutate(c.id)}
            onRemove={() => {
              if (confirm(`Remover ${c.nome}?`)) remove.mutate(c.id);
            }}
            onGenCodigo={() => gerarCodigo.mutate(c.id)}
            onUpdate={(patch) => updateConvidado.mutate({ id: c.id, patch })}
          />
        ))}
      </div>
    </div>
  );
}

function ConviteRow({
  convidado,
  expanded,
  onToggle,
  onCopy,
  onReset,
  onRemove,
  onGenCodigo,
  onUpdate,
}: {
  convidado: Convidado;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (s: string) => void;
  onReset: () => void;
  onRemove: () => void;
  onGenCodigo: () => void;
  onUpdate: (patch: any) => void;
}) {
  const link = rsvpUrl(convidado.rsvp_token);
  const [lugares, setLugares] = useState(convidado.lugares);
  const [expected, setExpected] = useState<ExpectedAttendee[]>(
    ensureLength(convidado.expected_attendees || [], convidado.lugares),
  );

  function whatsapp() {
    const msg = `Olá, ${convidado.nome}! 🎉\n\nVocê está convidado(a) para o nosso casamento!\nConfirme sua presença em: ${link}\n\nAguardamos vocês com carinho 💍`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function emailShare() {
    const subject = "Confirme sua presença no nosso casamento";
    const body = `Olá, ${convidado.nome}!\n\nConfirme sua presença em: ${link}`;
    window.location.href = `mailto:${convidado.email || ""}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  function salvarExpected() {
    onUpdate({
      lugares,
      expected_attendees: expected.slice(0, lugares).map((e) => ({
        id: e.id,
        name: e.name.trim(),
      })),
    });
  }

  return (
    <div className="border border-charcoal/10 bg-card">
      <div className="grid grid-cols-12 gap-3 items-center p-4">
        <div className="col-span-12 md:col-span-4">
          <p className="serif italic text-lg text-charcoal">{convidado.nome}</p>
          {(convidado.email || convidado.telefone) && (
            <p className="text-[11px] text-charcoal/50 mt-0.5">
              {[convidado.email, convidado.telefone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="col-span-4 md:col-span-2 text-center">
          <p className="mono text-[9px] uppercase tracking-widest text-charcoal/50">Vagas</p>
          <p className="serif text-xl">
            {convidado.vagas_confirmadas}
            <span className="text-charcoal/30 text-xs"> / {convidado.lugares}</span>
          </p>
        </div>
        <div className="col-span-4 md:col-span-2 text-center">
          <span
            className={`mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
              convidado.rsvp_status === "confirmado"
                ? "border-sage text-sage"
                : convidado.rsvp_status === "recusado"
                  ? "border-rose text-rose"
                  : "border-charcoal/20 text-charcoal/50"
            }`}
          >
            {convidado.rsvp_status}
          </span>
        </div>
        <div className="col-span-4 md:col-span-4 flex flex-wrap gap-1 justify-end">
          <button
            onClick={() => onCopy(link)}
            className="mono text-[10px] uppercase tracking-widest px-2 py-1 border border-charcoal/15 hover:border-rose hover:text-rose"
            title={link}
          >
            Copiar link
          </button>
          <button
            onClick={whatsapp}
            className="mono text-[10px] uppercase tracking-widest px-2 py-1 border border-sage/40 text-sage hover:bg-sage/10"
          >
            WhatsApp
          </button>
          <button
            onClick={emailShare}
            className="mono text-[10px] uppercase tracking-widest px-2 py-1 border border-charcoal/15 hover:border-charcoal/40"
          >
            Email
          </button>
          <button
            onClick={onToggle}
            className="mono text-[10px] uppercase tracking-widest px-2 py-1 border border-charcoal/15 hover:border-charcoal/40"
          >
            {expanded ? "Fechar" : "Editar"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-charcoal/10 p-4 bg-ivory/40 space-y-4">
          {(() => {
            const confirmados = convidado.acompanhantes || [];
            const expectedNames = (convidado.expected_attendees || [])
              .map((e) => e.name?.trim())
              .filter(Boolean) as string[];
            const norm = (s: string) => s.toLowerCase().trim();
            const confirmadosSet = new Set(confirmados.map(norm));
            const recusadosDerivados =
              convidado.rsvp_status === "recusado"
                ? expectedNames
                : expectedNames.filter((n) => !confirmadosSet.has(norm(n)));
            return (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="mono text-[10px] uppercase tracking-widest text-sage mb-2">
                    ✅ Confirmados ({confirmados.length})
                  </p>
                  {confirmados.length === 0 ? (
                    <p className="text-xs text-charcoal/40 italic">Ainda sem confirmações.</p>
                  ) : (
                    <ul className="text-sm space-y-0.5">
                      {confirmados.map((n, i) => (
                        <li key={i} className="serif italic text-charcoal">
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mono text-[10px] uppercase tracking-widest text-rose mb-2">
                    ❌ Recusaram ({recusadosDerivados.length})
                  </p>
                  {recusadosDerivados.length === 0 ? (
                    <p className="text-xs text-charcoal/40 italic">
                      {expectedNames.length === 0
                        ? "Sem nomes pré-cadastrados para identificar recusas individuais."
                        : "Ninguém recusou."}
                    </p>
                  ) : (
                    <ul className="text-sm space-y-0.5">
                      {recusadosDerivados.map((n, i) => (
                        <li key={i} className="serif italic text-charcoal/60 line-through">
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })()}
          {convidado.mensagem && (
            <p className="text-xs text-charcoal/60 italic border-l-2 border-rose/30 pl-2">
              "{convidado.mensagem}"
            </p>
          )}


          <div>
            <p className="mono text-[10px] uppercase tracking-widest text-charcoal/50 mb-2">
              Pré-cadastrar convidados esperados
            </p>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-charcoal/60">Vagas:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={lugares}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                  setLugares(v);
                  setExpected(ensureLength(expected, v));
                }}
                className="w-20 border border-charcoal/15 px-2 py-1 bg-transparent text-sm"
              />
            </div>
            <div className="space-y-2">
              {expected.slice(0, lugares).map((att, i) => (
                <div key={att.id} className="flex items-center gap-2">
                  <span className="mono text-[10px] uppercase tracking-widest text-charcoal/40 w-24">
                    Convidado {i + 1}
                  </span>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={att.name}
                    onChange={(e) => {
                      const copy = [...expected];
                      copy[i] = { ...copy[i], name: e.target.value };
                      setExpected(copy);
                    }}
                    className="flex-1 border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={salvarExpected}
                className="mono text-[10px] uppercase tracking-widest px-4 py-2 bg-charcoal text-ivory hover:bg-rose"
              >
                Salvar alterações
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between border-t border-charcoal/10 pt-3">
            <div className="flex items-center gap-2 text-xs">
              {convidado.codigo_acesso ? (
                <span className="mono uppercase tracking-widest text-charcoal/60 border border-charcoal/15 px-2 py-1">
                  Código: {convidado.codigo_acesso}
                </span>
              ) : (
                <button
                  onClick={onGenCodigo}
                  className="text-charcoal/40 hover:text-rose underline"
                >
                  gerar código de acesso
                </button>
              )}
            </div>
            <div className="flex gap-3 text-xs">
              {convidado.rsvp_status !== "pendente" && (
                <button onClick={onReset} className="text-charcoal/60 hover:text-charcoal underline">
                  Resetar RSVP
                </button>
              )}
              <button onClick={onRemove} className="text-rose hover:underline">
                Remover convite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
