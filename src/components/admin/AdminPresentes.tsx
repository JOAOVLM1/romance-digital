import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { presentesQuery, type Presente } from "@/lib/wedding/queries";

const empty = { nome: "", descricao: "", preco: "", foto_url: "", ordem: 0 };

export function AdminPresentes({ presentes }: { presentes: Presente[] }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: presentesQuery.queryKey });
  const [editing, setEditing] = useState<Presente | null>(null);
  const [form, setForm] = useState(empty);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        preco: form.preco ? Number(form.preco) : null,
        foto_url: form.foto_url || null,
        ordem: Number(form.ordem) || 0,
      };
      if (!payload.nome) throw new Error("Nome obrigatório");
      if (editing) {
        const { error } = await supabase.from("presentes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("presentes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Presente atualizado" : "Presente adicionado");
      setEditing(null);
      setForm(empty);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (p: Presente) => {
      const { error } = await supabase
        .from("presentes")
        .update({ status: p.status === "disponivel" ? "presenteado" : "disponivel" })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("presentes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (p: Presente) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao || "",
      preco: p.preco?.toString() || "",
      foto_url: p.foto_url || "",
      ordem: p.ordem,
    });
  };

  return (
    <div className="space-y-8">
      <div className="border border-charcoal/10 p-5 bg-card">
        <h3 className="serif italic text-xl text-charcoal mb-4">
          {editing ? `Editar: ${editing.nome}` : "Adicionar presente"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            placeholder="Nome*"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <input
            placeholder="Preço (R$)"
            type="number"
            step="0.01"
            value={form.preco}
            onChange={(e) => setForm({ ...form, preco: e.target.value })}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <input
            placeholder="URL da foto"
            value={form.foto_url}
            onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
            className="md:col-span-2 border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <textarea
            placeholder="Descrição"
            value={form.descricao}
            rows={2}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className="md:col-span-2 border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm resize-none"
          />
          <input
            placeholder="Ordem"
            type="number"
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex-1 bg-charcoal text-ivory mono text-[10px] uppercase tracking-widest hover:bg-rose transition-colors py-2"
            >
              {editing ? "Salvar" : "Adicionar"}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                }}
                className="mono text-[10px] uppercase tracking-widest px-3 border border-charcoal/15"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presentes.map((p) => (
          <div key={p.id} className="border border-charcoal/10 bg-card p-4 flex gap-4">
            <div className="w-20 h-20 bg-sage/5 shrink-0 overflow-hidden">
              {p.foto_url && (
                <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="serif text-lg text-charcoal truncate">{p.nome}</h4>
              <p className={`mono text-[9px] uppercase tracking-widest mb-2 ${p.status === "disponivel" ? "text-sage" : "text-rose"}`}>
                {p.status === "disponivel" ? "Disponível" : "Presenteado"}
              </p>
              {p.preco != null && (
                <p className="text-xs text-charcoal/60">
                  {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              )}
              <div className="flex gap-3 mt-2 text-xs">
                <button onClick={() => startEdit(p)} className="text-charcoal/70 hover:text-rose">Editar</button>
                <button onClick={() => toggle.mutate(p)} className="text-charcoal/70 hover:text-rose">
                  {p.status === "disponivel" ? "Marcar dado" : "Reabrir"}
                </button>
                <button
                  onClick={() => confirm(`Remover ${p.nome}?`) && remove.mutate(p.id)}
                  className="text-rose hover:underline"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
