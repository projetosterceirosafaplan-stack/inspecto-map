import type { Foto } from "./types";

const MAX_LADO = 1400;

/** Lê um arquivo de imagem, reduz e devolve uma Foto pronta para salvar/relatório. */
export async function arquivoParaFoto(file: File): Promise<Foto> {
  const dataUrlOriginal = await lerComoDataUrl(file);
  const img = await carregarImagem(dataUrlOriginal);

  let { width, height } = img;
  const maior = Math.max(width, height);
  if (maior > MAX_LADO) {
    const escala = MAX_LADO / maior;
    width = Math.round(width * escala);
    height = Math.round(height * escala);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");
  ctx.drawImage(img, 0, 0, width, height);

  return {
    id: crypto.randomUUID(),
    dataUrl: canvas.toDataURL("image/jpeg", 0.75),
    width,
    height,
    criadoEm: Date.now(),
  };
}

function lerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagem inválida"));
    img.src = src;
  });
}

export function dataUrlParaBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
