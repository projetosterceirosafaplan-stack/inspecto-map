import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PainelLocal } from "@/components/PainelLocal";
import type { PendenciaApontada, Ponto } from "@/lib/types";

const poste: Ponto = {
  id: "teste",
  codigo: "50201320",
  lat: -15.78,
  lng: -47.93,
  fotos: [],
  pendencias: [
    {
      id: "p1",
      codigo: "P-0001",
      descricao: "Pendência de teste",
      tipo: "Estrutural",
      prioridade: "1",
      justificativa: "",
      criadoEm: 0,
    } as unknown as PendenciaApontada,
  ],
  criadoEm: 0,
};

function DevTeste() {
  const [excluido, setExcluido] = useState(false);
  if (excluido) return <p data-testid="excluido">POSTE EXCLUIDO</p>;
  return (
    <div className="h-screen">
      <PainelLocal
        local={poste}
        kind="poste"
        onChange={() => undefined}
        onExcluir={() => setExcluido(true)}
        onAdicionarPendencia={() => undefined}
      />
    </div>
  );
}

export const Route = createFileRoute("/dev-teste")({
  component: DevTeste,
});
