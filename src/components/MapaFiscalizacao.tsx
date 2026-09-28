/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import type { Ponto, Trecho } from "@/lib/types";

declare global {
  interface Window {
    __initMapaFiscalizacao?: () => void;
    google?: typeof google;
  }
}

const SCRIPT_ID = "google-maps-js";
let carregando: Promise<void> | null = null;

function carregarMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (carregando) return carregando;

  carregando = new Promise<void>((resolve, reject) => {
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    if (!key) {
      reject(new Error("Chave do mapa não configurada"));
      return;
    }
    window.__initMapaFiscalizacao = () => resolve();
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initMapaFiscalizacao${
      channel ? `&channel=${channel}` : ""
    }`;
    script.onerror = () => reject(new Error("Falha ao carregar o mapa"));
    document.head.appendChild(script);
  });
  return carregando;
}

export type Modo = "navegar" | "poste" | "trecho";

interface Props {
  pontos: Ponto[];
  trechos: Trecho[];
  modo: Modo;
  selecionadoId: string | null;
  rascunhoTrecho: { lat: number; lng: number }[];
  onMapaClique: (coord: { lat: number; lng: number }) => void;
  onSelecionarPonto: (id: string) => void;
  onSelecionarTrecho: (id: string) => void;
}

export function MapaFiscalizacao({
  pontos,
  trechos,
  modo,
  selecionadoId,
  rascunhoTrecho,
  onMapaClique,
  onSelecionarPonto,
  onSelecionarTrecho,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linhasRef = useRef<google.maps.Polyline[]>([]);
  const rascunhoRef = useRef<{
    linha: google.maps.Polyline | null;
    marcadores: google.maps.Marker[];
  }>({ linha: null, marcadores: [] });
  const cliqueRef = useRef(onMapaClique);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  cliqueRef.current = onMapaClique;

  useEffect(() => {
    let ativo = true;
    carregarMaps()
      .then(() => {
        if (!ativo || !divRef.current || mapRef.current) return;
        const map = new google.maps.Map(divRef.current, {
          center: { lat: -15.78, lng: -47.93 },
          zoom: 16,
          mapTypeId: "hybrid",
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          tilt: 0,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          cliqueRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        mapRef.current = map;
        setPronto(true);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!ativo) return;
              map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              map.setZoom(18);
            },
            () => undefined,
            { enableHighAccuracy: true, timeout: 8000 },
          );
        }
      })
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, []);

  // Cursor conforme o modo
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({ draggableCursor: modo === "navegar" ? undefined : "crosshair" });
  }, [modo, pronto]);

  // Postes
  useEffect(() => {
    if (!pronto || !mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = pontos.map((p) => {
      const selecionado = p.id === selecionadoId;
      const pendencias = p.pendencias.length;
      const cor = pendencias === 0 ? "#3b82f6" : p.pendencias.some((x) => x.prioridade === "1") ? "#dc2626" : "#f59e0b";
      const marker = new google.maps.Marker({
        map: mapRef.current!,
        position: { lat: p.lat, lng: p.lng },
        title: `Poste ${p.codigo || "?"} — ${pendencias} pendência(s)`,
        label: pendencias ? { text: String(pendencias), color: "#ffffff", fontSize: "11px" } : undefined,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selecionado ? 14 : 11,
          fillColor: cor,
          fillOpacity: 1,
          strokeColor: selecionado ? "#111827" : "#ffffff",
          strokeWeight: selecionado ? 3 : 2,
        },
        zIndex: selecionado ? 99 : 10,
      });
      marker.addListener("click", () => onSelecionarPonto(p.id));
      return marker;
    });
  }, [pontos, selecionadoId, pronto, onSelecionarPonto]);

  // Trechos
  useEffect(() => {
    if (!pronto || !mapRef.current) return;
    linhasRef.current.forEach((l) => l.setMap(null));
    linhasRef.current = trechos
      .filter((t) => t.path.length > 1)
      .map((t) => {
        const selecionado = t.id === selecionadoId;
        const linha = new google.maps.Polyline({
          map: mapRef.current!,
          path: t.path,
          strokeColor: t.pendencias.length ? "#dc2626" : "#0ea5e9",
          strokeOpacity: 0.95,
          strokeWeight: selecionado ? 7 : 5,
          zIndex: selecionado ? 50 : 5,
        });
        linha.addListener("click", () => onSelecionarTrecho(t.id));
        return linha;
      });
  }, [trechos, selecionadoId, pronto, onSelecionarTrecho]);

  // Rascunho do trecho em desenho
  useEffect(() => {
    if (!pronto || !mapRef.current) return;
    rascunhoRef.current.linha?.setMap(null);
    rascunhoRef.current.marcadores.forEach((m) => m.setMap(null));
    rascunhoRef.current = { linha: null, marcadores: [] };
    if (rascunhoTrecho.length === 0) return;

    rascunhoRef.current.marcadores = rascunhoTrecho.map(
      (c) =>
        new google.maps.Marker({
          map: mapRef.current!,
          position: c,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 80,
        }),
    );
    if (rascunhoTrecho.length > 1) {
      rascunhoRef.current.linha = new google.maps.Polyline({
        map: mapRef.current,
        path: rascunhoTrecho,
        strokeColor: "#f59e0b",
        strokeOpacity: 0.9,
        strokeWeight: 5,
        zIndex: 70,
      });
    }
  }, [rascunhoTrecho, pronto]);

  if (erro) {
    return (
      <div className="flex h-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        Não foi possível abrir o mapa: {erro}
      </div>
    );
  }

  return <div ref={divRef} className="h-full w-full" />;
}
