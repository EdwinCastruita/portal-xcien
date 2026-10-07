"use client";

import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

declare global {
  interface Window {
    L?: any;
  }
}

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.L) return Promise.resolve(window.L);

  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LEAFLET_JS}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      if (window.L) resolve(window.L);
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

type Props = {
  lat?: number | null;
  lng?: number | null;
  /** Se llama al hacer clic o arrastrar el pin. */
  onChange: (lat: number, lng: number) => void;
  className?: string;
};

/**
 * Selector de coordenadas sobre OpenStreetMap (Leaflet vía CDN).
 * Sin dependencias npm: carga Leaflet dinámicamente.
 */
export default function MapPicker({ lat, lng, onChange, className }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  const hasPoint = typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
  const center: [number, number] = hasPoint
    ? [lat as number, lng as number]
    : [25.6866, -100.3161]; // Monterrey por defecto

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !elRef.current || mapRef.current) return;
        const map = L.map(elRef.current, { attributionControl: false }).setView(
          center,
          hasPoint ? 15 : 11,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const setMarker = (la: number, ln: number) => {
          if (markerRef.current) {
            markerRef.current.setLatLng([la, ln]);
          } else {
            markerRef.current = L.marker([la, ln], { draggable: true }).addTo(map);
            markerRef.current.on("dragend", () => {
              const p = markerRef.current.getLatLng();
              onChange(+p.lat.toFixed(6), +p.lng.toFixed(6));
            });
          }
        };
        if (hasPoint) setMarker(lat as number, lng as number);

        map.on("click", (e: any) => {
          setMarker(e.latlng.lat, e.latlng.lng);
          onChange(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
        });

        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 120);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reposiciona el pin si las coords cambian desde fuera (p. ej. pegar link).
  useEffect(() => {
    if (!mapRef.current || !window.L || !hasPoint) return;
    const L = window.L;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat as number, lng as number]);
    } else {
      markerRef.current = L.marker([lat as number, lng as number], {
        draggable: true,
      }).addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onChange(+p.lat.toFixed(6), +p.lng.toFixed(6));
      });
    }
    mapRef.current.setView([lat as number, lng as number], 15);
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) {
    return (
      <div
        className={`rounded-2xl border border-base-content/10 bg-base-content/[0.03] flex items-center justify-center text-base-content/55 text-[11px] font-bold uppercase tracking-widest ${className ?? "h-56"}`}
      >
        Mapa no disponible — usa LAT / LNG o el link de Maps
      </div>
    );
  }

  return (
    <div
      ref={elRef}
      className={`rounded-2xl overflow-hidden border border-base-content/10 ${className ?? "h-56"}`}
      style={{ background: "var(--color-base-300)" }}
    />
  );
}
