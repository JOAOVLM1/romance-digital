import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ExpectedAttendee = { id: string; name: string };

export type Convidado = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  lugares: number;
  vagas_confirmadas: number;
  acompanhantes: string[];
  expected_attendees: ExpectedAttendee[];
  rsvp_token: string;
  codigo_acesso: string | null;
  rsvp_status: "pendente" | "confirmado" | "recusado";
  confirmado_em: string | null;
  mensagem: string | null;
  created_at: string;
};


export type Presente = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  foto_url: string | null;
  status: "disponivel" | "presenteado";
  ordem: number;
};

export type Momento = {
  id: string;
  data_momento: string;
  titulo: string;
  descricao: string | null;
  foto_url: string | null;
  ordem: number;
};

export type Foto = {
  id: string;
  foto_url: string;
  legenda: string | null;
  ordem: number;
};

export type ConfigMap = Record<string, string>;

export const configQuery = queryOptions({
  queryKey: ["wedding", "config"],
  queryFn: async (): Promise<ConfigMap> => {
    const { data, error } = await supabase.from("configuracoes").select("chave, valor");
    if (error) throw error;
    const map: ConfigMap = {};
    (data ?? []).forEach((row: any) => { map[row.chave] = row.valor ?? ""; });
    return map;
  },
});

export const momentosQuery = queryOptions({
  queryKey: ["wedding", "momentos"],
  queryFn: async (): Promise<Momento[]> => {
    const { data, error } = await supabase.from("momentos_historia").select("*").order("ordem");
    if (error) throw error;
    return (data ?? []) as Momento[];
  },
});

export const presentesQuery = queryOptions({
  queryKey: ["wedding", "presentes"],
  queryFn: async (): Promise<Presente[]> => {
    const { data, error } = await supabase.from("presentes").select("*").order("ordem");
    if (error) throw error;
    return (data ?? []) as Presente[];
  },
});

export const galeriaQuery = queryOptions({
  queryKey: ["wedding", "galeria"],
  queryFn: async (): Promise<Foto[]> => {
    const { data, error } = await supabase.from("fotos_galeria").select("*").order("ordem");
    if (error) throw error;
    return (data ?? []) as Foto[];
  },
});

export const convidadosQuery = queryOptions({
  queryKey: ["wedding", "convidados"],
  queryFn: async (): Promise<Convidado[]> => {
    const { data, error } = await supabase
      .from("convidados")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Convidado[];
  },
});
