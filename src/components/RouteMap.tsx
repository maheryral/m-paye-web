import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type LatLng = [number, number];

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 0 0 2px ${color}55, 0 2px 6px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const DEPART_ICON = pinIcon('#10b981');
const ARRIVEE_ICON = pinIcon('#f43f5e');

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [points, map]);
  return null;
}

interface RouteMapProps {
  departure?: { lat?: number | null; lng?: number | null; label?: string };
  arrival?: { lat?: number | null; lng?: number | null; label?: string };
  height?: number;
}

export default function RouteMap({
  departure,
  arrival,
  height = 340,
}: RouteMapProps) {
  const dep: LatLng | null =
    departure?.lat != null && departure?.lng != null
      ? [departure.lat, departure.lng]
      : null;
  const arr: LatLng | null =
    arrival?.lat != null && arrival?.lng != null
      ? [arrival.lat, arrival.lng]
      : null;

  const [route, setRoute] = useState<LatLng[]>([]);
  const [info, setInfo] = useState<{ km: number; min: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dep || !arr) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${dep[1]},${dep[0]};${arr[1]},${arr[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (data?.routes?.[0]) {
          const r = data.routes[0];
          const coords: LatLng[] = r.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]],
          );
          setRoute(coords);
          setInfo({ km: r.distance / 1000, min: Math.round(r.duration / 60) });
        } else {
          setError('Itinéraire introuvable');
        }
      } catch {
        if (!cancelled) setError('Impossible de calculer l\'itinéraire');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep?.[0], dep?.[1], arr?.[0], arr?.[1]]);

  if (!dep && !arr) {
    return (
      <div className="text-sm text-ink-dim bg-bg-subtle rounded-xl p-4 text-center">
        Aucune coordonnée géographique définie pour ce trajet.
      </div>
    );
  }

  const points: LatLng[] = [dep, arr].filter(Boolean) as LatLng[];
  const line = route.length > 1 ? route : points;

  return (
    <div className="space-y-2">
      <div
        className="rounded-xl overflow-hidden border border-bg-border"
        style={{ height }}
      >
        <MapContainer
          center={dep || arr || [-18.8792, 47.5079]}
          zoom={11}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {line.length > 1 && (
            <Polyline
              positions={line}
              pathOptions={{
                color: '#5B52E8',
                weight: 5,
                opacity: 0.85,
                dashArray: route.length > 1 ? undefined : '8 8',
              }}
            />
          )}
          {dep && (
            <Marker position={dep} icon={DEPART_ICON}>
              <Popup>Départ : {departure?.label ?? ''}</Popup>
            </Marker>
          )}
          {arr && (
            <Marker position={arr} icon={ARRIVEE_ICON}>
              <Popup>Arrivée : {arrival?.label ?? ''}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="flex items-center gap-3 text-xs text-ink-muted flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success-500" /> Départ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger-500" /> Arrivée
        </span>
        {loading && (
          <span className="text-brand-300">Calcul de l'itinéraire…</span>
        )}
        {info && (
          <span className="ml-auto font-semibold text-ink">
            {info.km.toFixed(1)} km · ~{info.min} min en voiture
          </span>
        )}
        {error && !loading && (
          <span className="ml-auto text-amber-500">
            {error} (ligne directe)
          </span>
        )}
      </div>
    </div>
  );
}
