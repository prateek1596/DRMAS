import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const DEFAULT_CENTER = [25.33, 91.82];
const DEFAULT_ZOOM = 10;
const LOCATION_HINTS = [
  { pattern: /zone\s*a|riverside/i, coords: [25.33, 91.82] },
  { pattern: /zone\s*b|highland/i, coords: [25.36, 91.86] },
  { pattern: /zone\s*c|downtown|central/i, coords: [25.34, 91.8] },
  { pattern: /zone\s*d|coastal/i, coords: [25.29, 91.85] },
  { pattern: /zone\s*e|industrial/i, coords: [25.35, 91.785] },
];

function parseCoordinates(text) {
  if (!text || typeof text !== 'string') return null;

  const regex = /(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/;
  const match = text.match(regex);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return [lat, lng];
}

function resolveLocationCoordinates(text) {
  const direct = parseCoordinates(text);
  if (direct) return direct;

  if (!text || typeof text !== 'string') return null;

  const hint = LOCATION_HINTS.find((entry) => entry.pattern.test(text));
  return hint ? hint.coords : null;
}

function zoneRadiusKm(riskLevel) {
  if (riskLevel === 'Critical') return 3.4;
  if (riskLevel === 'High') return 2.6;
  if (riskLevel === 'Moderate') return 1.9;
  return 1.2;
}

function makeZonePolygon(center, radiusKm, sides = 6) {
  const [lat, lng] = center;
  const points = [];

  const radiusLat = radiusKm / 111;
  const latRadians = (lat * Math.PI) / 180;
  const radiusLng = radiusKm / (111 * Math.max(Math.cos(latRadians), 0.25));

  for (let i = 0; i < sides; i += 1) {
    const angle = (2 * Math.PI * i) / sides;
    points.push([
      lat + radiusLat * Math.sin(angle),
      lng + radiusLng * Math.cos(angle),
    ]);
  }

  return points;
}

function riskToIntensity(level) {
  if (level === 'Critical') return 1;
  if (level === 'High') return 0.8;
  if (level === 'Moderate') return 0.55;
  return 0.35;
}

function severityToIntensity(level) {
  if (level === 'Critical') return 0.95;
  if (level === 'High') return 0.75;
  if (level === 'Moderate') return 0.5;
  return 0.3;
}

function HeatLayer({ points }) {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return undefined;

    const weighted = points
      .filter((point) => point.coords)
      .map((point) => [point.coords[0], point.coords[1], point.intensity || 0.4]);

    const layer = L.heatLayer(weighted, {
      radius: 28,
      blur: 20,
      maxZoom: 16,
      minOpacity: 0.35,
      gradient: {
        0.2: '#2dc6ff',
        0.4: '#22c55e',
        0.6: '#f59e0b',
        0.85: '#f97316',
        1: '#ef4444',
      },
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

export default function HazardMap({
  hazardZones,
  disasters,
  showHeat = true,
  filters = {},
}) {
  const mapData = useMemo(() => {
    const riskFilter = filters.riskLevels || [];
    const severityFilter = filters.severities || [];
    const statusFilter = filters.statuses || [];
    const typeFilter = filters.types || [];
    const showHazards = filters.showHazards !== false;
    const showDisasters = filters.showDisasters !== false;

    const hazards = (hazardZones || [])
      .map((zone) => {
        const coords =
          resolveLocationCoordinates(zone.coordinates) ||
          resolveLocationCoordinates(zone.region) ||
          resolveLocationCoordinates(zone.name) ||
          resolveLocationCoordinates(zone.notes);
        if (!coords) return null;

        return {
          id: `haz-${zone.id}`,
          type: 'Hazard Zone',
          pointType: 'hazard',
          title: zone.name,
          subtitle: `${zone.hazardType || 'Unknown'} - ${zone.riskLevel || 'Low'}`,
          status: zone.status || 'Monitoring',
          severityRisk: zone.riskLevel || 'Low',
          category: zone.hazardType || 'Other',
          description: zone.notes || '',
          locationText: zone.coordinates || zone.region || 'Unknown',
          population: Number(zone.population || 0),
          coords,
          intensity: riskToIntensity(zone.riskLevel),
          polygon: makeZonePolygon(coords, zoneRadiusKm(zone.riskLevel)),
          color:
            zone.riskLevel === 'Critical'
              ? '#ef4444'
              : zone.riskLevel === 'High'
                ? '#f97316'
                : zone.riskLevel === 'Moderate'
                  ? '#f59e0b'
                  : '#22c55e',
        };
      })
      .filter(Boolean)
      .filter((zone) => (showHazards ? true : false))
      .filter((zone) => (riskFilter.length ? riskFilter.includes(zone.severityRisk) : true))
      .filter((zone) => (statusFilter.length ? statusFilter.includes(zone.status) : true))
      .filter((zone) => (typeFilter.length ? typeFilter.includes(zone.category) : true));

    const incidents = (disasters || [])
      .map((disaster) => {
        const coords =
          resolveLocationCoordinates(disaster.coordinates) ||
          resolveLocationCoordinates(disaster.location) ||
          resolveLocationCoordinates(disaster.info);
        if (!coords) return null;

        return {
          id: `dis-${disaster.id}`,
          type: 'Disaster',
          pointType: 'disaster',
          title: `${disaster.type} Incident`,
          subtitle: `${disaster.severity || 'Unknown'} - ${disaster.status || 'Active'}`,
          status: disaster.status || 'Active',
          severityRisk: disaster.severity || 'Low',
          category: disaster.type || 'Other',
          description: disaster.info || '',
          coordinatesText: disaster.coordinates || '',
          locationText: disaster.location || 'Unknown',
          population: Number(disaster.people || 0),
          coords,
          intensity: severityToIntensity(disaster.severity),
          color:
            disaster.severity === 'Critical'
              ? '#dc2626'
              : disaster.severity === 'High'
                ? '#ea580c'
                : disaster.severity === 'Moderate'
                  ? '#d97706'
                  : '#0ea5e9',
        };
      })
      .filter(Boolean)
      .filter((incident) => (showDisasters ? true : false))
      .filter((incident) => (severityFilter.length ? severityFilter.includes(incident.severityRisk) : true))
      .filter((incident) => (statusFilter.length ? statusFilter.includes(incident.status) : true))
      .filter((incident) => (typeFilter.length ? typeFilter.includes(incident.category) : true));

    const points = [...hazards, ...incidents];
    const center = points.length ? points[0].coords : DEFAULT_CENTER;

    return { points, center };
  }, [hazardZones, disasters]);

  return (
    <div className="hazard-map-shell">
      <MapContainer center={mapData.center} zoom={DEFAULT_ZOOM} className="hazard-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showHeat && <HeatLayer points={mapData.points} />}

        {mapData.points
          .filter((point) => point.pointType === 'hazard')
          .map((point) => (
            <Polygon
              key={`poly-${point.id}`}
              positions={point.polygon}
              pathOptions={{
                color: point.color,
                fillColor: point.color,
                fillOpacity: 0.16,
                weight: 2,
                dashArray: '5 4',
              }}
            >
              <Tooltip direction="center" opacity={0.9}>
                {point.title} zone boundary
              </Tooltip>
            </Polygon>
          ))}

        {mapData.points.map((point) => (
          <CircleMarker
            key={point.id}
            center={point.coords}
            radius={point.pointType === 'hazard' ? 8 : 10}
            pathOptions={{ color: point.color, fillColor: point.color, fillOpacity: 0.55, weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700 }}>{point.title}</div>
                <div style={{ fontSize: 12 }}>{point.subtitle}</div>
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>Location: {point.locationText}</div>
              </div>
            </Tooltip>

            <Popup>
              <div style={{ minWidth: 240, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700 }}>{point.title}</div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>{point.type}</div>
                <div><strong>Status:</strong> {point.status}</div>
                <div><strong>Severity/Risk:</strong> {point.subtitle}</div>
                <div><strong>Location:</strong> {point.locationText}</div>
                {point.coordinatesText && <div><strong>Coordinates:</strong> {point.coordinatesText}</div>}
                <div><strong>Population:</strong> {point.population.toLocaleString()}</div>
                {point.description && <div style={{ marginTop: 6 }}><strong>Details:</strong> {point.description}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="map-legend">
        <div className="map-legend-title">Map Legend</div>
        <div className="map-legend-row"><span className="swatch sw-critical" /> Critical</div>
        <div className="map-legend-row"><span className="swatch sw-high" /> High</div>
        <div className="map-legend-row"><span className="swatch sw-moderate" /> Moderate</div>
        <div className="map-legend-row"><span className="swatch sw-low" /> Low</div>
        <div className="map-legend-row"><span className="legend-line" /> Hazard boundary polygon</div>
      </div>
    </div>
  );
}
