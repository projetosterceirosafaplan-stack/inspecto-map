import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buscarPendencias, corPrioridade, rotuloPrioridade, TIPOS } from "@/lib/pendencias";
import type { PendenciaCatalogo } from "@/lib/types";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSelecionar: (p: PendenciaCatalogo) => void;
}

export function PendenciaPicker({ aberto, onFechar, onSelecionar }: Props) {
  const [termo, setTermo] = useState("");
  const [tipo, setTipo] = useState<string | null>(null);

  const resultados = useMemo(() => buscarPendencias(termo, tipo), [termo, tipo]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Adicionar pendência</DialogTitle>
          <DialogDescription>
            Busque na lista oficial de pendências e toque para lançar no local selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Ex.: aterramento, placa de perigo, 2039..."
            className="pl-9"
          />
        </div>

        <div className="max-h-16 shrink-0 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5 pb-1">
            <Button
              size="sm"
              variant={tipo === null ? "default" : "outline"}
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setTipo(null)}
            >
              Todos
            </Button>
            {TIPOS.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tipo === t ? "default" : "outline"}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => setTipo(t === tipo ? null : t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          <ul className="divide-y">
            {resultados.map((p) => (
              <li key={`${p.codigo}-${p.descricao}`}>
                <button
                  type="button"
                  onClick={() => {
                    onSelecionar(p);
                    onFechar();
                  }}
                  className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-secondary"
                >
                  <span className="mt-0.5 min-w-11 rounded bg-secondary px-1.5 py-0.5 text-center font-mono text-xs text-secondary-foreground">
                    {p.codigo}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium leading-snug">{p.descricao}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.tipo} · {p.tratativa}
                    </span>
                  </span>
                  <Badge className={`${corPrioridade(p.prioridade)} shrink-0 border-0`}>
                    {rotuloPrioridade(p.prioridade)}
                  </Badge>
                </button>
              </li>
            ))}
            {resultados.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma pendência encontrada.
              </li>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
