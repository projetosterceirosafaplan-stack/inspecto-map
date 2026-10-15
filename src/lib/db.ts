import { openDB, type IDBPDatabase } from "idb";
import { garantirNumeros, type Fiscalizacao } from "./types";

const DB_NAME = "fiscaliza-postes";
const STORE = "fiscalizacoes";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function listarFiscalizacoes(): Promise<Fiscalizacao[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE)) as Fiscalizacao[];
  return all.map(garantirNumeros).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

export async function obterFiscalizacao(id: string): Promise<Fiscalizacao | undefined> {
  const db = await getDb();
  const f = (await db.get(STORE, id)) as Fiscalizacao | undefined;
  return f ? garantirNumeros(f) : undefined;
}

export async function salvarFiscalizacao(f: Fiscalizacao): Promise<Fiscalizacao> {
  const db = await getDb();
  const registro = { ...garantirNumeros(f), atualizadoEm: Date.now() };
  await db.put(STORE, registro);
  return registro;
}

export async function excluirFiscalizacao(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export function novaFiscalizacao(dados: Partial<Fiscalizacao>): Fiscalizacao {
  const agora = Date.now();
  return {
    id: crypto.randomUUID(),
    projeto: "",
    empreiteira: "",
    dataFiscalizacao: new Date().toISOString().slice(0, 10),
    fiscal: "",
    tipoProjeto: "Extensão MT",
    porteProjeto: "Grande Porte",
    pontos: [],
    trechos: [],
    criadoEm: agora,
    atualizadoEm: agora,
    ...dados,
  };
}
