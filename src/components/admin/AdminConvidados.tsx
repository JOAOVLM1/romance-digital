import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convidadosQuery, type Convidado } from "@/lib/wedding/queries";

type Filter = "todos" | "confirmado" | "pendente" | "recusado";

export function AdminConvidados({ convidados }: { convidados: Convidado[] }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: convidadosQuery.queryKey });

  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");

  const [novo, setNovo] = useState({ nome: "", email: "", telefone: "", lugares: 1 });

  const filtrados = useMemo(() => {
    let list = convidados;
    if (filter !== "todos") list = list.filter((c) => c.rsvp_status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.nome.toLowerCase().includes(q));
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convidado adicionado");
      setNovo({ nome: "", email: "", telefone: "", lugares: 1 });
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Convidado["rsvp_status"] }) => {
      const { error } = await supabase
        .from("convidados")
        .update({
          rsvp_status: status,
          confirmado_em: status === "pendente" ? null : new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
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
      toast.success("Convidado removido");
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
        const cols = r.split(",").map((c) => c.trim());
        const nome = cols[idx("nome") >= 0 ? idx("nome") : 0];
        if (!nome) return null;
        return {
          nome,
          email: idx("email") >= 0 ? cols[idx("email")] || null : null,
          telefone: idx("telefone") >= 0 ? cols[idx("telefone")] || null : null,
          lugares: idx("lugares") >= 0 ? Number(cols[idx("lugares")]) || 1 : 1,
        };
      })
      .filter(Boolean) as any[];
    if (inserts.length === 0) return toast.error("Nenhum convidado válido encontrado");
    const { error } = await supabase.from("convidados").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${inserts.length} convidados importados`);
    invalidate();
  };

  const exportCSV = () => {
    const rows = [
      ["nome", "email", "telefone", "lugares", "status", "confirmado_em", "mensagem"],
      ...convidados.map((c) => [
        c.nome,
        c.email || "",
        c.telefone || "",
        c.lugares,
        c.rsvp_status,
        c.confirmado_em || "",
        (c.mensagem || "").replace(/[\r\n,]/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convidados.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: convidados.length,
    confirmados: convidados.filter((c) => c.rsvp_status === "confirmado").length,
    pendentes: convidados.filter((c) => c.rsvp_status === "pendente").length,
    recusados: convidados.filter((c) => c.rsvp_status === "recusado").length,
    lugares: convidados
      .filter((c) => c.rsvp_status === "confirmado")
      .reduce((sum, c) => sum + c.lugares, 0),
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Total", stats.total],
          ["Confirmados", stats.confirmados],
          ["Pendentes", stats.pendentes],
          ["Recusados", stats.recusados],
          ["Lugares conf.", stats.lugares],
        ].map(([label, value]) => (
          <div key={label as string} className="border border-charcoal/10 p-4 bg-card">
            <p className="mono text-[9px] uppercase tracking-widest text-charcoal/50">{label}</p>
            <p className="serif text-3xl text-charcoal mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="border border-charcoal/10 p-5 bg-card">
        <h3 className="serif italic text-xl text-charcoal mb-4">Adicionar convidado</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            placeholder="Nome*"
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
            <input
              type="number"
              min={1}
              value={novo.lugares}
              onChange={(e) => setNovo({ ...novo, lugares: Number(e.target.value) })}
              className="w-20 border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
            />
            <button
              onClick={() => add.mutate()}
              disabled={add.isPending}
              className="flex-1 bg-charcoal text-ivory mono text-[10px] uppercase tracking-widest hover:bg-rose transition-colors px-3"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm w-48"
          />
          {(["todos", "confirmado", "pendente", "recusado"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`mono text-[10px] uppercase tracking-widest px-3 py-2 border ${
                filter === f
                  ? "border-rose text-rose"
                  : "border-charcoal/15 text-charcoal/60 hover:border-charcoal/40"
              }`}
            >
              {f === "todos" ? "Todos" : f === "confirmado" ? "Confirmados" : f === "pendente" ? "Pendentes" : "Recusados"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
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

      {/* Table */}
      <div className="border border-charcoal/10 overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead className="bg-sage/5 border-b border-charcoal/10">
            <tr>
              {["Nome", "Contato", "Lugares", "Status", "Confirmado", "Mensagem", "Ações"].map((h) => (
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
                <td colSpan={7} className="text-center py-10 text-charcoal/40">
                  Nenhum convidado encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} className="border-b border-charcoal/5 hover:bg-sage/5">
                <td className="px-3 py-3 serif italic">{c.nome}</td>
                <td className="px-3 py-3 text-charcoal/70 text-xs">
                  {c.email}
                  {c.email && c.telefone && <br />}
                  {c.telefone}
                </td>
                <td className="px-3 py-3 text-center">{c.lugares}</td>
                <td className="px-3 py-3">
                  <select
                    value={c.rsvp_status}
                    onChange={(e) =>
                      updateStatus.mutate({ id: c.id, status: e.target.value as any })
                    }
                    className="mono text-[10px] uppercase tracking-widest bg-transparent border border-charcoal/15 px-2 py-1"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="recusado">Recusado</option>
                  </select>
                </td>
                <td className="px-3 py-3 text-xs text-charcoal/60">
                  {c.confirmado_em
                    ? new Date(c.confirmado_em).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-3 py-3 text-xs text-charcoal/70 max-w-[200px] truncate">
                  {c.mensagem || "—"}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => confirm(`Remover ${c.nome}?`) && remove.mutate(c.id)}
                    className="text-xs text-rose hover:underline"
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
        Formato CSV: <code>nome,email,telefone,lugares</code> (cabeçalho na primeira linha)
      </p>
    </div>
  );
}
