import catalogo from "@/data/pendencias.json";
import type { PendenciaApontada, PendenciaCatalogo } from "./types";

export const CATALOGO = catalogo as PendenciaCatalogo[];

export const TIPOS = Array.from(new Set(CATALOGO.map((p) => p.tipo))).sort((a, b) =>
  a.localeCompare(b, "pt-BR"),
);

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buscarPendencias(termo: string, tipo: string | null, limite = 60) {
  const t = normalizar(termo.trim());
  const termos = t.split(/\s+/).filter(Boolean);
  const resultado: PendenciaCatalogo[] = [];
  for (const p of CATALOGO) {
    if (tipo && p.tipo !== tipo) continue;
    if (termos.length) {
      const alvo = normalizar(`${p.codigo} ${p.descricao} ${p.tipo} ${p.tratativa}`);
      if (!termos.every((x) => alvo.includes(x))) continue;
    }
    resultado.push(p);
    if (resultado.length >= limite) break;
  }
  return resultado;
}

export function apontar(p: PendenciaCatalogo): PendenciaApontada {
  return {
    id: crypto.randomUUID(),
    codigo: p.codigo,
    descricao: p.descricao,
    tipo: p.tipo,
    prioridade: p.prioridade,
    classificacao: p.classificacao,
    tratativa: p.tratativa,
    criadoEm: Date.now(),
  };
}

export function rotuloPrioridade(prioridade: string) {
  if (prioridade === "1") return "P1";
  if (prioridade === "2") return "P2";
  return "P3";
}

export function corPrioridade(prioridade: string) {
  if (prioridade === "1") return "bg-p1 text-p1-foreground";
  if (prioridade === "2") return "bg-p2 text-p2-foreground";
  return "bg-p3 text-p3-foreground";
}
