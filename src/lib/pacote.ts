import JSZip from "jszip";
import type { Fiscalizacao } from "./types";
import { gerarRelatorioBlob, nomeRelatorio } from "./report";
import { gerarPlanilhaBytes, nomePlanilha } from "./planilha";
import { gerarKmzBlob, nomeKmz } from "./kmz";

/**
 * Empacota os 3 entregáveis (Word, Excel e KMZ) em um único .zip,
 * dentro de uma pasta com o nome do projeto.
 */
export async function gerarPacote(f: Fiscalizacao) {
  const projeto = (f.projeto || "projeto").replace(/[^\w-]+/g, "_");
  const pasta = `Fiscalizacao_${projeto}`;

  const [docx, xlsx, kmz] = await Promise.all([
    gerarRelatorioBlob(f),
    gerarPlanilhaBytes(f),
    gerarKmzBlob(f),
  ]);

  const zip = new JSZip();
  const dir = zip.folder(pasta)!;
  dir.file(nomeRelatorio(f), docx);
  dir.file(nomePlanilha(f), xlsx);
  dir.file(nomeKmz(f), kmz);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pasta}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
