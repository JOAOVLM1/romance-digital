import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { momentosQuery, type Momento } from "@/lib/wedding/queries";

const empty = { data_momento: "", titulo: "", descricao: "", foto_url: "", ordem: 0 };

export function AdminHistoria({ momentos }: { momentos: Momento[] }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: momentosQuery.queryKey });
  const [editing, setEditing] = useState<Momento | null>(null);
  const [form, setForm] = useState(empty);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        data_momento: form.data_momento.trim(),
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        foto_url: form.foto_url || null,
        ordem: Number(form.ordem) || 0,
      };
      if (!payload.titulo || !payload.data_momento) throw new Error("Data e título obrigatórios");
      if (editing) {
        const { error } = await supabase.from("momentos_historia").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("momentos_historia").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      setEditing(null);
      setForm(empty);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("momentos_historia").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (m: Momento) => {
    setEditing(m);
    setForm({
      data_momento: m.data_momento,
      titulo: m.titulo,
      descricao: m.descricao || "",
      foto_url: m.foto_url || "",
      ordem: m.ordem,
    });
  };

  return (
    <div className="space-y-8">
      <div className="border border-charcoal/10 p-5 bg-card">
        <h3 className="serif italic text-xl text-charcoal mb-4">
          {editing ? "Editar momento" : "Adicionar momento"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            placeholder="Data (ex: Janeiro de 2018)*"
            value={form.data_momento}
            onChange={(e) => setForm({ ...form, data_momento: e.target.value })}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <input
            placeholder="Título*"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
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
            rows={3}
            value={form.descricao}
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
              <button onClick={() => { setEditing(null); setForm(empty); }} className="mono text-[10px] uppercase tracking-widest px-3 border border-charcoal/15">
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {momentos.map((m) => (
          <div key={m.id} className="border border-charcoal/10 bg-card p-4 flex gap-4 items-center">
            <div className="w-16 text-center shrink-0">
              <p className="serif text-2xl text-charcoal">{m.ordem}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="mono text-[10px] uppercase tracking-widest text-rose">{m.data_momento}</p>
              <h4 className="serif italic text-lg text-charcoal">{m.titulo}</h4>
              <p className="text-xs text-charcoal/60 line-clamp-2">{m.descricao}</p>
            </div>
            <div className="flex gap-3 text-xs shrink-0">
              <button onClick={() => startEdit(m)} className="text-charcoal/70 hover:text-rose">Editar</button>
              <button
                onClick={() => confirm("Remover este momento?") && remove.mutate(m.id)}
                className="text-rose hover:underline"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
