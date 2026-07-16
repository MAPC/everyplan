'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MunicipalityProperties {
  town?: string;
  name?: string;
  slug?: string;
  is_mapc?: boolean;
  is_nspc?: boolean;
  has_plan?: boolean;
  plan_count?: number;
  [key: string]: unknown;
}

interface MunicipalityFeature {
  type: 'Feature';
  properties: MunicipalityProperties;
  geometry: { type: string; coordinates: unknown };
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: MunicipalityFeature[];
}

interface MapViewProps {
  onMunicipalityClick?: (name: string) => void;
  highlightMunicipality?: string | null;
  showMAPCOverlay?: boolean;
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/-by-the-/i, '-by-the-');
}

export default function MapView({
  onMunicipalityClick,
  highlightMunicipality,
  showMAPCOverlay = true,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const layerRef = useRef<unknown>(null);
  const highlightLayerRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const geojsonDataRef = useRef<GeoJSONData | null>(null);

  // Highlight municipality from external source (search hover)
  const updateHighlight = useCallback((muniName: string | null) => {
    if (!mapRef.current || !geojsonDataRef.current) return;
    const L = (window as unknown as Record<string, unknown>).L as typeof import('leaflet');
    if (!L) return;

    const map = mapRef.current as import('leaflet').Map;

    // Remove existing highlight
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current as import('leaflet').Layer);
      highlightLayerRef.current = null;
    }

    if (!muniName) return;

    const nameUpper = muniName.toUpperCase();
    const feature = geojsonDataRef.current.features.find(
      f => (f.properties.town || '').toUpperCase() === nameUpper
    );

    if (feature) {
      const hl = L.geoJSON(feature as unknown as GeoJSON.GeoJsonObject, {
        style: () => ({
          fillColor: '#2E9E78',
          fillOpacity: 0.7,
          weight: 2.5,
          color: '#1B4F72',
          opacity: 1,
        }),
      }).addTo(map);
      highlightLayerRef.current = hl;
    }
  }, []);

  useEffect(() => {
    if (highlightMunicipality !== undefined) {
      updateHighlight(highlightMunicipality);
    }
  }, [highlightMunicipality, updateHighlight]);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        const L = (await import('leaflet')).default;
        // Store on window for highlight callback
        (window as unknown as Record<string, unknown>).L = L;

        // Load Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          // Wait for CSS to load
          await new Promise(r => setTimeout(r, 200));
        }

        if (cancelled || mapRef.current) return;

        // Massachusetts bounds (matching DataCommon)
        const maBounds: [[number, number], [number, number]] = [
          [41.186, -74.008],
          [42.887, -69.861],
        ];

        const map = L.map(mapContainerRef.current, {
          center: [42.2, -71.8],
          zoom: 9,
          scrollWheelZoom: true,
          zoomControl: false,
          maxBounds: [
            [40.5, -74.5],
            [43.5, -69.0],
          ],
          minZoom: 7,
          maxZoom: 16,
        });

        mapRef.current = map;

        // Add zoom control to top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Light basemap (CartoDB Positron — similar to DataCommon's clean style)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);

        // Add labels on top (so labels appear above polygons)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 19,
          pane: 'overlayPane',
        }).addTo(map);

        // Load GeoJSON
        const response = await fetch('/ma-munis.geojson');
        if (!response.ok) throw new Error('Failed to load municipality boundaries');
        const data: GeoJSONData = await response.json();
        geojsonDataRef.current = data;

        if (cancelled) return;

        // Style: all 351 MA municipalities with thin teal boundary lines
        const baseStyle = (feature?: GeoJSON.Feature): Record<string, unknown> => {
          if (!feature) return {};
          const props = feature.properties as MunicipalityProperties;
          const isMaPC = props.is_mapc;
          const hasPlan = props.has_plan;

          return {
            fillColor: hasPlan ? '#2E9E78' : isMaPC ? '#e8f4ef' : '#f3f4f6',
            fillOpacity: hasPlan ? 0.45 : isMaPC ? 0.35 : 0.15,
            weight: isMaPC ? 1.2 : 0.5,
            color: isMaPC ? '#2E9E78' : '#d1d5db',
            opacity: 1,
          };
        };

        // Create the main GeoJSON layer
        const geojsonLayer = L.geoJSON(data as unknown as GeoJSON.GeoJsonObject, {
          style: baseStyle,
          onEachFeature: (feature, layer) => {
            const props = feature.properties as MunicipalityProperties;
            const townName = titleCase(props.town || props.name || 'Unknown');
            const planCount = props.plan_count || 0;
            const isMaPC = props.is_mapc;

            // Tooltip
            const tooltipContent = `
              <div style="font-family: Inter, sans-serif; padding: 2px 0;">
                <strong style="font-size: 13px; color: #1B4F72;">${townName}</strong>
                ${isMaPC ? `<br/><span style="font-size: 11px; color: #555;">
                  ${planCount > 0
                    ? `<span style="color: #2E9E78; font-weight: 500;">${planCount} plan${planCount !== 1 ? 's' : ''} indexed</span>`
                    : 'MAPC municipality'
                  }
                </span>` : `<br/><span style="font-size: 11px; color: #999;">Non-MAPC</span>`}
              </div>
            `;

            layer.bindTooltip(tooltipContent, {
              sticky: true,
              direction: 'top',
              offset: [0, -8],
              className: 'ep-tooltip',
            });

            // Hover effect
            layer.on({
              mouseover: (e) => {
                const target = e.target as L.Path;
                target.setStyle({
                  fillColor: '#2E9E78',
                  fillOpacity: 0.7,
                  weight: 2.5,
                  color: '#1B4F72',
                });
                target.bringToFront();
              },
              mouseout: () => {
                geojsonLayer.resetStyle(layer as L.Path);
              },
              click: () => {
                if (onMunicipalityClick) {
                  onMunicipalityClick(townName);
                }
              },
            });
          },
        }).addTo(map);

        layerRef.current = geojsonLayer;

        // Fit to MAPC municipalities (not all of MA)
        const mapcFeatures = data.features.filter(f => f.properties.is_mapc);
        if (mapcFeatures.length > 0) {
          const mapcLayer = L.geoJSON({
            type: 'FeatureCollection',
            features: mapcFeatures,
          } as unknown as GeoJSON.GeoJsonObject);
          const bounds = mapcLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [20, 20],
              paddingTopLeft: [320, 20], // Leave room for sidebar
            });
          }
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('Map error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load map');
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [onMunicipalityClick, showMAPCOverlay]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-ep-bg">
        <div className="text-center p-6">
          <p className="text-coral font-medium mb-1">Map unavailable</p>
          <p className="text-sm text-ep-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ep-bg/80 z-10">
          <div className="flex items-center gap-2 text-ep-secondary">
            <div className="h-5 w-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading map...</span>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
