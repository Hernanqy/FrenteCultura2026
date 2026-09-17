"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, LocateFixed, MapPin, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/types";


export type CulturalMapProps = {
  contacts: Contact[];
  onChanged: () => void;
  onError: (message: string) => void;
};
const CENTRO_OLAVARRIA: L.LatLngExpression = [-36.8927, -60.3225];

const TIPOS = [
  "Espacio cultural",
  "Organización cultural",
  "Agrupación",
  "Colectividad",
  "Peña",
];

function numero(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return null;

  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function tieneCoordenadas(contacto: Contact) {
  return (
    numero(contacto.latitude) !== null &&
    numero(contacto.longitude) !== null
  );
}

export function CulturalMap({ contacts, onChanged, onError }: CulturalMapProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("Todas");
  const [seleccionado, setSeleccionado] = useState<Contact | null>(null);
  const [ubicando, setUbicando] = useState<number | null>(null);
  const [listo, setListo] = useState(false);

  const organizaciones = useMemo(
    () => contacts.filter((c) => TIPOS.includes(c.type)),
    [contacts]
  );

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return organizaciones.filter((c) => {
      const coincideTipo = tipo === "Todas" || c.type === tipo;

      const texto = [
        c.name,
        c.type,
        c.discipline,
        c.neighborhood,
        c.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return coincideTipo && (!q || texto.includes(q));
    });
  }, [organizaciones, busqueda, tipo]);

  const ubicadas = filtradas.filter(tieneCoordenadas);
  const sinUbicar = filtradas.filter((c) => !tieneCoordenadas(c));

  // CREAR MAPA
  useEffect(() => {
    if (!contenedorRef.current) return;
    if (mapaRef.current) return;

    try {
      const mapa = L.map(contenedorRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      mapa.setView(CENTRO_OLAVARRIA, 13);

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }
      ).addTo(mapa);

      capaRef.current = L.layerGroup().addTo(mapa);
      mapaRef.current = mapa;

      setListo(true);

      setTimeout(() => mapa.invalidateSize(), 100);
      setTimeout(() => mapa.invalidateSize(), 500);
      setTimeout(() => mapa.invalidateSize(), 1000);
    } catch (error) {
      console.error(error);

      onError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar el mapa."
      );
    }

    return () => {
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
        capaRef.current = null;
      }
    };
  }, [onError]);

  // REDIMENSIONAR
  useEffect(() => {
    if (!listo || !mapaRef.current || !contenedorRef.current) return;

    const mapa = mapaRef.current;

    const observer = new ResizeObserver(() => {
      mapa.invalidateSize();
    });

    observer.observe(contenedorRef.current);

    return () => observer.disconnect();
  }, [listo]);

  // MARCADORES
  useEffect(() => {
    const mapa = mapaRef.current;
    const capa = capaRef.current;

    if (!mapa || !capa || !listo) return;

    capa.clearLayers();

    const puntos: L.LatLngExpression[] = [];

    ubicadas.forEach((contacto) => {
      const lat = numero(contacto.latitude);
      const lng = numero(contacto.longitude);

      if (lat === null || lng === null) return;

      puntos.push([lat, lng]);

      const icono = L.divIcon({
        className: "",
        html: `
          <div style="
            width:32px;
            height:32px;
            border-radius:50% 50% 50% 0;
            background:#6045e8;
            border:3px solid white;
            box-shadow:0 3px 10px rgba(0,0,0,.3);
            transform:rotate(-45deg);
          ">
            <div style="
              width:9px;
              height:9px;
              background:white;
              border-radius:50%;
              margin:8px;
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marcador = L.marker([lat, lng], {
        icon: icono,
      });

      marcador.bindPopup(`
        <div style="min-width:180px">
          <strong>${contacto.name}</strong><br>
          <small>${contacto.type}</small>
          ${
            contacto.address
              ? `<p style="margin:6px 0 0">${contacto.address}</p>`
              : ""
          }
        </div>
      `);

      marcador.on("click", () => {
        setSeleccionado(contacto);
      });

      marcador.addTo(capa);
    });

    if (puntos.length > 1) {
      mapa.fitBounds(L.latLngBounds(puntos), {
        padding: [40, 40],
        maxZoom: 15,
      });
    } else if (puntos.length === 1) {
      mapa.setView(puntos[0], 15);
    } else {
      mapa.setView(CENTRO_OLAVARRIA, 13);
    }
  }, [ubicadas, listo]);

  // HACER CLICK PARA GUARDAR UBICACION
  useEffect(() => {
    const mapa = mapaRef.current;

    if (!mapa || ubicando === null) return;

    const clickMapa = async (e: L.LeafletMouseEvent) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        })
        .eq("id", ubicando);

      if (error) {
        onError(error.message);
        return;
      }

      setUbicando(null);
      onChanged();
    };

    mapa.on("click", clickMapa);

    return () => {
      mapa.off("click", clickMapa);
    };
  }, [ubicando, onChanged, onError]);

  function irA(contacto: Contact) {
    const lat = numero(contacto.latitude);
    const lng = numero(contacto.longitude);

    if (lat === null || lng === null) return;

    setSeleccionado(contacto);

    mapaRef.current?.flyTo([lat, lng], 16, {
      duration: 0.5,
    });
  }

  function comenzarUbicacion(contacto: Contact) {
    setUbicando(contacto.id);
    setSeleccionado(contacto);

    mapaRef.current?.setView(CENTRO_OLAVARRIA, 13);
  }

  async function quitarUbicacion(contacto: Contact) {
    const { error } = await supabase
      .from("contacts")
      .update({
        latitude: null,
        longitude: null,
      })
      .eq("id", contacto.id);

    if (error) {
      onError(error.message);
      return;
    }

    setSeleccionado(null);
    onChanged();
  }

  return (
    <section className="cultural-map-layout">
      <aside className="map-sidebar">

        <div className="map-summary">
          <div>
            <strong>{organizaciones.length}</strong>
            <span>organizaciones</span>
          </div>

          <div>
            <strong>{organizaciones.filter(tieneCoordenadas).length}</strong>
            <span>ubicadas</span>
          </div>

          <div>
            <strong>{organizaciones.filter((c) => !tieneCoordenadas(c)).length}</strong>
            <span>sin ubicar</span>
          </div>
        </div>

        <div className="map-filters">

          <label className="map-search">
            <Search />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar organización..."
            />
          </label>

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option>Todas</option>

            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

        </div>

        {ubicando !== null && (
          <div className="placing-banner">
            <Crosshair />

            <div>
              <strong>Marcá el lugar en el mapa</strong>
              <span>Hacé clic donde está la organización.</span>
            </div>

            <button onClick={() => setUbicando(null)}>
              <X />
            </button>
          </div>
        )}

        <div className="map-list">

          {ubicadas.map((contacto) => (
            <button
              key={contacto.id}
              className="map-list-item"
              onClick={() => irA(contacto)}
            >
              <MapPin />

              <span>
                <strong>{contacto.name}</strong>
                <small>{contacto.type}</small>
              </span>
            </button>
          ))}

          {sinUbicar.length > 0 && (
            <p className="map-list-heading">
              SIN UBICAR
            </p>
          )}

          {sinUbicar.map((contacto) => (
            <div
              key={contacto.id}
              className="map-list-item unmapped"
            >
              <span>
                <strong>{contacto.name}</strong>
                <small>{contacto.type}</small>
              </span>

              <button
                className="locate-button"
                onClick={() => comenzarUbicacion(contacto)}
              >
                <LocateFixed />
                Ubicar
              </button>
            </div>
          ))}

          {filtradas.length === 0 && (
            <div className="map-empty">
              No hay organizaciones cargadas todavía.
            </div>
          )}

        </div>
      </aside>

      <div className="map-stage-wrap">

        <div
          ref={contenedorRef}
          className="cultural-map-canvas"
        />

        {!listo && (
          <div className="map-loading">
            <div className="loader" />
            <span>Iniciando mapa...</span>
          </div>
        )}

        {seleccionado && tieneCoordenadas(seleccionado) && (
          <article className="map-detail-card">

            <button
              className="map-detail-close"
              onClick={() => setSeleccionado(null)}
            >
              <X />
            </button>

            <span className="badge">
              {seleccionado.type}
            </span>

            <h3>
              {seleccionado.name}
            </h3>

            <p>
              {seleccionado.discipline || "Actividad cultural"}
            </p>

            <small>
              {seleccionado.address || "Sin dirección cargada"}
            </small>

            <div className="map-detail-actions">

              <button
                className="secondary"
                onClick={() => comenzarUbicacion(seleccionado)}
              >
                <Crosshair />
                Mover punto
              </button>

              <button
                className="danger-text"
                onClick={() => quitarUbicacion(seleccionado)}
              >
                Quitar ubicación
              </button>

            </div>

          </article>
        )}

      </div>
    </section>
  );
}