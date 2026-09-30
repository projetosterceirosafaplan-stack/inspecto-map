import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  Hand,
  Lock,
  MapPin,
  Route as RouteIcon,
  Undo2,
  Unlock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MapaFiscalizacao, type Modo } from "@/components/MapaFiscalizacao";
import { PainelLocal } from "@/components/PainelLocal";
import { PendenciaPicker } from "@/components/PendenciaPicker";
import { obterFiscalizacao, salvarFiscalizacao } from "@/lib/db";
import { apontar } from "@/lib/pendencias";
import { gerarRelatorio } from "@/lib/report";
import { gerarPlanilha } from "@/lib/planilha";
import { gerarKmz } from "@/lib/kmz";
import type { Fiscalizacao, PendenciaCatalogo, Ponto, Trecho } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/fiscalizacao/$id")({
  head: () => ({
    meta: [
      { title: "Fiscalização em campo — Fiscaliza Postes" },
      {
        name: "description",
        content:
          "Marque postes e trechos no mapa, registre pendências construtivas com foto de evidência e gere o relatório fotográfico.",
      },
      { property: "og:title", content: "Fiscalização em campo — Fiscaliza Postes" },
      {
        property: "og:description",
        content: "Mapa de fiscalização com pendências construtivas e evidências fotográficas.",
      },
    ],
  }),
  component: Fiscalizar,
});

