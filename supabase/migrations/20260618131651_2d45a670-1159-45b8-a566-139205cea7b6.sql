CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count >= 6 THEN
    RAISE EXCEPTION 'Limite de 6 contas atingido. Não é possível criar novas contas.' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  user_count := user_count + 1;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$function$;