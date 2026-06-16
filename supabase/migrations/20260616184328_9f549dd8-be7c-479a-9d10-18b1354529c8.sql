
ALTER TABLE public.convidados
  ADD COLUMN IF NOT EXISTS vagas_confirmadas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acompanhantes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS codigo_acesso text UNIQUE;

ALTER TABLE public.convidados
  DROP CONSTRAINT IF EXISTS convidados_vagas_confirmadas_check;

ALTER TABLE public.convidados
  ADD CONSTRAINT convidados_vagas_confirmadas_check
  CHECK (vagas_confirmadas >= 0 AND vagas_confirmadas <= lugares);

CREATE OR REPLACE FUNCTION public.tg_convidados_validate_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  arr_len integer;
BEGIN
  IF NEW.rsvp_status = 'confirmado' THEN
    IF NEW.vagas_confirmadas < 1 THEN
      RAISE EXCEPTION 'Confirme pelo menos 1 vaga';
    END IF;
    IF jsonb_typeof(NEW.acompanhantes) <> 'array' THEN
      RAISE EXCEPTION 'Lista de convidados inválida';
    END IF;
    arr_len := jsonb_array_length(NEW.acompanhantes);
    IF arr_len <> NEW.vagas_confirmadas THEN
      RAISE EXCEPTION 'A quantidade de nomes (%) deve ser igual ao número de vagas confirmadas (%)', arr_len, NEW.vagas_confirmadas;
    END IF;
  ELSIF NEW.rsvp_status = 'recusado' THEN
    NEW.vagas_confirmadas := 0;
    NEW.acompanhantes := '[]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_convidados_validate ON public.convidados;
CREATE TRIGGER tg_convidados_validate
  BEFORE INSERT OR UPDATE ON public.convidados
  FOR EACH ROW EXECUTE FUNCTION public.tg_convidados_validate_rsvp();
