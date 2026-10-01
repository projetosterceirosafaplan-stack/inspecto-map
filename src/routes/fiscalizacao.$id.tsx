import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  Hand,
  Crosshair,
  LocateFixed,
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
  const [gps, setGps] = useState<{ lat: number; lng: number; precisao: number } | null>(null);
  const [foco, setFoco] = useState<{ lat: number; lng: number; t: number } | null>(null);

  useEffect(() => {
    obterFiscalizacao(id).then((r) => setF(r ?? null));
  }, [id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(
      (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  function obterGps(): Promise<{ lat: number; lng: number; precisao: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS indisponível"));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
        (e) => reject(e),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    });
  }

  async function localizar() {
    try {
      const g = gps ?? (await obterGps());
      setGps(g);
      setFoco({ lat: g.lat, lng: g.lng, t: Date.now() });
    } catch {
      toast.error("Não foi possível obter sua localização. Verifique se o GPS está ligado e permitido.");
    }
  }

  async function posteNoGps() {
    const t = toast.loading("Obtendo posição do GPS...");
    try {
      const g = await obterGps().catch(() => {
        if (gps) return gps;
        throw new Error("sem gps");
      });
      setGps(g);
      criarPoste({ lat: g.lat, lng: g.lng });
      setFoco({ lat: g.lat, lng: g.lng, t: Date.now() });
      toast.success(`Poste criado no GPS (precisão ~${Math.round(g.precisao)} m)`, { id: t });
    } catch {
      toast.error("Não foi possível obter sua localização. Verifique se o GPS está ligado e permitido.", { id: t });
    }
  }

  const atualizar = useCallback((patch: (atual: Fiscalizacao) => Fiscalizacao) => {
    setF((atual) => {
      if (!atual) return atual;
      const proximo = patch(atual);
      void salvarFiscalizacao(proximo);
      return proximo;
    });
  }, []);

  const criarPoste = useCallback(
    (coord: { lat: number; lng: number }) => {
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
    },
    [atualizar],
  );

  const handleMapaClique = useCallback(
    (coord: { lat: number; lng: number }) => {
      if (modo === "poste") criarPoste(coord);
      else if (modo === "trecho") toast.info("Toque em um poste para vincular o trecho");
    },
    [modo, criarPoste],
  );

  const [trechoPostes, setTrechoPostes] = useState<Ponto[]>([]);

  function cancelarTrecho() {
    setTrechoPostes([]);
    setRascunho([]);
  }

  function escolherPosteDoTrecho(p: Ponto) {
    const primeiro = trechoPostes[0];
    if (!primeiro) {
      setTrechoPostes([p]);
      setRascunho([{ lat: p.lat, lng: p.lng }]);
      return;
    }
    if (primeiro.id === p.id) {
      toast.error("Escolha um poste diferente");
      return;
    }
    const rotulo = (x: Ponto) => x.codigo || "?";
    const trecho: Trecho = {
      id: crypto.randomUUID(),
      nome: `Trecho ${rotulo(primeiro)}-${rotulo(p)}`,
      path: [
        { lat: primeiro.lat, lng: primeiro.lng },
        { lat: p.lat, lng: p.lng },
      ],
      posteIds: [primeiro.id, p.id],
      fotos: [],
      pendencias: [],
      criadoEm: Date.now(),
    };
    atualizar((a) => ({ ...a, trechos: [...a.trechos, trecho] }));
    cancelarTrecho();
    setModo("navegar");
    setSelecionado({ tipo: "trecho", id: trecho.id });
    toast.success(`${trecho.nome} criado`);
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

  const selecionarPonto = (pid: string) => {
    if (modo === "trecho") {
      const p = f?.pontos.find((x) => x.id === pid);
      if (p) escolherPosteDoTrecho(p);
      return;
    }
    setSelecionado({ tipo: "poste", id: pid });
  };
  const selecionarTrecho = useCallback(
    (tid: string) => {
      if (modo === "trecho") return;
      setSelecionado({ tipo: "trecho", id: tid });
    },
    [modo],
  );

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
          <p className="flex items-center gap-2 truncate text-sm font-semibold leading-tight">
            Projeto {f.projeto}
            {f.finalizadaEm && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-100">
                <CheckCircle2 className="size-3" />
                Finalizada
              </span>
            )}
          </p>
          <p className="truncate text-xs text-primary-foreground/70">
            {f.pontos.length} postes · {totalPendencias} pendências
          </p>
        </div>
        {f.finalizadaEm ? (
          <Button onClick={reabrir} variant="secondary" size="sm" className="gap-1.5">
            <Unlock className="size-4" />
            Reabrir
          </Button>
        ) : (
          <Button onClick={() => setConfirmarFim(true)} variant="secondary" size="sm" className="gap-1.5">
            <Lock className="size-4" />
            Finalizar
          </Button>
        )}
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
          posicaoAtual={gps}
          foco={foco}
        />

        <div className="absolute bottom-24 right-3 flex flex-col gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="size-12 rounded-full border shadow-lg"
            onClick={localizar}
            aria-label="Minha localização"
            title="Minha localização"
          >
            <LocateFixed className="size-5" />
          </Button>
          <Button
            className="h-12 gap-1.5 rounded-full shadow-lg"
            onClick={posteNoGps}
            aria-label="Inserir poste no GPS"
          >
            <Crosshair className="size-5" />
            Poste no GPS
          </Button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <div className="pointer-events-auto flex gap-1 rounded-full border bg-card p-1 shadow-lg">
            <Button
              size="sm"
              variant={modo === "navegar" ? "default" : "ghost"}
              className="gap-1.5 rounded-full"
              onClick={() => {
                setModo("navegar");
                cancelarTrecho();
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
                cancelarTrecho();
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
                  : trechoPostes[0]
                    ? `Poste ${trechoPostes[0].codigo || "?"} escolhido — toque no 2º poste`
                    : "Toque no 1º poste do trecho"}
              </span>
              {modo === "trecho" && trechoPostes.length > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={cancelarTrecho}
                  aria-label="Desfazer"
                >
                  <Undo2 className="size-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => {
                  setModo("navegar");
                  cancelarTrecho();
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

      <AlertDialog open={confirmarFim} onOpenChange={setConfirmarFim}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar esta fiscalização?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela será marcada como concluída e o pacote com os 3 arquivos ficará disponível na tela
              inicial. Você pode reabrir para editar quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finalizar}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
