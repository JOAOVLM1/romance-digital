
-- Add expected_attendees and rsvp_token to convidados
ALTER TABLE public.convidados
  ADD COLUMN IF NOT EXISTS expected_attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rsvp_token text;

-- Backfill tokens for existing rows
UPDATE public.convidados
SET rsvp_token = encode(gen_random_bytes(9), 'hex')
WHERE rsvp_token IS NULL;

ALTER TABLE public.convidados
  ALTER COLUMN rsvp_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS convidados_rsvp_token_idx ON public.convidados(rsvp_token);

-- Default for new rows via trigger (since gen_random_bytes can't be in DEFAULT cleanly across pg versions, use trigger)
CREATE OR REPLACE FUNCTION public.tg_convidados_set_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rsvp_token IS NULL OR NEW.rsvp_token = '' THEN
    NEW.rsvp_token := encode(gen_random_bytes(9), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convidados_set_token ON public.convidados;
CREATE TRIGGER trg_convidados_set_token
  BEFORE INSERT ON public.convidados
  FOR EACH ROW EXECUTE FUNCTION public.tg_convidados_set_token();

-- Ensure anon can update the new column too (column-level grants if present)
GRANT UPDATE (expected_attendees) ON public.convidados TO anon, authenticated;
