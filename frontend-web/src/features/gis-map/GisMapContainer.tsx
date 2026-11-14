import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface GisFacilityPoint {
  id: string;
  name: string;
  code: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
}

interface GisMapContainerProps {
  facilities?: GisFacilityPoint[];
  selectedDistrict?: string;
  selectedRiskLevel?: string;
  center?: [number, number];
  zoom?: number;
}

const createRiskMarkerIcon = (riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') => {
  const color =
    riskLevel === 'HIGH'
      ? '#dc2626'
      : riskLevel === 'MEDIUM'
      ? '#f59e0b'
      : '#16a34a';

  const html = `
    <div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <span style="
        transform: rotate(45deg);
        color: white;
        font-size: 13px;
        line-height: 1;
      ">🔥</span>
    </div>
  `;

  return L.divIcon({
    className: 'pccc-gis-marker',
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

export function GisMapContainer({
  facilities = [],
  selectedDistrict = 'ALL',
  selectedRiskLevel = 'ALL',
  center = [10.7769, 106.7009],
  zoom = 12,
}: GisMapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PCCC GovTech G18',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const filtered = facilities.filter((item) => {
      const matchDistrict =
        selectedDistrict === 'ALL' ||
        item.district.toLowerCase().includes(selectedDistrict.toLowerCase());
      const matchRisk =
        selectedRiskLevel === 'ALL' || item.riskLevel === selectedRiskLevel;
      return matchDistrict && matchRisk;
    });

    filtered.forEach((fac) => {
      if (typeof fac.latitude !== 'number' || typeof fac.longitude !== 'number')
        return;

      const marker = L.marker([fac.latitude, fac.longitude], {
        icon: createRiskMarkerIcon(fac.riskLevel),
      });

      const riskLabel =
        fac.riskLevel === 'HIGH'
          ? 'NGUY CƠ CAO'
          : fac.riskLevel === 'MEDIUM'
          ? 'NGUY CƠ TRUNG BÌNH'
          : 'NGUY CƠ THẤP';

      const badgeColor =
        fac.riskLevel === 'HIGH'
          ? 'color: #dc2626; font-weight: bold;'
          : fac.riskLevel === 'MEDIUM'
          ? 'color: #d97706; font-weight: bold;'
          : 'color: #16a34a; font-weight: bold;';

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
          <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1e293b;">${fac.name}</h4>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;"><b>Mã:</b> ${fac.code}</p>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;"><b>Địa chỉ:</b> ${fac.address}, ${fac.district}</p>
          <p style="margin: 4px 0 8px 0; font-size: 12px;">
            <b>Mức rủi ro:</b> <span style="${badgeColor}">${riskLabel} (${fac.riskScore}/100)</span>
          </p>
          <a href="/facilities/${fac.id}" style="
            display: inline-block;
            background: #2563eb;
            color: white;
            text-decoration: none;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          ">Chi tiết cơ sở &rarr;</a>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });
  }, [facilities, selectedDistrict, selectedRiskLevel]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[550px] rounded-lg shadow-inner border border-slate-200 z-0"
    />
  );
}
