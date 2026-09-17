"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, LocateFixed, MapPin, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/types";

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  flyTo: (center: [number, number], zoom?: number, options?: Record<string, unknown>) => LeafletMap;
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => LeafletMap;
  on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => LeafletMap;
  off: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => LeafletMap;
  invalidateSize: () => void;
  remove: () => void;
};

type LeafletLayerGroup = {
  clearLayers: () => void;
  addTo: (map: LeafletMap) => LeafletLayerGroup;
};

type LeafletMarker = {
  addTo: (target: LeafletLayerGroup) => LeafletMarker;
  bindPopup: (content: HTMLElement, options?: Record<string, unknown>) => LeafletMarker;
  on: (event: string, handler: () => void) => LeafletMarker;
};

type LeafletNamespace = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => unknown };
  layerGroup: () => LeafletLayerGroup;
  marker: (coords: [number, number], options?: { icon?: unknown }) => LeafletMarker;
  divIcon: (options: Record<string, unknown>) => unknown;
  latLngBounds: (points: [number, number][]) => unknown;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const OLAVARRIA_CENTER: [number, number] = [-36.8927, -60.3225];
const ORGANIZATION_TYPES = ["Espacio cultural", "Organización cultural", "Agrupación", "Colectividad", "Peña"];

function numericCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCoordinates(contact: Contact) {
  return numericCoordinate(contact.latitude) !== null && numericCoordinate(contact.longitude) !== null;
}

function markerClass(type: string) {
  if (type === "Espacio cultural") return "cultural-marker marker-space";
  if (type === "Peña") return "cultural-marker marker-pena";
  if (type === "Colectividad") return "cultural-marker marker-community";
  if (type === "Agrupación") return "cultural-marker marker-group";
  return "cultural-marker marker-organization";
}

function popupFor(contact: Contact) {
  const root = document.createElement("div");
  root.className = "map-popup";

  const title = document.createElement("strong");
  title.textContent = contact.name;
  root.appendChild(title);

  const meta = document.createElement("span");
  meta.textContent = contact.type;
  root.appendChild(meta);

  if (contact.discipline) {
    const discipline = document.createElement("p");
    discipline.textContent = contact.discipline;
    root.appendChild(discipline);
  }

  const place = [contact.address, contact.neighborhood].filter(Boolean).join(" · ");
  if (place) {
    const location = document.createElement("small");
    location.textContent = place;
    root.appendChild(location);
  }

  return root;
}

async function loadLeaflet() {
  const cssId = "leaflet-css";
  let link = document.getElementById(cssId) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIINfQ3yn5BfyIgkZP0rZK7e6Flt5aSu4tU=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }

  if (!link.sheet) {
    await new Promise<void>((resolve, reject) => {
      const done = () => resolve();
      link?.addEventListener("load", done, { once: true });
      link?.addEventListener("error", () => reject(new Error("No se pudo cargar el estilo del mapa.")), { once: true });
      window.setTimeout(done, 2500);
    });
  }

  if (window.L) return window.L;

  const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if (window.L) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Leaflet.")), { once: true });
    });
    if (!window.L) throw new Error("Leaflet no quedó disponible.");
    return window.L;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Leaflet."));
    document.body.appendChild(script);
  });

  if (!window.L) throw new Error("Leaflet no quedó disponible.");
  return window.L;
}

