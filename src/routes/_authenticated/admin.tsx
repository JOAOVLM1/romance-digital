import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/wedding/use-is-admin";
import {
  configQuery,
  convidadosQuery,
  presentesQuery,
  momentosQuery,
  galeriaQuery,
} from "@/lib/wedding/queries";
import { AdminConvidados } from "@/components/admin/AdminConvidados";
import { AdminPresentes } from "@/components/admin/AdminPresentes";
import { AdminHistoria } from "@/components/admin/AdminHistoria";
import { AdminGaleria } from "@/components/admin/AdminGaleria";
import { AdminConfig } from "@/components/admin/AdminConfig";

const TABS = [
  { id: "convidados", label: "Convidados" },
  { id: "presentes", label: "Presentes" },
  { id: "historia", label: "Nossa História" },
  { id: "galeria", label: "Galeria" },
  { id: "config", label: "Configurações" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/_authenticated/admin")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(configQuery);
    context.queryClient.ensureQueryData(convidadosQuery);
    context.queryClient.ensureQueryData(presentesQuery);
    context.queryClient.ensureQueryData(momentosQuery);
    context.queryClient.ensureQueryData(galeriaQuery);
  },
  component: AdminPage,
});

function AdminPage() {
  const { loading, isAdmin } = useIsAdmin();
  const [tab, setTab] = useState<TabId>("convidados");
  const navigate = useNavigate();

  const { data: convidados } = useSuspenseQuery(convidadosQuery);
  const { data: presentes } = useSuspenseQuery(presentesQuery);
  const { data: momentos } = useSuspenseQuery(momentosQuery);
  const { data: galeria } = useSuspenseQuery(galeriaQuery);
  const { data: config } = useSuspenseQuery(configQuery);

  const onLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu");
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory">
        <p className="mono text-[10px] uppercase tracking-widest text-charcoal/40">Carregando…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory px-4">
        <div className="text-center max-w-md">
          <h1 className="serif italic text-3xl text-charcoal mb-3">Acesso negado</h1>
          <p className="text-sm text-charcoal/60 mb-6">
            Sua conta não possui permissão de administrador.
          </p>
          <button
            onClick={onLogout}
            className="px-6 py-3 bg-charcoal text-ivory mono text-[10px] uppercase tracking-widest hover:bg-rose transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-charcoal/10 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="serif italic text-xl text-charcoal shrink-0">
              {(config.nome_noiva || "M").charAt(0)} & {(config.nome_noivo || "G").charAt(0)}
            </Link>
            <span className="mono text-[10px] uppercase tracking-widest text-charcoal/40 truncate">
              Painel administrativo
            </span>
          </div>
          <button
            onClick={onLogout}
            className="mono text-[10px] uppercase tracking-widest text-charcoal/60 hover:text-rose shrink-0"
          >
            Sair
          </button>
        </div>
        <nav className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`mono text-[10px] uppercase tracking-widest py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-rose text-charcoal"
                  : "border-transparent text-charcoal/50 hover:text-charcoal"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === "convidados" && <AdminConvidados convidados={convidados} />}
        {tab === "presentes" && <AdminPresentes presentes={presentes} />}
        {tab === "historia" && <AdminHistoria momentos={momentos} />}
        {tab === "galeria" && <AdminGaleria fotos={galeria} />}
        {tab === "config" && <AdminConfig config={config} />}
      </main>
    </div>
  );
}
