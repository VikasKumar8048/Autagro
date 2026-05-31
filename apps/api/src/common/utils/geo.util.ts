/** Haversine distance in kilometers between two WGS84 points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rough INR transport estimate: base + per-km rate (configurable via env). */
export function estimateTransportFee(distanceKm: number): number {
  const base = Number(process.env.TRANSPORT_BASE_FEE_INR ?? 500);
  const perKm = Number(process.env.TRANSPORT_PER_KM_INR ?? 15);
  return Math.round(base + distanceKm * perKm);
}
