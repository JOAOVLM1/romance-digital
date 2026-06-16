import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { galeriaQuery, type Foto } from "@/lib/wedding/queries";

export function AdminGaleria({ fotos }: { fotos: Foto[] }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: galeriaQuery.queryKey });
  const [url, setUrl] = useState("");
  const [legenda, setLegenda] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!url.trim()) throw new Error("URL obrigatória");
      const { error } = await supabase.from("fotos_galeria").insert({
        foto_url: url.trim(),
        legenda: legenda || null,
        ordem: fotos.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto adicionada");
      setUrl("");
      setLegenda("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fotos_galeria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto removida");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div className="border border-charcoal/10 p-5 bg-card">
        <h3 className="serif italic text-xl text-charcoal mb-4">Adicionar foto</h3>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <input
            placeholder="URL da imagem*"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <input
            placeholder="Legenda (opcional)"
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            className="border border-charcoal/15 px-3 py-2 bg-transparent focus:outline-none focus:border-rose text-sm"
          />
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending}
            className="bg-charcoal text-ivory mono text-[10px] uppercase tracking-widest hover:bg-rose transition-colors px-5 py-2"
          >
            Adicionar
          </button>
        </div>
        <p className="text-xs text-charcoal/40 mt-3">
          Dica: hospede imagens em um serviço como Imgur, Cloudinary ou Unsplash e cole a URL aqui.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {fotos.map((f) => (
          <div key={f.id} className="relative group">
            <img src={f.foto_url} alt={f.legenda || ""} className="aspect-square object-cover w-full" />
            <button
              onClick={() => confirm("Remover foto?") && remove.mutate(f.id)}
              className="absolute top-2 right-2 bg-charcoal/80 text-ivory mono text-[9px] uppercase tracking-widest px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
