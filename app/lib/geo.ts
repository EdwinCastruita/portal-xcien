// Helpers de geolocalización compartidos entre el modal de edición
// (solicitud/[id]/page.tsx) y el stepper de nueva solicitud
// (solicitud/nueva/page.tsx).

/**
 * Geocodifica "ciudad, estado" a [lat, lng] usando Nominatim (OpenStreetMap),
 * el mismo proveedor de mapas que ya usa `MapPicker` (Leaflet + tiles OSM).
 * Devuelve `null` si no hay resultados o si la petición fue cancelada/falló.
 */
export async function geocodeCityState(
  city: string,
  state: string,
  signal?: AbortSignal,
): Promise<[number, number] | null> {
  const query = [city, state, "México"].filter(Boolean).join(", ").trim();
  if (!query) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "mx");
    url.searchParams.set("q", query);
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch {
    return null;
  }
}

/** Extrae [lat, lng] de un link de Google Maps o de un texto "lat, lng". */
export function parseLatLng(text: string): [number, number] | null {
  if (!text) return null;
  const t = text.trim();
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // ...!3d19.43!4d-99.13
    /[?&](?:ll|q|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /\/place\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
    }
  }
  return null;
}
