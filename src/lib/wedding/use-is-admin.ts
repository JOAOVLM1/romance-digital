import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [state, setState] = useState<{ loading: boolean; isAdmin: boolean; userId: string | null }>(
    { loading: true, isAdmin: false, userId: null },
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (alive) setState({ loading: false, isAdmin: false, userId: null });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!alive) return;
      setState({ loading: false, isAdmin: !!data && !error, userId: u.user.id });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
