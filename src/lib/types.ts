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
  /** Identificador fixo e único na fiscalização (P1, P2...), não editável */
  numero?: string;
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
  /** Último número de ponto emitido — nunca reutilizado */
  contadorPontos?: number;
  criadoEm: number;
  atualizadoEm: number;
  /** Definido quando a fiscalização foi finalizada; ausente = em andamento */
  finalizadaEm?: number;
}

/** Rótulo "P1 - Barramento" usado no relatório */
export function rotuloPonto(p: Ponto) {
  return p.codigo ? `${p.numero ?? "P?"} - ${p.codigo}` : (p.numero ?? "P?");
}

/** Garante que todo ponto tenha número único (migra dados antigos). */
export function garantirNumeros(f: Fiscalizacao): Fiscalizacao {
  let c = f.contadorPontos ?? 0;
  for (const p of f.pontos) {
    const n = Number(p.numero?.slice(1));
    if (Number.isFinite(n) && n > c) c = n;
  }
  const vistos = new Set<string>();
  const pontos = f.pontos.map((p) => {
    if (p.numero && !vistos.has(p.numero)) { vistos.add(p.numero); return p; }
    c += 1;
    const numero = `P${c}`;
    vistos.add(numero);
    return { ...p, numero };
  });
  return { ...f, pontos, contadorPontos: c };
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
