import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { configQuery, type ConfigMap } from "@/lib/wedding/queries";

const FIELDS: { key: string; label: string; type?: "text" | "textarea" | "datetime-local" }[] = [
  { key: "nome_noiva", label: "Nome da noiva" },
  { key: "nome_noivo", label: "Nome do noivo" },
  { key: "data_casamento", label: "Data e hora do casamento", type: "datetime-local" },
  { key: "tagline", label: "Frase do casal" },
  { key: "rsvp_prazo", label: "Prazo para confirmar presença", type: "datetime-local" },
  { key: "pix_chave", label: "Chave PIX (CPF, e-mail, telefone, aleatória)" },
  { key: "pix_mensagem", label: "Mensagem do modal PIX", type: "textarea" },
  { key: "traje", label: "Traje" },
  { key: "cerimonia_local", label: "Cerimônia — local" },
  { key: "cerimonia_endereco", label: "Cerimônia — endereço completo" },
  { key: "cerimonia_horario", label: "Cerimônia — horário (ex: 16:00)" },
  { key: "cerimonia_mapa", label: "Cerimônia — URL de embed do Google Maps", type: "textarea" },
  { key: "recepcao_local", label: "Recepção — local" },
  { key: "recepcao_endereco", label: "Recepção — endereço" },
  { key: "recepcao_horario", label: "Recepção — horário" },
  { key: "notas_adicionais", label: "Notas adicionais / dicas para convidados", type: "textarea" },
];

function toInput(value: string | undefined, type?: string) {
  if (!value) return "";
  if (type === "datetime-local") {
    // store as ISO; display sliced to minutes
    return value.slice(0, 16);
  }
  return value;
}

export function AdminConfig({ config }: { config: ConfigMap }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ConfigMap>({ ...config });

  const save = useMutation({
    mutationFn: async () => {
      const rows = FIELDS.map((f) => ({
        chave: f.key,
        valor: form[f.key] ?? "",
      }));
      const { error } = await supabase.from("configuracoes").upsert(rows, { onConflict: "chave" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: configQuery.queryKey });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid gap-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mono text-[10px] uppercase tracking-widest text-charcoal/60 block mb-2">
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea
                value={form[f.key] || ""}
                rows={3}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border border-charcoal/15 px-3 py-2 bg-card focus:outline-none focus:border-rose text-sm resize-none"
              />
            ) : (
              <input
                type={f.type === "datetime-local" ? "datetime-local" : "text"}
                value={toInput(form[f.key], f.type)}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border border-charcoal/15 px-3 py-2 bg-card focus:outline-none focus:border-rose text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="bg-charcoal text-ivory mono text-[10px] uppercase tracking-widest hover:bg-rose transition-colors px-8 py-3"
      >
        {save.isPending ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}
