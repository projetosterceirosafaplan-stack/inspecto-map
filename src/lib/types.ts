export type Prioridade = "1" | "2" | "3";

export interface PendenciaCatalogo {
  codigo: string;
  descricao: string;
  tipo: string;
  prioridade: string;
  classificacao: string;
  tratativa: string;
}

export interface Foto {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  legenda?: string;
  criadoEm: number;
}

export interface PendenciaApontada {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  prioridade: string;
  classificacao: string;
  tratativa: string;
  justificativa?: string;
  foto?: Foto;
  criadoEm: number;
}

export interface Ponto {
  id: string;
  /** Código / número do poste no asbuilt */
  codigo: string;
  lat: number;
  lng: number;
  observacao?: string;
  fotos: Foto[];
  pendencias: PendenciaApontada[];
  criadoEm: number;
}

export interface Trecho {
  id: string;
  nome: string;
  path: { lat: number; lng: number }[];
  /** Postes de início e fim vinculados ao trecho */
  posteIds?: [string, string];
  observacao?: string;
  fotos: Foto[];
  pendencias: PendenciaApontada[];
  criadoEm: number;
}

export interface Fiscalizacao {
  id: string;
  projeto: string;
  empreiteira: string;
  dataFiscalizacao: string;
  fiscal: string;
  tipoProjeto: string;
  porteProjeto: string;
  pontos: Ponto[];
  trechos: Trecho[];
  criadoEm: number;
  atualizadoEm: number;
  /** Definido quando a fiscalização foi finalizada; ausente = em andamento */
  finalizadaEm?: number;
}

export const TIPOS_PROJETO = [
  "Extensão MT",
  "Extensão BT",
  "Melhoria",
  "Manutenção",
  "Linha de Transmissão",
  "Ligação Nova",
  "Iluminação Pública",
];

export const PORTES_PROJETO = ["Pequeno Porte", "Médio Porte", "Grande Porte"];
