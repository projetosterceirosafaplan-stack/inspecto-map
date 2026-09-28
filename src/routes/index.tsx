import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, MapPin, Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  excluirFiscalizacao,
  listarFiscalizacoes,
  novaFiscalizacao,
  salvarFiscalizacao,
} from "@/lib/db";
import { PORTES_PROJETO, TIPOS_PROJETO, type Fiscalizacao } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fiscaliza Postes — Pendências construtivas em campo" },
      {
        name: "description",
        content:
          "Fiscalize postes do asbuilt no mapa, lance pendências construtivas com foto de evidência e gere o relatório fotográfico em Word.",
      },
      { property: "og:title", content: "Fiscaliza Postes — Pendências construtivas em campo" },
      {
        property: "og:description",
        content:
          "Marque postes e trechos no mapa, registre pendências com evidência fotográfica e emita o relatório em Word.",
      },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<Fiscalizacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    projeto: "",
    empreiteira: "",
    dataFiscalizacao: new Date().toISOString().slice(0, 10),
    fiscal: "",
    tipoProjeto: TIPOS_PROJETO[0] ?? "Extensão MT",
    porteProjeto: PORTES_PROJETO[2] ?? "Grande Porte",
  });

  useEffect(() => {
    listarFiscalizacoes().then(setLista);
  }, []);

  async function criar() {
    if (!form.projeto.trim()) {
      toast.error("Informe o número do projeto");
      return;
    }
    const f = await salvarFiscalizacao(novaFiscalizacao(form));
    navigate({ to: "/fiscalizacao/$id", params: { id: f.id } });
  }

  async function remover(id: string) {
    await excluirFiscalizacao(id);
    setLista(await listarFiscalizacoes());
    toast.success("Fiscalização excluída");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-5">
          <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground">
            <Zap className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-none">Fiscaliza Postes</h1>
            <p className="mt-1 text-xs text-primary-foreground/70">
              Pendências construtivas · relatório fotográfico
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Fiscalizações</h2>
          <Button onClick={() => setAberto(true)} className="gap-1.5">
            <Plus className="size-4" />
            Nova fiscalização
          </Button>
        </div>

        {lista.length === 0 ? (
          <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma fiscalização ainda. Crie a primeira para começar a marcar postes no mapa.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {lista.map((f) => {
              const pendencias =
                f.pontos.reduce((s, p) => s + p.pendencias.length, 0) +
                f.trechos.reduce((s, t) => s + t.pendencias.length, 0);
              return (
                <li key={f.id} className="surface-panel flex items-center gap-3 p-4">
                  <Link
                    to="/fiscalizacao/$id"
                    params={{ id: f.id }}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-semibold">Projeto {f.projeto || "sem número"}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {f.empreiteira || "sem empreiteira"} · {f.tipoProjeto} · {f.porteProjeto}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{new Date(f.dataFiscalizacao).toLocaleDateString("pt-BR")}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {f.pontos.length} postes · {f.trechos.length} trechos
                      </span>
                      <span className="font-medium text-foreground">{pendencias} pendências</span>
                    </p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remover(f.id)}
                    aria-label="Excluir fiscalização"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova fiscalização</DialogTitle>
            <DialogDescription>
              Estes dados formam o cabeçalho do relatório de pendências.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="projeto">Projeto</Label>
              <Input
                id="projeto"
                value={form.projeto}
                onChange={(e) => setForm({ ...form, projeto: e.target.value })}
                placeholder="440228303"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="empreiteira">Empreiteira</Label>
              <Input
                id="empreiteira"
                value={form.empreiteira}
                onChange={(e) => setForm({ ...form, empreiteira: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="fiscal">Fiscal</Label>
              <Input
                id="fiscal"
                value={form.fiscal}
                onChange={(e) => setForm({ ...form, fiscal: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="data">Data da fiscalização</Label>
              <Input
                id="data"
                type="date"
                value={form.dataFiscalizacao}
                onChange={(e) => setForm({ ...form, dataFiscalizacao: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Tipo de projeto</Label>
              <Select
                value={form.tipoProjeto}
                onValueChange={(v) => setForm({ ...form, tipoProjeto: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PROJETO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Porte do projeto</Label>
              <Select
                value={form.porteProjeto}
                onValueChange={(v) => setForm({ ...form, porteProjeto: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTES_PROJETO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={criar}>Começar fiscalização</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
