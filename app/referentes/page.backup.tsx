"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type Referente = {
  id: string;
  nombre: string;
  telefono: string | null;
  disciplina: string | null;
  origen: string | null;
  observacion_previa: string | null;
  contactado: boolean;
  fecha_contacto: string | null;
  que_dijo: string | null;
  informacion_brindada: string | null;
  seguimiento: string | null;
};

function valorFila(row: Record<string, any>, nombres: string[]) {
  const keys = Object.keys(row);

  for (const buscado of nombres) {
    const key = keys.find(
      (k) =>
        k.trim().toLowerCase() === buscado.trim().toLowerCase()
    );

    if (key && row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim();
    }
  }

  return "";
}

export default function ReferentesPage() {
  const [items, setItems] = useState<Referente[]>([]);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Referente | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);

    const { data, error } = await supabase
      .from("referentes")
      .select("*")
      .order("nombre");

    if (error) {
      console.warn("Error cargando referentes:", error.message);
      setMensaje(error.message);
    } else {
      setItems((data || []) as Referente[]);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();

    return items.filter((r) => {
      if (filtro === "pendientes" && r.contactado) return false;
      if (filtro === "contactados" && !r.contactado) return false;

      const texto = [
        r.nombre,
        r.telefono,
        r.disciplina,
        r.origen,
        r.observacion_previa,
        r.que_dijo,
        r.informacion_brindada,
        r.seguimiento,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !q || texto.includes(q);
    });
  }, [items, buscar, filtro]);

  async function importarExcel(file: File) {
    setMensaje("Leyendo Excel...");

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
    });

    const preparados = rows
      .map((row) => ({
        nombre: valorFila(row, [
          "Nombre",
          "Nombre y apellido",
          "Contacto",
          "Referente",
        ]),
        telefono: valorFila(row, [
          "Teléfono",
          "Telefono",
          "Celular",
          "WhatsApp",
          "Whatsapp",
        ]) || null,
        disciplina: valorFila(row, [
          "Disciplina",
          "Actividad",
          "Rubro",
        ]) || null,
        origen: valorFila(row, [
          "Procedencia",
          "Origen",
          "Fuente",
        ]) || null,
        observacion_previa: valorFila(row, [
          "Observaciones",
          "Observación",
          "Observacion",
          "Estado",
          "Comentario",
        ]) || null,
        contactado: false,
      }))
      .filter((r) => r.nombre);

    if (!preparados.length) {
      setMensaje("No encontré una columna de nombres en el Excel.");
      return;
    }

    let agregados = 0;

    for (const ref of preparados) {
      const consulta = supabase
        .from("referentes")
        .select("id")
        .eq("nombre", ref.nombre);

      const { data: existentes } = ref.telefono
        ? await consulta.eq("telefono", ref.telefono).limit(1)
        : await consulta.limit(1);

      if (existentes?.length) continue;

      const { error } = await supabase
        .from("referentes")
        .insert(ref);

      if (!error) agregados++;
    }

    setMensaje(
      `Importación terminada: ${agregados} referentes nuevos.`
    );

    await cargar();
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editando) return;

    setGuardando(true);

    const form = new FormData(e.currentTarget);

    const cambios = {
      contactado: form.get("contactado") === "on",
      fecha_contacto:
        String(form.get("fecha_contacto") || "") || null,
      que_dijo:
        String(form.get("que_dijo") || "") || null,
      informacion_brindada:
        String(form.get("informacion_brindada") || "") || null,
      seguimiento:
        String(form.get("seguimiento") || "") || null,
    };

    const { error } = await supabase
      .from("referentes")
      .update(cambios)
      .eq("id", editando.id);

    setGuardando(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setEditando(null);
    await cargar();
  }

  const total = items.length;
  const contactados = items.filter((x) => x.contactado).length;
  const pendientes = total - contactados;
  const conInfo = items.filter(
    (x) => x.informacion_brindada?.trim()
  ).length;

  return (
    <main style={{ padding: 32, maxWidth: 1500, margin: "0 auto" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        alignItems: "center",
        marginBottom: 28
      }}>
        <div>
          <div style={{
            color: "#6045e8",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: 1.2
          }}>
            FRENTE CULTURA
          </div>

          <h1 style={{
            fontSize: 42,
            margin: "5px 0 5px"
          }}>
            Referentes
          </h1>

          <p style={{ margin: 0 }}>
            Contactos, llamados, información y seguimiento.
          </p>
        </div>

        <label style={{
          background: "#6045e8",
          color: "white",
          padding: "13px 18px",
          borderRadius: 12,
          cursor: "pointer",
          fontWeight: 700
        }}>
          Importar Excel

          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importarExcel(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {mensaje && (
        <div style={{
          padding: 12,
          borderRadius: 10,
          background: "#f1efff",
          marginBottom: 20
        }}>
          {mensaje}
        </div>
      )}

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,minmax(0,1fr))",
        gap: 14,
        marginBottom: 22
      }}>
        {[
          ["Total", total],
          ["Contactados", contactados],
          ["Pendientes", pendientes],
          ["Con información", conInfo],
        ].map(([label, value]) => (
          <article key={String(label)} style={{
            border: "1px solid #dedbea",
            borderRadius: 14,
            padding: 18,
            background: "white"
          }}>
            <b style={{ fontSize: 27 }}>{value}</b>
            <div>{label}</div>
          </article>
        ))}
      </section>

      <section style={{
        display: "flex",
        gap: 12,
        marginBottom: 18
      }}>
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar referente, teléfono, disciplina..."
          style={{
            flex: 1,
            padding: 13,
            border: "1px solid #d8d4e5",
            borderRadius: 10
          }}
        />

        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            padding: "0 16px",
            border: "1px solid #d8d4e5",
            borderRadius: 10
          }}
        >
          <option value="todos">Todos</option>
          <option value="pendientes">Pendientes de llamar</option>
          <option value="contactados">Contactados</option>
        </select>
      </section>

      <div style={{
        background: "white",
        border: "1px solid #dedbea",
        borderRadius: 14,
        overflow: "hidden"
      }}>
        {cargando ? (
          <div style={{ padding: 30 }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 30 }}>
            No hay referentes para mostrar.
          </div>
        ) : (
          filtrados.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px,1.2fr) minmax(150px,.8fr) minmax(170px,.9fr) 140px",
                gap: 16,
                alignItems: "center",
                padding: 18,
                borderBottom: "1px solid #eeeaf5"
              }}
            >
              <div>
                <strong>{r.nombre}</strong>

                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {r.disciplina || "Sin disciplina"}
                  {r.origen ? ` · ${r.origen}` : ""}
                </div>
              </div>

              <div>
                {r.telefono || "Sin teléfono"}
              </div>

              <div>
                <span style={{
                  display: "inline-block",
                  padding: "6px 9px",
                  borderRadius: 999,
                  background: r.contactado ? "#e8f7ed" : "#fff3dc"
                }}>
                  {r.contactado ? "Contactado" : "Pendiente"}
                </span>
              </div>

              <button
                onClick={() => setEditando(r)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "1px solid #6045e8",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                {r.contactado ? "Ver / editar" : "Registrar llamado"}
              </button>
            </div>
          ))
        )}
      </div>

      {editando && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.42)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          zIndex: 100
        }}>
          <form
            onSubmit={guardar}
            style={{
              width: "min(680px,100%)",
              background: "white",
              borderRadius: 18,
              padding: 26
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {editando.nombre}
            </h2>

            <label style={{ display: "block", marginBottom: 16 }}>
              <input
                type="checkbox"
                name="contactado"
                defaultChecked={editando.contactado}
              />{" "}
              Ya fue contactado
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              Fecha del contacto
              <input
                type="date"
                name="fecha_contacto"
                defaultValue={editando.fecha_contacto || ""}
                style={{ display: "block", width: "100%", padding: 10 }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              ¿Qué dijo?
              <textarea
                name="que_dijo"
                defaultValue={editando.que_dijo || ""}
                rows={3}
                style={{ display: "block", width: "100%", padding: 10 }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              Información que brindó
              <textarea
                name="informacion_brindada"
                defaultValue={editando.informacion_brindada || ""}
                rows={4}
                style={{ display: "block", width: "100%", padding: 10 }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              Seguimiento / próximo paso
              <textarea
                name="seguimiento"
                defaultValue={editando.seguimiento || ""}
                rows={3}
                style={{ display: "block", width: "100%", padding: 10 }}
              />
            </label>

            {editando.observacion_previa && (
              <div style={{
                padding: 12,
                background: "#f7f6fb",
                borderRadius: 10,
                marginBottom: 16
              }}>
                <b>Dato previo del Excel</b>
                <div>{editando.observacion_previa}</div>
              </div>
            )}

            <footer style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10
            }}>
              <button
                type="button"
                onClick={() => setEditando(null)}
                style={{ padding: "10px 14px" }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                style={{
                  padding: "10px 16px",
                  background: "#6045e8",
                  color: "white",
                  border: 0,
                  borderRadius: 8
                }}
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}