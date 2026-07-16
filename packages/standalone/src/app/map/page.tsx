'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const MapSearchSidebar = dynamic(() => import('@/components/MapSearchSidebar'), { ssr: false });

interface MunicipalityEntry {
  name: string;
  is_mapc: boolean;
  is_nspc: boolean;
  has_plan: boolean;
  plan_count: number;
}

export default function MapPage() {
  const router = useRouter();
  const [highlightedMuni, setHighlightedMuni] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<MunicipalityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load municipality data from the GeoJSON
  useEffect(() => {
    const loadMunis = async () => {
      try {
        const res = await fetch('/ma-munis.geojson');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        const munis: MunicipalityEntry[] = data.features
          .map((f: { properties: Record<string, unknown> }) => ({
            name: titleCase((f.properties.town as string) || (f.properties.name as string) || ''),
            is_mapc: Boolean(f.properties.is_mapc),
            is_nspc: Boolean(f.properties.is_nspc),
            has_plan: Boolean(f.properties.has_plan),
            plan_count: (f.properties.plan_count as number) || 0,
          }))
          .filter((m: MunicipalityEntry) => m.name);

        setMunicipalities(munis);
      } catch (err) {
        console.error('Failed to load municipalities:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMunis();
  }, []);

  const handleMunicipalityClick = useCallback(
    (name: string) => {
      router.push(`/plans?municipality=${encodeURIComponent(name)}`);
    },
    [router]
  );

  const handleHover = useCallback((name: string | null) => {
    setHighlightedMuni(name);
  }, []);

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <MapView
          onMunicipalityClick={handleMunicipalityClick}
          highlightMunicipality={highlightedMuni}
          showMAPCOverlay={true}
        />
      </div>

      {/* Search sidebar overlaid on map */}
      {!loading && (
        <MapSearchSidebar
          municipalities={municipalities}
          onHover={handleHover}
          onClick={handleMunicipalityClick}
          selectedMunicipality={highlightedMuni}
        />
      )}
    </div>
  );
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/-by-the-/i, '-by-the-');
}
