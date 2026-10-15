import JSZip from "jszip";
import { dataUrlParaBytes } from "./image";
import { rotuloPrioridade } from "./pendencias";
import type { Fiscalizacao, Foto, PendenciaApontada } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function descricao(
  zip: JSZip,
  prefixo: string,
  observacao: string | undefined,
  fotos: Foto[],
  pendencias: PendenciaApontada[],
) {
  let html = "";
  if (observacao) html += `<p><i>${esc(observacao)}</i></p>`;
  if (pendencias.length === 0) html += "<p><b>Sem pendências</b></p>";
  else {
    html += "<p><b>Pendências:</b></p><ul>";
    for (const p of pendencias) {
      html += `<li><b>${esc(p.codigo)}</b> — ${esc(p.descricao)} (${esc(rotuloPrioridade(p.prioridade))})`;
      if (p.justificativa) html += `<br/>${esc(p.justificativa)}`;
      html += "</li>";
    }
    html += "</ul>";
  }
  const todas: { foto: Foto; titulo: string }[] = [
    ...fotos.map((foto) => ({ foto, titulo: foto.legenda || "Foto geral" })),
    ...pendencias.filter((p) => p.foto).map((p) => ({ foto: p.foto!, titulo: `Evidência ${p.codigo}` })),
  ];
  todas.forEach(({ foto, titulo }, i) => {
    const nome = `files/${prefixo}_${i + 1}.jpg`;
    zip.file(nome, dataUrlParaBytes(foto.dataUrl));
    html += `<p>${esc(titulo)}<br/><img src="${nome}" width="1600"/></p>`;
  });
  return `<![CDATA[${html}]]>`;
}

export function nomeKmz(f: Fiscalizacao) {
  return `Fiscalizacao_${(f.projeto || "projeto").replace(/[^\w-]+/g, "_")}.kmz`;
}

export async function gerarKmzBlob(f: Fiscalizacao): Promise<Blob> {
  const zip = new JSZip();
  const marcas: string[] = [];
  f.pontos.forEach((p, i) => {
    marcas.push(`<Placemark><name>${esc(p.codigo ? `${p.numero ?? ""} - ${p.codigo}` : (p.numero ?? `Poste ${i + 1}`))}</name>
<styleUrl>#${p.pendencias.length ? "pend" : "ok"}</styleUrl>
<description>${descricao(zip, `poste${i + 1}`, p.observacao, p.fotos, p.pendencias)}</description>
<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`);
  });
  f.trechos.forEach((t, i) => {
    const coords = t.path.map((c) => `${c.lng},${c.lat},0`).join(" ");
    marcas.push(`<Placemark><name>${esc(t.nome || `Trecho ${i + 1}`)}</name>
<styleUrl>#linha</styleUrl>
<description>${descricao(zip, `trecho${i + 1}`, t.observacao, t.fotos, t.pendencias)}</description>
<LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark>`);
  });
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<name>${esc(`Projeto ${f.projeto}`)}</name>
<Style id="pend"><IconStyle><color>ff0000ff</color><Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon></IconStyle></Style>
<Style id="ok"><IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon></IconStyle></Style>
<Style id="linha"><LineStyle><color>ff00a5ff</color><width>4</width></LineStyle></Style>
${marcas.join("\n")}
</Document></kml>`;
  zip.file("doc.kml", kml);
  return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.google-earth.kmz" });
}

export async function gerarKmz(f: Fiscalizacao) {
  const blob = await gerarKmzBlob(f);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeKmz(f);
  a.click();
  URL.revokeObjectURL(url);
}
