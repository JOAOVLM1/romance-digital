import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Foto } from "@/lib/wedding/queries";

export function GallerySection({ fotos }: { fotos: Foto[] }) {
  const [open, setOpen] = useState<Foto | null>(null);

  if (fotos.length === 0) return null;

  return (
    <section id="galeria" className="py-24 md:py-32 px-6">
      <header className="text-center mb-16 max-w-4xl mx-auto">
        <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage mb-4">Capítulo V</p>
        <h2 className="serif text-4xl md:text-5xl italic text-charcoal">Galeria</h2>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
        {fotos.map((f) => (
          <button
            key={f.id}
            onClick={() => setOpen(f)}
            className="aspect-square bg-sage/5 overflow-hidden group"
          >
            <img
              src={f.foto_url}
              alt={f.legenda || ""}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl p-0 bg-charcoal border-none">
          {open && (
            <img
              src={open.foto_url}
              alt={open.legenda || ""}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
