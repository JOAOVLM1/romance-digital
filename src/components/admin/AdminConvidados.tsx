import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convidadosQuery, type Convidado } from "@/lib/wedding/queries";

type Filter = "todos" | "confirmado" | "pendente" | "recusado";

function genCodigo() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function AdminConvidados({ convidados }: { convidados: Convidado[] }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: convidadosQuery.queryKey });

  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [verNomes, setVerNomes] = useState(false);

  const [novo, setNovo] = useState({
    nome: "",
    email: "",
    telefone: "",
    lugares: 1,
    usarCodigo: false,
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
      const { error } = await supabase.from("convidados").insert({
        nome: novo.nome.trim(),
        email: novo.email || null,
        telefone: novo.telefone || null,
        lugares: Number(novo.lugares) || 1,
        codigo_acesso: novo.usarCodigo ? genCodigo() : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite adicionado");
      setNovo({ nome: "", email: "", telefone: "", lugares: 1, usarCodigo: false });
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLugares = useMutation({
    mutationFn: async ({ id, lugares }: { id: string; lugares: number }) => {
      const { error } = await supabase
        .from("convidados")
        .update({ lugares } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vagas atualizadas");
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

  const importCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const [headerLine, ...rows] = lines;
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const inserts = rows
      .map((r) => {
        const cols = r.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const nome = cols[idx("name") >= 0 ? idx("name") : idx("nome") >= 0 ? idx("nome") : 0];
        if (!nome) return null;
        const lugIdx = idx("allowed_seats") >= 0 ? idx("allowed_seats") : idx("lugares");
        return {
          nome,
          email: idx("email") >= 0 ? cols[idx("email")] || null : null,
          telefone:
            idx("phone") >= 0
              ? cols[idx("phone")] || null
              : idx("telefone") >= 0
                ? cols[idx("telefone")] || null
                : null,
          lugares: lugIdx >= 0 ? Number(cols[lugIdx]) || 1 : 1,
        };
      })
      .filter(Boolean) as any[];
    if (inserts.length === 0) return toast.error("Nenhum convite válido encontrado");
    const { error } = await supabase.from("convidados").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${inserts.length} convites importados`);
    invalidate();
  };

  const exportCSV = () => {
    const rows = [
      [
        "nome",
        "email",
        "telefone",
        "allowed_seats",
        "confirmed_seats",
        "attendees",
        "status",
        "confirmado_em",
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
        c.rsvp_status,
        c.confirmado_em || "",
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

  const todosNomes = useMemo(
    () =>
      convidados
        .filter((c) => c.rsvp_status === "confirmado")
        .flatMap((c) => (c.acompanhantes || []).map((n) => ({ nome: n, convite: c.nome })))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [convidados],
  );

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
        <h3 className="serif italic text-xl text-charcoal mb-4">Adicionar convite</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            placeholder="Nome do convite* (ex: Família Silva)"
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            className="md:col-span-2 border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <input
            placeholder="E-mail"
            type="email"
            value={novo.email}
            onChange={(e) => setNovo({ ...novo, email: e.target.value })}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <input
            placeholder="Telefone"
            value={novo.telefone}
            onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mono text-[9px] uppercase tracking-widest text-charcoal/50">
                Vagas
              </label>
              <input
                type="number"
                min={1}
                value={novo.lugares}
                onChange={(e) => setNovo({ ...novo, lugares: Number(e.target.value) })}
                className="w-full border border-charcoal/15 px-3 py-1 bg-transparent focus:outline-none focus:border-rose text-sm"
              />
            </div>
            <button
              onClick={() => add.mutate()}
              disabled={add.isPending}
              className="self-end flex-1 bg-charcoal text-ivory mono text-[10px] uppercase tracking-widest hover:bg-rose transition-colors px-3 py-2"
            >
              Adicionar
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-xs text-charcoal/70 cursor-pointer">
          <input
            type="checkbox"
            checked={novo.usarCodigo}
            onChange={(e) => setNovo({ ...novo, usarCodigo: e.target.checked })}
          />
          Gerar código de acesso único para este convite
        </label>
        <p className="text-[11px] text-charcoal/40 mt-2">
          Defina quantas pessoas este convite permite. O convidado só poderá confirmar até esse
          número.
        </p>
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
        <div className="flex gap-2">
          <button
            onClick={() => setVerNomes((v) => !v)}
            className="mono text-[10px] uppercase tracking-widest px-3 py-2 border border-charcoal/15 hover:border-charcoal/40"
          >
            {verNomes ? "Ocultar nomes" : "Ver todos nomes"}
          </button>
          <label className="mono text-[10px] uppercase tracking-widest px-3 py-2 border border-charcoal/15 hover:border-charcoal/40 cursor-pointer">
            Importar CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])}
            />
          </label>
          <button
            onClick={exportCSV}
            className="mono text-[10px] uppercase tracking-widest px-3 py-2 border border-charcoal/15 hover:border-charcoal/40"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {verNomes && (
        <div className="border border-charcoal/10 p-5 bg-card">
          <h3 className="serif italic text-xl text-charcoal mb-3">
            Todos os convidados confirmados ({todosNomes.length})
          </h3>
          {todosNomes.length === 0 ? (
            <p className="text-sm text-charcoal/50">Nenhum convidado confirmado ainda.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
              {todosNomes.map((n, i) => (
                <li key={i} className="flex justify-between border-b border-charcoal/5 py-1">
                  <span className="serif italic">{n.nome}</span>
                  <span className="text-xs text-charcoal/50">{n.convite}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-charcoal/10 overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead className="bg-sage/5 border-b border-charcoal/10">
            <tr>
              {[
                "Nome do convite",
                "Vagas perm.",
                "Vagas conf.",
                "Convidados",
                "Status",
                "Confirmado em",
                "Código",
                "Mensagem",
                "Ações",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left mono text-[10px] uppercase tracking-widest text-charcoal/60 px-3 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-charcoal/40">
                  Nenhum convite encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} className="border-b border-charcoal/5 hover:bg-sage/5 align-top">
                <td className="px-3 py-3">
                  <p className="serif italic">{c.nome}</p>
                  {(c.email || c.telefone) && (
                    <p className="text-[11px] text-charcoal/50 mt-0.5">
                      {[c.email, c.telefone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <input
                    type="number"
                    min={1}
                    defaultValue={c.lugares}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v && v !== c.lugares)
                        updateLugares.mutate({ id: c.id, lugares: v });
                    }}
                    className="w-16 border border-charcoal/15 px-2 py-1 bg-transparent text-center text-sm"
                  />
                </td>
                <td className="px-3 py-3 text-center serif text-base">
                  {c.vagas_confirmadas}
                  <span className="text-charcoal/30 text-xs"> /{c.lugares}</span>
                </td>
                <td className="px-3 py-3 text-xs text-charcoal/70 max-w-[200px]">
                  {(c.acompanhantes || []).length === 0 ? (
                    <span className="text-charcoal/30">—</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {(c.acompanhantes || []).map((n, i) => (
                        <li key={i} className="serif italic">
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                      c.rsvp_status === "confirmado"
                        ? "border-sage text-sage"
                        : c.rsvp_status === "recusado"
                          ? "border-rose text-rose"
                          : "border-charcoal/20 text-charcoal/50"
                    }`}
                  >
                    {c.rsvp_status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-charcoal/60">
                  {c.confirmado_em
                    ? new Date(c.confirmado_em).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-3 py-3 text-xs">
                  {c.codigo_acesso ? (
                    <button
                      onClick={() => copiar(c.codigo_acesso!)}
                      className="mono uppercase tracking-widest text-charcoal/70 hover:text-rose border border-charcoal/15 px-2 py-1"
                      title="Clique para copiar"
                    >
                      {c.codigo_acesso}
                    </button>
                  ) : (
                    <button
                      onClick={() => gerarCodigo.mutate(c.id)}
                      className="text-[11px] text-charcoal/40 hover:text-rose underline"
                    >
                      gerar
                    </button>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-charcoal/70 max-w-[200px] truncate">
                  {c.mensagem || "—"}
                </td>
                <td className="px-3 py-3 space-y-1">
                  {c.rsvp_status !== "pendente" && (
                    <button
                      onClick={() => resetRsvp.mutate(c.id)}
                      className="block text-xs text-charcoal/60 hover:text-charcoal underline"
                    >
                      Resetar
                    </button>
                  )}
                  <button
                    onClick={() => confirm(`Remover ${c.nome}?`) && remove.mutate(c.id)}
                    className="block text-xs text-rose hover:underline"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-charcoal/40">
        Formato CSV: <code>name,email,phone,allowed_seats</code> (cabeçalho na primeira linha).
        Exemplo: <code>"Família Oliveira,familia@email.com,65999999999,4"</code>
      </p>
    </div>
  );
}