function Fiscalizar() {
  const { id } = Route.useParams();
  const [f, setF] = useState<Fiscalizacao | null>(null);
  const [modo, setModo] = useState<Modo>("navegar");
  const [selecionado, setSelecionado] = useState<{ tipo: "poste" | "trecho"; id: string } | null>(null);
  const [rascunho, setRascunho] = useState<{ lat: number; lng: number }[]>([]);
  const [pickerAberto, setPickerAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [confirmarFim, setConfirmarFim] = useState(false);

  useEffect(() => {
    obterFiscalizacao(id).then((r) => setF(r ?? null));
  }, [id]);

  const atualizar = useCallback((patch: (atual: Fiscalizacao) => Fiscalizacao) => {
    setF((atual) => {
      if (!atual) return atual;
      const proximo = patch(atual);
      void salvarFiscalizacao(proximo);
      return proximo;
    });
  }, []);

  const handleMapaClique = useCallback(
    (coord: { lat: number; lng: number }) => {
      if (modo === "poste") {
        const ponto: Ponto = {
          id: crypto.randomUUID(),
          codigo: "",
          lat: coord.lat,
          lng: coord.lng,
          fotos: [],
          pendencias: [],
          criadoEm: Date.now(),
        };
        atualizar((a) => ({ ...a, pontos: [...a.pontos, ponto] }));
        setSelecionado({ tipo: "poste", id: ponto.id });
        setModo("navegar");
      } else if (modo === "trecho") {
        setRascunho((r) => [...r, coord]);
      }
    },
    [modo, atualizar],
  );

  function concluirTrecho() {
    if (rascunho.length < 2) {
      toast.error("Marque pelo menos 2 pontos no trecho");
      return;
    }
    const trecho: Trecho = {
      id: crypto.randomUUID(),
      nome: "",
      path: rascunho,
      fotos: [],
      pendencias: [],
      criadoEm: Date.now(),
    };
    atualizar((a) => ({ ...a, trechos: [...a.trechos, trecho] }));
    setRascunho([]);
    setModo("navegar");
    setSelecionado({ tipo: "trecho", id: trecho.id });
  }

  const local = useMemo(() => {
    if (!f || !selecionado) return null;
    return selecionado.tipo === "poste"
      ? (f.pontos.find((p) => p.id === selecionado.id) ?? null)
      : (f.trechos.find((t) => t.id === selecionado.id) ?? null);
  }, [f, selecionado]);

  function alterarLocal(patch: Partial<Ponto & Trecho>) {
    if (!selecionado) return;
    atualizar((a) =>
      selecionado.tipo === "poste"
        ? { ...a, pontos: a.pontos.map((p) => (p.id === selecionado.id ? { ...p, ...patch } : p)) }
        : { ...a, trechos: a.trechos.map((t) => (t.id === selecionado.id ? { ...t, ...patch } : t)) },
    );
  }

  function excluirLocal() {
    if (!selecionado) return;
    atualizar((a) =>
      selecionado.tipo === "poste"
        ? { ...a, pontos: a.pontos.filter((p) => p.id !== selecionado.id) }
        : { ...a, trechos: a.trechos.filter((t) => t.id !== selecionado.id) },
    );
    setSelecionado(null);
  }

  function adicionarPendencia(cat: PendenciaCatalogo) {
    if (!local) return;
    alterarLocal({ pendencias: [...local.pendencias, apontar(cat)] } as Partial<Ponto & Trecho>);
    toast.success(`Pendência ${cat.codigo} lançada`);
  }

  async function baixarRelatorio() {
    if (!f) return;
    setGerando(true);
    try {
      await gerarRelatorio(f);
      toast.success("Relatório gerado em Word");
    } catch (e) {
      toast.error("Não foi possível gerar o relatório");
      console.error(e);
    } finally {
      setGerando(false);
    }
  }

  function finalizar() {
    atualizar((a) => ({ ...a, finalizadaEm: Date.now() }));
    setConfirmarFim(false);
    toast.success("Fiscalização finalizada. Você pode reabrir quando quiser.");
  }

  function reabrir() {
    atualizar((a) => {
      const { finalizadaEm: _ignorado, ...resto } = a;
      return resto as Fiscalizacao;
    });
    toast.success("Fiscalização reaberta para edição");
  }

  const selecionarPonto = useCallback((pid: string) => setSelecionado({ tipo: "poste", id: pid }), []);
  const selecionarTrecho = useCallback((tid: string) => setSelecionado({ tipo: "trecho", id: tid }), []);

  if (!f) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Fiscalização não encontrada.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Voltar</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totalPendencias =
    f.pontos.reduce((s, p) => s + p.pendencias.length, 0) +
    f.trechos.reduce((s, t) => s + t.pendencias.length, 0);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b bg-primary px-3 py-2.5 text-primary-foreground">
        <Button asChild variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
          <Link to="/" aria-label="Voltar">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">Projeto {f.projeto}</p>
          <p className="truncate text-xs text-primary-foreground/70">
            {f.pontos.length} postes · {totalPendencias} pendências
          </p>
        </div>
        <Button
          onClick={() =>
            gerarPlanilha(f)
              .then(() => toast.success("Planilha Excel gerada"))
              .catch(() => toast.error("Não foi possível gerar a planilha"))
          }
          variant="secondary"
          size="sm"
        >
          Excel
        </Button>
        <Button
          onClick={() =>
            gerarKmz(f)
              .then(() => toast.success("KMZ gerado"))
              .catch(() => toast.error("Não foi possível gerar o KMZ"))
          }
          variant="secondary"
          size="sm"
        >
          KMZ
        </Button>
        <Button
          onClick={baixarRelatorio}
          disabled={gerando}
          variant="secondary"
          size="sm"
          className="gap-1.5"
        >
          <FileText className="size-4" />
          {gerando ? "Gerando..." : "Relatório"}
        </Button>
      </header>

      <div className="relative flex-1">
        <MapaFiscalizacao
          pontos={f.pontos}
          trechos={f.trechos}
          modo={modo}
          selecionadoId={selecionado?.id ?? null}
          rascunhoTrecho={rascunho}
          onMapaClique={handleMapaClique}
          onSelecionarPonto={selecionarPonto}
          onSelecionarTrecho={selecionarTrecho}
        />

        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <div className="pointer-events-auto flex gap-1 rounded-full border bg-card p-1 shadow-lg">
            <Button
              size="sm"
              variant={modo === "navegar" ? "default" : "ghost"}
              className="gap-1.5 rounded-full"
              onClick={() => {
                setModo("navegar");
                setRascunho([]);
              }}
            >
              <Hand className="size-4" />
              Navegar
            </Button>
            <Button
              size="sm"
              variant={modo === "poste" ? "default" : "ghost"}
              className="gap-1.5 rounded-full"
              onClick={() => {
                setModo("poste");
                setRascunho([]);
              }}
            >
              <MapPin className="size-4" />
              Poste
            </Button>
            <Button
              size="sm"
              variant={modo === "trecho" ? "default" : "ghost"}
              className="gap-1.5 rounded-full"
              onClick={() => setModo("trecho")}
            >
              <RouteIcon className="size-4" />
              Trecho
            </Button>
          </div>
        </div>

        {modo !== "navegar" && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center px-3">
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-lg">
              <span className="text-xs text-muted-foreground">
                {modo === "poste"
                  ? "Toque no mapa para criar o poste"
                  : `Toque para marcar o trecho (${rascunho.length})`}
              </span>
              {modo === "trecho" && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setRascunho((r) => r.slice(0, -1))}
                    aria-label="Desfazer"
                  >
                    <Undo2 className="size-4" />
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5" onClick={concluirTrecho}>
                    <Check className="size-4" />
                    Concluir
                  </Button>
                </>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => {
                  setModo("navegar");
                  setRascunho([]);
                }}
                aria-label="Cancelar"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!local} onOpenChange={(v) => !v && setSelecionado(null)}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-md"
          aria-describedby={undefined}
        >
          {local && selecionado && (
            <PainelLocal
              local={local}
              kind={selecionado.tipo}
              onChange={alterarLocal}
              onExcluir={excluirLocal}
              onAdicionarPendencia={() => setPickerAberto(true)}
            />
          )}
        </SheetContent>
      </Sheet>

      <PendenciaPicker
        aberto={pickerAberto}
        onFechar={() => setPickerAberto(false)}
        onSelecionar={adicionarPendencia}
      />
    </div>
  );
}
