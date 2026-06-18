
-- =========================
-- ROLES & PROFILES
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile on signup; first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- UPDATED AT
-- =========================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- CONVIDADOS
-- =========================
CREATE TYPE public.rsvp_status AS ENUM ('pendente', 'confirmado', 'recusado');

CREATE TABLE public.convidados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  lugares INT NOT NULL DEFAULT 1,
  rsvp_status rsvp_status NOT NULL DEFAULT 'pendente',
  confirmado_em TIMESTAMPTZ,
  mensagem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.convidados TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.convidados TO authenticated;
GRANT ALL ON public.convidados TO service_role;
ALTER TABLE public.convidados ENABLE ROW LEVEL SECURITY;
-- Public can read guest list (only by searching name) and update own RSVP
CREATE POLICY "Public read convidados" ON public.convidados FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public update own RSVP" ON public.convidados FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage convidados" ON public.convidados FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_convidados_updated BEFORE UPDATE ON public.convidados
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_convidados_nome ON public.convidados (LOWER(nome));

-- =========================
-- PRESENTES
-- =========================
CREATE TYPE public.presente_status AS ENUM ('disponivel', 'presenteado');

CREATE TABLE public.presentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2),
  foto_url TEXT,
  status presente_status NOT NULL DEFAULT 'disponivel',
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.presentes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentes TO authenticated;
GRANT ALL ON public.presentes TO service_role;
ALTER TABLE public.presentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read presentes" ON public.presentes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage presentes" ON public.presentes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_presentes_updated BEFORE UPDATE ON public.presentes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- MOMENTOS DA HISTORIA
-- =========================
CREATE TABLE public.momentos_historia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_momento TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  foto_url TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.momentos_historia TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.momentos_historia TO authenticated;
GRANT ALL ON public.momentos_historia TO service_role;
ALTER TABLE public.momentos_historia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read momentos" ON public.momentos_historia FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage momentos" ON public.momentos_historia FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_momentos_updated BEFORE UPDATE ON public.momentos_historia
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- FOTOS GALERIA
-- =========================
CREATE TABLE public.fotos_galeria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foto_url TEXT NOT NULL,
  legenda TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fotos_galeria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fotos_galeria TO authenticated;
GRANT ALL ON public.fotos_galeria TO service_role;
ALTER TABLE public.fotos_galeria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read galeria" ON public.fotos_galeria FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage galeria" ON public.fotos_galeria FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- CONFIGURACOES (key-value)
-- =========================
CREATE TABLE public.configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.configuracoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read config" ON public.configuracoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage config" ON public.configuracoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_config_updated BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed default settings + sample data
INSERT INTO public.configuracoes (chave, valor) VALUES
  ('nome_noiva', 'Layna'),
  ('nome_noivo', 'Natan'),
  ('data_casamento', '2025-10-12T16:00:00'),
  ('tagline', 'Dois corações, uma história'),
  ('pix_chave', ''),
  ('pix_mensagem', 'Após realizar o PIX, entre em contato conosco para confirmar o presente!'),
  ('rsvp_prazo', '2025-09-12T23:59:59'),
  ('traje', 'Passeio Completo'),
  ('cerimonia_local', 'Fazenda Santa Gertrudes'),
  ('cerimonia_endereco', 'Rodovia Washington Luiz, km 165'),
  ('cerimonia_horario', '16:00'),
  ('cerimonia_mapa', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.123!2d-46.633308!3d-23.55052!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1'),
  ('recepcao_local', 'Fazenda Santa Gertrudes — Salão Principal'),
  ('recepcao_endereco', 'Rodovia Washington Luiz, km 165'),
  ('recepcao_horario', '18:00'),
  ('notas_adicionais', 'Recomendamos evitar saltos muito finos para o gramado. Cores suaves são bem-vindas.');

INSERT INTO public.momentos_historia (data_momento, titulo, descricao, ordem) VALUES
  ('Janeiro de 2018', 'O Primeiro Olhar', 'Tudo começou em uma tarde chuvosa em São Paulo. Entre livros e o aroma de café, nossos caminhos se cruzaram pela primeira vez na pequena livraria da Vila Madalena.', 1),
  ('Março de 2019', 'O Primeiro Encontro', 'Um café despretensioso que virou horas de conversa e a certeza de que algo especial estava começando.', 2),
  ('Agosto de 2023', 'O Sim', 'Sob o céu estrelado da Chapada dos Veadeiros, o que era um passeio tornou-se o marco do nosso futuro. Um pedido simples, um sim eterno.', 3);

INSERT INTO public.presentes (nome, descricao, preco, ordem) VALUES
  ('Jogo de Jantar', 'Porcelana branca fina com detalhes em ouro.', 850.00, 1),
  ('Cota Lua de Mel', 'Ajude-nos a realizar o sonho da viagem dos sonhos.', 500.00, 2),
  ('Máquina de Café', 'Para nossas manhãs começarem com energia.', 1200.00, 3),
  ('Jogo de Toalhas', 'Conjunto de toalhas de algodão egípcio.', 320.00, 4),
  ('Adega Climatizada', 'Para guardar nossos vinhos especiais.', 2400.00, 5);
