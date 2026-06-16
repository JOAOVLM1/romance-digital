import { Link } from "@tanstack/react-router";
import type { ConfigMap } from "@/lib/wedding/queries";

export function SiteFooter({ config }: { config: ConfigMap }) {
  const noiva = config.nome_noiva || "";
  const noivo = config.nome_noivo || "";
  return (
    <footer className="py-12 border-t border-charcoal/5 text-center">
      <p className="serif italic text-lg text-charcoal/50">
        {noiva} & {noivo}
      </p>
      <p className="mono text-[9px] uppercase tracking-widest mt-4 text-charcoal/30">
        Feito com amor
      </p>
      <Link
        to="/auth"
        className="mono text-[9px] uppercase tracking-widest mt-6 inline-block text-charcoal/20 hover:text-rose transition-colors"
      >
        Área restrita
      </Link>
    </footer>
  );
}
