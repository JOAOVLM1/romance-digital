GRANT SELECT, UPDATE ON public.convidados TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.convidados TO authenticated;
GRANT ALL ON public.convidados TO service_role;

GRANT SELECT ON public.configuracoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;

GRANT SELECT ON public.momentos_historia TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.momentos_historia TO authenticated;
GRANT ALL ON public.momentos_historia TO service_role;

GRANT SELECT ON public.presentes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentes TO authenticated;
GRANT ALL ON public.presentes TO service_role;

GRANT SELECT ON public.fotos_galeria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fotos_galeria TO authenticated;
GRANT ALL ON public.fotos_galeria TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;