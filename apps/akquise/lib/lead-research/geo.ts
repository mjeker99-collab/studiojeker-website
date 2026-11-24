import type { DistanceStatus } from "./types";

/** Town-hall reference for Solothurn, used only as the air-line centre. */
export const SOLOTHURN_CENTER = { lat: 47.2089, lon: 7.5378 };

export interface PlacePoint {
  name: string;
  lat: number;
  lon: number;
}

/** Published municipal reference points. Not cadastral coordinates. */
export const PLACES: PlacePoint[] = [
  { name: "Solothurn", lat: 47.2089, lon: 7.5378 },
  { name: "Zuchwil", lat: 47.2017, lon: 7.5665 },
  { name: "Biberist", lat: 47.1806, lon: 7.5627 },
  { name: "Derendingen", lat: 47.1968, lon: 7.5892 },
  { name: "Luterbach", lat: 47.2156, lon: 7.5835 },
  { name: "Bellach", lat: 47.2138, lon: 7.4978 },
  { name: "Langendorf", lat: 47.2192, lon: 7.5152 },
  { name: "Riedholz", lat: 47.2312, lon: 7.5672 },
  { name: "Feldbrunnen-St. Niklaus", lat: 47.2242, lon: 7.5475 },
  { name: "Lommiswil", lat: 47.2304, lon: 7.4668 },
  { name: "Rüttenen", lat: 47.2452, lon: 7.5352 },
  { name: "Oberdorf", lat: 47.2318, lon: 7.5048 },
  { name: "Selzach", lat: 47.2068, lon: 7.4558 },
  { name: "Gerlafingen", lat: 47.1708, lon: 7.5712 },
  { name: "Deitingen", lat: 47.2152, lon: 7.6235 },
  { name: "Subingen", lat: 47.1988, lon: 7.6192 },
  { name: "Flumenthal", lat: 47.2378, lon: 7.5982 },
  { name: "Hubersdorf", lat: 47.2438, lon: 7.5778 },
  { name: "Günsberg", lat: 47.2572, lon: 7.5788 },
  { name: "Bettlach", lat: 47.2018, lon: 7.4242 },
  { name: "Grenchen", lat: 47.1921, lon: 7.3958 },
  { name: "Olten", lat: 47.3496, lon: 7.9033 },
];

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const radius = 6371.0088;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function placeKey(name: string): string {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("de-CH")
    .replace(/\bso\b/g, "")
    .replace(/[./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findPlace(name: string): PlacePoint | null {
  const key = placeKey(name);
  if (!key) return null;
  return PLACES.find((place) => placeKey(place.name) === key) ?? null;
}

function usablePoint(point: { lat: number; lon: number } | null): boolean {
  if (!point) return false;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return false;
  if (Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) return false;
  if (Math.abs(point.lat) < 0.01 && Math.abs(point.lon) < 0.01) return false;
  return true;
}

export function classifyDistance(
  place: string,
  explicit: { lat: number; lon: number } | null,
  center: { lat: number; lon: number },
  radiusKm: number,
): { status: DistanceStatus; km: number | null; place: string } {
  const named = findPlace(place);
  const point = usablePoint(explicit) ? explicit : named;
  if (!point || !usablePoint(center) || !Number.isFinite(radiusKm)) {
    return { status: "UNKNOWN", km: null, place: named?.name || place };
  }
  const km = haversineKm(center, point);
  const rounded = Math.round(km * 10) / 10;
  return {
    status: km <= radiusKm + 1e-6 ? "WITHIN" : "OUTSIDE",
    km: rounded,
    place: named?.name || place,
  };
}

export function placesWithin(
  center: { lat: number; lon: number },
  radiusKm: number,
): PlacePoint[] {
  return PLACES.filter(
    (place) => haversineKm(center, place) <= radiusKm + 1e-6,
  ).sort((a, b) => a.name.localeCompare(b.name, "de-CH"));
}
