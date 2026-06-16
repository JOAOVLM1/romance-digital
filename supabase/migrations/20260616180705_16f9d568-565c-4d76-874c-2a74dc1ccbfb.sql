
-- Restrict public UPDATE to RSVP-related columns only
REVOKE UPDATE ON public.convidados FROM anon;
GRANT UPDATE (rsvp_status, confirmado_em, mensagem) ON public.convidados TO anon;

-- Lock down SECURITY DEFINER functions: only triggers/internals need them
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
-- has_role is used inside RLS policies; authenticated needs to call it implicitly via policy — keep for authenticated
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
