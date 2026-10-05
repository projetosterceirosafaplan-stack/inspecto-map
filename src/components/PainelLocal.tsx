import { useRef, useState } from "react";
import { Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { arquivoParaFoto } from "@/lib/image";
import { corPrioridade, rotuloPrioridade } from "@/lib/pendencias";
import type { Foto, PendenciaApontada, Ponto, Trecho } from "@/lib/types";
import { toast } from "sonner";

type Local = Ponto | Trecho;

interface Props {
  local: Local;
  kind: "poste" | "trecho";
  onChange: (patch: Partial<Ponto & Trecho>) => void;
  onExcluir: () => void;
  onAdicionarPendencia: () => void;
}

function BotaoFoto({
  onFoto,
  label,
  variant = "secondary",
}: {
  onFoto: (f: Foto) => void;
  label: string;
  variant?: "secondary" | "outline" | "default";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = useState(false);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setCarregando(true);
          try {
            onFoto(await arquivoParaFoto(file));
          } catch {
            toast.error("Não foi possível usar essa imagem");
          } finally {
            setCarregando(false);
          }
        }}
      />
      <Button
        type="button"
        size="sm"
        variant={variant}
        disabled={carregando}
        onClick={() => ref.current?.click()}
        className="gap-1.5"
      >
        <Camera className="size-4" />
        {carregando ? "Processando..." : label}
      </Button>
    </>
  );
}

export function PainelLocal({ local, kind, onChange, onExcluir, onAdicionarPendencia }: Props) {
  const pendencias = local.pendencias;

  type PatchPendencia = { [K in keyof PendenciaApontada]?: PendenciaApontada[K] | undefined };

  function atualizarPendencia(id: string, patch: PatchPendencia) {
    onChange({
      pendencias: pendencias.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    } as Partial<Ponto & Trecho>);
  }

  function removerPendencia(id: string) {
    onChange({ pendencias: pendencias.filter((p) => p.id !== id) } as Partial<Ponto & Trecho>);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {kind === "poste" ? "Poste" : "Trecho"}
          </p>
          {kind === "poste" ? (
            <>
              <Input
                value={(local as Ponto).codigo}
                onChange={(e) => onChange({ codigo: e.target.value })}
                placeholder="Código do poste (asbuilt)"
                className="mt-1 h-9 font-mono"
              />
              <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                {(local as Ponto).lat.toFixed(6)}, {(local as Ponto).lng.toFixed(6)}
              </p>
            </>
          ) : (
            <>
              <Input
                value={(local as Trecho).nome}
                onChange={(e) => onChange({ nome: e.target.value })}
                placeholder="Identificação do trecho"
                className="mt-1 h-9"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {(local as Trecho).path.length} vértices
              </p>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onExcluir} aria-label="Excluir local">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Observação do local
          </Label>
          <Textarea
            value={local.observacao ?? ""}
            onChange={(e) => onChange({ observacao: e.target.value })}
            placeholder="Anotações gerais deste local"
            className="mt-1.5 min-h-16 text-sm"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Fotos do local ({local.fotos.length})
            </Label>
            <BotaoFoto
              label="Foto"
              variant="outline"
              onFoto={(f) => onChange({ fotos: [...local.fotos, f] } as Partial<Ponto & Trecho>)}
            />
          </div>
          {local.fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {local.fotos.map((f) => (
                <div key={f.id} className="group relative overflow-hidden rounded-md border">
                  <img src={f.dataUrl} alt="Foto do local" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        fotos: local.fotos.filter((x) => x.id !== f.id),
                      } as Partial<Ponto & Trecho>)
                    }
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive"
                    aria-label="Remover foto"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Pendências ({pendencias.length})
            </Label>
            <Button size="sm" onClick={onAdicionarPendencia} className="gap-1.5">
              <Plus className="size-4" />
              Pendência
            </Button>
          </div>

          {pendencias.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhuma pendência lançada neste local.
            </p>
          ) : (
            <ul className="space-y-3">
              {pendencias.map((p) => (
                <li key={p.id} className="surface-panel p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                      {p.codigo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground">{p.tipo}</p>
                    </div>
                    <Badge className={`${corPrioridade(p.prioridade)} border-0`}>
                      {rotuloPrioridade(p.prioridade)}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => removerPendencia(p.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remover pendência"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    {p.foto ? (
                      <div className="relative">
                        <img
                          src={p.foto.dataUrl}
                          alt="Evidência da pendência"
                          className="size-20 rounded-md border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => atualizarPendencia(p.id, { foto: undefined })}
                          className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-1 text-destructive"
                          aria-label="Remover evidência"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground">
                        <ImagePlus className="size-5" />
                        <span className="text-[10px]">sem foto</span>
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <BotaoFoto
                        label={p.foto ? "Trocar evidência" : "Foto da evidência"}
                        onFoto={(f) => atualizarPendencia(p.id, { foto: f })}
                      />
                      <Textarea
                        value={p.justificativa ?? ""}
                        onChange={(e) => atualizarPendencia(p.id, { justificativa: e.target.value })}
                        placeholder="Correção / justificativa"
                        className="min-h-14 text-sm"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
