import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Battery, Wifi, Clock, Radio, Star, MapPin, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatUptime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function createIcon(node, isOwn) {
  const color = isOwn ? '#00d4d4' : node.is_favorite ? '#facc15' : node.is_gateway ? '#a78bfa' : '#6ee7b7';
  const size = isOwn ? 18 : 12;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size + 8}" height="${size + 8}" viewBox="0 0 ${size + 8} ${size + 8}">
    <circle cx="${(size + 8) / 2}" cy="${(size + 8) / 2}" r="${size / 2}" fill="${color}" stroke="white" stroke-width="2" opacity="0.95"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
    popupAnchor: [0, -((size + 8) / 2)],
  });
}

function FitBounds({ nodes }) {
  const map = useMap();
  useEffect(() => {
    const withPos = nodes.filter(n => n.latitude && n.longitude);
    if (withPos.length > 0) {
      const bounds = L.latLngBounds(withPos.map(n => [n.latitude, n.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [nodes, map]);
  return null;
}

export default function NodeMap({ nodes, ownNode }) {
  const withPos = nodes.filter(n => n.latitude && n.longitude);

  if (withPos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <MapPin className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Keine Nodes mit GPS-Position vorhanden</p>
      </div>
    );
  }

  const center = [withPos[0].latitude, withPos[0].longitude];

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: '70vh' }}>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds nodes={withPos} />
        {withPos.map((node) => {
          const isOwn = ownNode && node.node_id === ownNode.node_id;

          let distText = null;
          if (ownNode?.latitude && ownNode?.longitude && !isOwn) {
            const km = haversineDistance(ownNode.latitude, ownNode.longitude, node.latitude, node.longitude);
            distText = formatDistance(km);
          }

          return (
            <Marker
              key={node.id}
              position={[node.latitude, node.longitude]}
              icon={createIcon(node, isOwn)}
            >
              <Popup maxWidth={280} className="node-popup">
                <div className="font-sans text-sm min-w-[220px]">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    {node.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                    {node.is_gateway && <Radio className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                    {isOwn && <Zap className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white leading-tight">
                        {node.long_name || node.node_id}
                        {isOwn && <span className="ml-1 text-xs text-cyan-500">(Eigener Node)</span>}
                      </div>
                      {node.short_name && (
                        <div className="text-xs text-gray-500">{node.short_name}</div>
                      )}
                    </div>
                  </div>

                  {/* Node ID */}
                  <div className="text-xs font-mono text-gray-400 mb-2">{node.node_id}</div>

                  {/* Hardware */}
                  {node.hw_model && (
                    <div className="mb-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {node.hw_model}
                      </span>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="space-y-1">
                    {distText && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-medium">Entfernung:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{distText}</span>
                      </div>
                    )}
                    {node.battery_level !== null && node.battery_level !== undefined && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <Battery className="w-3.5 h-3.5" />
                        <span className="font-medium">Akku:</span>
                        <span>{node.battery_level > 100 ? 'USB' : `${node.battery_level}%`}</span>
                        {node.voltage && <span className="text-gray-400">({node.voltage.toFixed(2)} V)</span>}
                      </div>
                    )}
                    {node.snr !== null && node.snr !== undefined && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <Wifi className="w-3.5 h-3.5" />
                        <span className="font-medium">SNR:</span>
                        <span>{node.snr.toFixed(1)} dB</span>
                      </div>
                    )}
                    {node.altitude !== null && node.altitude !== undefined && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Höhe:</span>
                        <span>{node.altitude} m</span>
                      </div>
                    )}
                    {node.uptime_seconds > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">Uptime:</span>
                        <span>{formatUptime(node.uptime_seconds)}</span>
                      </div>
                    )}
                    {node.last_heard && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">Zuletzt:</span>
                        <span>{formatDistanceToNow(new Date(node.last_heard * 1000), { addSuffix: true })}</span>
                      </div>
                    )}
                    {node.channel_utilization !== null && node.channel_utilization !== undefined && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Ch-Util:</span>
                        <span>{node.channel_utilization.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}