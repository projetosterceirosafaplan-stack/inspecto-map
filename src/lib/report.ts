import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { dataUrlParaBytes } from "./image";
import { rotuloPrioridade } from "./pendencias";
import type { Fiscalizacao, Foto, PendenciaApontada, Ponto, Trecho } from "./types";

const CONTENT_WIDTH = 9026; // A4 com margens de 1 polegada
const COLS = [1000, 2400, 1200, 2600, 1826] as const;
const col = (i: number) => COLS[i] ?? 1000;
const FOTO_MAX_W = 165;
const FOTO_MAX_H = 300;

const linha = { style: BorderStyle.SINGLE, size: 4, color: "B6BDC6" };
const bordas = { top: linha, bottom: linha, left: linha, right: linha };
const margens = { top: 80, bottom: 80, left: 120, right: 120 };

function texto(conteudo: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: conteudo,
        bold: opts.bold ?? false,
        size: opts.size ?? 18,
        ...(opts.color ? { color: opts.color } : {}),
      }),
    ],
  });
}

function celulaFoto(foto: Foto | undefined) {
  if (!foto) {
    return new TableCell({
      borders: bordas,
      margins: margens,
      width: { size: col(3), type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [texto("Sem foto", { color: "8A929C" })],
    });
  }

  const escala = Math.min(FOTO_MAX_W / foto.width, FOTO_MAX_H / foto.height, 1);
  const width = Math.max(60, Math.round(foto.width * escala));
  const height = Math.max(60, Math.round(foto.height * escala));

  return new TableCell({
    borders: bordas,
    margins: margens,
    width: { size: col(3), type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "jpg",
            data: dataUrlParaBytes(foto.dataUrl),
            transformation: { width, height },
            altText: {
              title: "Evidência",
              description: foto.legenda ?? "Foto da pendência",
              name: "evidencia",
            },
          }),
        ],
      }),
      ...(foto.legenda ? [texto(foto.legenda, { size: 14, color: "6B7280" })] : []),
    ],
  });
}

function cabecalhoTabela() {
  const titulos = ["CÓDIGO", "DESCRIÇÃO", "PRIORIDADE", "FOTO", "CORREÇÃO/JUSTIFICATIVA"];
  return new TableRow({
    tableHeader: true,
    children: titulos.map(
      (t, i) =>
        new TableCell({
          borders: bordas,
          margins: margens,
          width: { size: col(i), type: WidthType.DXA },
          shading: { fill: "DCE3EC", type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [texto(t, { bold: true })],
        }),
    ),
  });
}

function tabelaPendencia(local: string, p: PendenciaApontada, fallback: Foto | undefined) {
  const descricao = new TableCell({
    borders: bordas,
    margins: margens,
    width: { size: col(1), type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      texto(`${local} / ${p.classificacao || `PRIORIDADE ${p.prioridade}`}`, { bold: true }),
      texto(p.tipo),
      texto(p.descricao, { bold: true }),
      ...(p.tratativa ? [texto(`(${p.tratativa})`)] : []),
    ],
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [...COLS],
    rows: [
      cabecalhoTabela(),
      new TableRow({
        children: [
          new TableCell({
            borders: bordas,
            margins: margens,
            width: { size: col(0), type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [texto(p.codigo, { bold: true })],
          }),
          descricao,
          new TableCell({
            borders: bordas,
            margins: margens,
            width: { size: col(2), type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [texto(rotuloPrioridade(p.prioridade), { bold: true })],
          }),
          celulaFoto(p.foto ?? fallback),
          new TableCell({
            borders: bordas,
            margins: margens,
            width: { size: col(4), type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [texto(p.justificativa ?? "")],
          }),
        ],
      }),
    ],
  });
}

function blocoInfo(f: Fiscalizacao) {
  const itens: [string, string][] = [
    ["Projeto", f.projeto || "—"],
    ["Empreiteira", f.empreiteira || "—"],
    ["Data da Fiscalização", formatarData(f.dataFiscalizacao)],
    ["Fiscal", f.fiscal || "—"],
    ["Tipo de Projeto", f.tipoProjeto || "—"],
    ["Porte do Projeto", f.porteProjeto || "—"],
  ];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3200, 5826],
    rows: itens.map(
      ([rotulo, valor]) =>
        new TableRow({
          children: [
            new TableCell({
              borders: bordas,
              margins: margens,
              width: { size: 3200, type: WidthType.DXA },
              shading: { fill: "EDF1F6", type: ShadingType.CLEAR },
              children: [
                new Paragraph({ children: [new TextRun({ text: rotulo, bold: true, size: 20 })] }),
              ],
            }),
            new TableCell({
              borders: bordas,
              margins: margens,
              width: { size: 5826, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: valor, size: 20 })] })],
            }),
          ],
        }),
    ),
  });
}

function formatarData(iso: string) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : iso;
}

function espaco(after = 160) {
  return new Paragraph({ spacing: { after }, children: [new TextRun("")] });
}

function tituloLocal(nome: string, coords?: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text: nome, bold: true, size: 26 }),
      ...(coords ? [new TextRun({ text: `   ${coords}`, size: 18, color: "6B7280" })] : []),
    ],
  });
}

export function nomeRelatorio(f: Fiscalizacao) {
  return `Relatorio_Pendencias_${(f.projeto || "projeto").replace(/[^\w-]+/g, "_")}.docx`;
}

export async function gerarRelatorioBlob(f: Fiscalizacao): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "RELATÓRIO DE PENDÊNCIAS CONSTRUTIVAS", bold: true, size: 34 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "Relatório fotográfico de fiscalização de campo", size: 20, color: "6B7280" })],
    }),
    blocoInfo(f),
    espaco(240),
  ];

  const locais: { nome: string; coords?: string; item: Ponto | Trecho }[] = [
    ...f.pontos
      .filter((p) => p.pendencias.length > 0)
      .map((p) => ({
        nome: `POSTE ${p.codigo || "sem código"}`,
        coords: `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`,
        item: p as Ponto,
      })),
    ...f.trechos
      .filter((t) => t.pendencias.length > 0)
      .map((t) => ({
        nome: /^trecho/i.test(t.nome.trim()) ? t.nome.toUpperCase() : `TRECHO ${t.nome || "sem nome"}`,
        coords: `${t.path.length} vértices`,
        item: t as Trecho,
      })),
  ];

  if (locais.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Nenhuma pendência registrada nesta fiscalização.", size: 22 })],
      }),
    );
  }

  for (const local of locais) {
    children.push(tituloLocal(local.nome, local.coords));
    if (local.item.observacao) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: local.item.observacao, size: 20, italics: true })],
        }),
      );
    }
    const etiqueta = "codigo" in local.item ? local.item.codigo : local.item.nome;
    for (const p of local.item.pendencias) {
      children.push(tabelaPendencia(etiqueta || local.nome, p, undefined));
      children.push(espaco(200));
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Página ", size: 16, color: "6B7280" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "6B7280" }),
                  new TextRun({ text: " de ", size: 16, color: "6B7280" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "6B7280" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function gerarRelatorio(f: Fiscalizacao) {
  const blob = await gerarRelatorioBlob(f);
  baixar(blob, nomeRelatorio(f));
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