export function CulturalMap({
  contacts,
  onChanged,
  onError,
}: {
  contacts: Contact[];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletNamespace | null>(null);
  const markersRef = useRef<LeafletLayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todas");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [placingId, setPlacingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const organizations = useMemo(
    () => contacts.filter((contact) => ORGANIZATION_TYPES.includes(contact.type)),
    [contacts],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return organizations.filter((contact) => {
      const matchesType = typeFilter === "Todas" || contact.type === typeFilter;
      const haystack = [contact.name, contact.type, contact.discipline, contact.neighborhood, contact.address].filter(Boolean).join(" ").toLowerCase();
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [organizations, search, typeFilter]);

  const mapped = useMemo(() => filtered.filter(hasCoordinates), [filtered]);
  const unmapped = useMemo(() => filtered.filter((contact) => !hasCoordinates(contact)), [filtered]);
  const selected = organizations.find((contact) => contact.id === selectedId) ?? null;

  useEffect(() => {
    let active = true;
    let currentMap: LeafletMap | null = null;

    loadLeaflet()
      .then((L) => {
        if (!active || !mapElementRef.current) return;
        leafletRef.current = L;
        const map = L.map(mapElementRef.current, { zoomControl: true }).setView(OLAVARRIA_CENTER, 13);
        currentMap = map;
        mapRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        markersRef.current = L.layerGroup().addTo(map);
        setReady(true);

        const refreshSize = () => map.invalidateSize();
        requestAnimationFrame(() => requestAnimationFrame(refreshSize));
        window.setTimeout(refreshSize, 120);
        window.setTimeout(refreshSize, 450);
      })
      .catch((error: unknown) => {
        if (active) onError(error instanceof Error ? error.message : "No se pudo iniciar el mapa.");
      });

    return () => {
      active = false;
      if (currentMap) currentMap.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current = null;
    };
  }, [onError]);

  useEffect(() => {
    const element = mapElementRef.current;
    const map = mapRef.current;
    if (!ready || !element || !map) return;

    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => map.invalidateSize(), 40);
    };

    const observer = new ResizeObserver(refresh);
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    window.addEventListener("resize", refresh);
    refresh();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refresh);
      window.clearTimeout(timer);
    };
  }, [ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = markersRef.current;
    const map = mapRef.current;
    if (!ready || !L || !layer || !map) return;

    layer.clearLayers();
    const points: [number, number][] = [];

    mapped.forEach((contact) => {
      const lat = numericCoordinate(contact.latitude);
      const lng = numericCoordinate(contact.longitude);
      if (lat === null || lng === null) return;
      points.push([lat, lng]);
      const icon = L.divIcon({
        className: "cultural-marker-shell",
        html: `<span class="${markerClass(contact.type)}"><span></span></span>`,
        iconSize: [30, 38],
        iconAnchor: [15, 36],
        popupAnchor: [0, -32],
      });
      L.marker([lat, lng], { icon })
        .addTo(layer)
        .bindPopup(popupFor(contact), { maxWidth: 260 })
        .on("click", () => setSelectedId(contact.id));
    });

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [38, 38], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.setView(OLAVARRIA_CENTER, 13);
    }
  }, [mapped, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || placingId === null) return;

    const handleClick = async (event: { latlng: { lat: number; lng: number } }) => {
      setSaving(true);
      const { error } = await supabase
        .from("contacts")
        .update({ latitude: event.latlng.lat, longitude: event.latlng.lng })
        .eq("id", placingId);
      setSaving(false);
      if (error) {
        onError("No se pudo guardar la ubicación: " + error.message);
        return;
      }
      setSelectedId(placingId);
      setPlacingId(null);
      onChanged();
    };

    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [placingId, onChanged, onError]);

  async function clearLocation(contact: Contact) {
    if (!window.confirm(`¿Quitar la ubicación de ${contact.name}?`)) return;
    const { error } = await supabase.from("contacts").update({ latitude: null, longitude: null }).eq("id", contact.id);
    if (error) {
      onError("No se pudo quitar la ubicación: " + error.message);
      return;
    }
    setSelectedId(null);
    onChanged();
  }

  function focusContact(contact: Contact) {
    const lat = numericCoordinate(contact.latitude);
    const lng = numericCoordinate(contact.longitude);
    if (lat === null || lng === null || !mapRef.current) return;
    setSelectedId(contact.id);
    mapRef.current.flyTo([lat, lng], 16, { duration: 0.55 });
  }

  function startPlacing(contact: Contact) {
    setSelectedId(contact.id);
    setPlacingId(contact.id);
    mapRef.current?.flyTo(OLAVARRIA_CENTER, 13, { duration: 0.45 });
  }

  return (
    <section className="cultural-map-layout">
      <aside className="map-sidebar">
        <div className="map-summary">
          <div><strong>{organizations.length}</strong><span>organizaciones</span></div>
          <div><strong>{organizations.filter(hasCoordinates).length}</strong><span>ubicadas</span></div>
          <div><strong>{organizations.filter((contact) => !hasCoordinates(contact)).length}</strong><span>sin ubicar</span></div>
        </div>

        <div className="map-filters">
          <label className="map-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar organización…" /></label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar por tipo">
            <option>Todas</option>
            {ORGANIZATION_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>

        {placingId !== null && (
          <div className="placing-banner">
            <Crosshair />
            <div><strong>{saving ? "Guardando ubicación…" : "Marcá el punto en el mapa"}</strong><span>Hacé clic exactamente donde funciona la organización.</span></div>
            <button type="button" onClick={() => setPlacingId(null)} aria-label="Cancelar"><X /></button>
          </div>
        )}

        <div className="map-list">
          {mapped.map((contact) => (
            <button key={contact.id} className={"map-list-item " + (selectedId === contact.id ? "selected" : "")} onClick={() => focusContact(contact)}>
              <span className={"map-list-dot " + markerClass(contact.type).replace("cultural-marker ", "")} />
              <span><strong>{contact.name}</strong><small>{contact.type}{contact.neighborhood ? ` · ${contact.neighborhood}` : ""}</small></span>
              <MapPin />
            </button>
          ))}

          {unmapped.length > 0 && <p className="map-list-heading">SIN UBICAR</p>}
          {unmapped.map((contact) => (
            <div key={contact.id} className="map-list-item unmapped">
              <span className="map-list-dot muted-dot" />
              <span><strong>{contact.name}</strong><small>{contact.type}{contact.neighborhood ? ` · ${contact.neighborhood}` : ""}</small></span>
              <button type="button" className="locate-button" onClick={() => startPlacing(contact)}><LocateFixed /> Ubicar</button>
            </div>
          ))}

          {!filtered.length && <div className="map-empty">No hay organizaciones que coincidan con la búsqueda.</div>}
        </div>
      </aside>

      <div className="map-stage-wrap">
        <div ref={mapElementRef} className="cultural-map-canvas" aria-label="Mapa interactivo de organizaciones culturales de Olavarría" />
        {!ready && <div className="map-loading"><div className="loader" /><span>Cargando mapa…</span></div>}
        {selected && hasCoordinates(selected) && (
          <article className="map-detail-card">
            <button className="map-detail-close" onClick={() => setSelectedId(null)} aria-label="Cerrar"><X /></button>
            <span className="badge">{selected.type}</span>
            <h3>{selected.name}</h3>
            <p>{selected.discipline || "Actividad cultural sin especificar"}</p>
            <small>{[selected.address, selected.neighborhood].filter(Boolean).join(" · ") || "Sin dirección cargada"}</small>
            <div className="map-detail-actions">
              <button className="secondary" type="button" onClick={() => startPlacing(selected)}><Crosshair /> Mover punto</button>
              <button className="danger-text" type="button" onClick={() => void clearLocation(selected)}>Quitar ubicación</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
