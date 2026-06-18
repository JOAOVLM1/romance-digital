CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.tg_convidados_set_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.rsvp_token IS NULL OR NEW.rsvp_token = '' THEN
    NEW.rsvp_token := encode(public.gen_random_bytes(9), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;