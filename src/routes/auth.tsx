import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo(a)!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já está logado.");
      }
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <Link to="/" className="block text-center mb-10 mono text-[10px] uppercase tracking-widest text-charcoal/40 hover:text-rose">
          ← voltar ao site
        </Link>
        <div className="border border-charcoal/10 p-10 bg-card relative">
          <div className="absolute top-3 left-3 size-6 border-t border-l border-gold/50" />
          <div className="absolute top-3 right-3 size-6 border-t border-r border-gold/50" />
          <div className="absolute bottom-3 left-3 size-6 border-b border-l border-gold/50" />
          <div className="absolute bottom-3 right-3 size-6 border-b border-r border-gold/50" />

          <p className="mono text-[10px] uppercase tracking-[0.3em] text-sage text-center mb-3">
            Área dos noivos
          </p>
          <h1 className="serif italic text-3xl text-charcoal text-center mb-8">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mono text-[9px] uppercase tracking-widest text-charcoal/60 block mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-charcoal/15 bg-transparent py-2 focus:outline-none focus:border-rose text-charcoal"
              />
            </div>
            <div>
              <label className="mono text-[9px] uppercase tracking-widest text-charcoal/60 block mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-charcoal/15 bg-transparent py-2 focus:outline-none focus:border-rose text-charcoal"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-charcoal text-ivory mono text-[10px] uppercase tracking-[0.2em] hover:bg-rose transition-colors duration-500 disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="block w-full text-center mt-6 text-xs text-charcoal/50 hover:text-rose"
          >
            {mode === "login" ? "Criar uma conta" : "Já tenho conta"}
          </button>
          <p className="text-[10px] text-charcoal/40 text-center mt-4 leading-relaxed">
            O primeiro usuário criado se torna administrador automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
