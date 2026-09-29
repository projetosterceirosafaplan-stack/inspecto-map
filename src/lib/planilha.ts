import type { Fiscalizacao } from "./types";

export async function gerarPlanilha(f: Fiscalizacao) {
  const XLSX = await import("xlsx");
  const linhas: (string | number)[][] = [
    ["Nº DA NOTA", "POSTE (BARRAMENTO)", "CÓDIGO", "DESCRIÇÃO", "TIPO", "PRIORIDADE", "TRATATIVA", "JUSTIFICATIVA"],
  ];
  for (const p of f.pontos) {
    if (p.pendencias.length === 0) {
      linhas.push([f.projeto, p.codigo, "", "Sem pendências", "", "", "", ""]);
      continue;
    }
    for (const x of p.pendencias) {
      linhas.push([f.projeto, p.codigo, x.codigo, x.descricao, x.tipo, x.prioridade, x.tratativa, x.justificativa ?? ""]);
    }
  }
  for (const t of f.trechos) {
    for (const x of t.pendencias) {
      linhas.push([f.projeto, `Trecho ${t.nome}`, x.codigo, x.descricao, x.tipo, x.prioridade, x.tratativa, x.justificativa ?? ""]);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  ws["!cols"] = [14, 20, 12, 60, 18, 12, 40, 30].map((wch) => ({ wch }));
  ws["!autofilter"] = { ref: `A1:H${linhas.length}` };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pendências");
  XLSX.writeFile(wb, `Pendencias_Nota_${f.projeto || "sem-numero"}.xlsx`);
}
