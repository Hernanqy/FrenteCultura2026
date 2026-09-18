"use client";

import { useEffect, useMemo, useState } from "react";
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
  resultado_llamada: string | null;
};

export default function ReferentesPage() {
  const [items, setItems] = useState<Referente[]>([]);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [mensaje, setMensaje] = useState("");
  const [archivoElegido, setArchivoElegido] = useState("");
  const [importando, setImportando] = useState(false);
  const [editando, setEditando] = useState<Referente | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const { data, error } = await supabase
      .from("referentes")
      .select("*")
      .order("nombre");

    if (error) {
      setMensaje("Error cargando referentes: " + error.message);
      return;
    }

    setItems((data || []) as Referente[]);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function importarExcel(file: File) {
    setArchivoElegido(file.name);
    setImportando(true);
    setMensaje("Leyendo " + file.name + "...");

    try {
      const XLSX = await import("xlsx");

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      if (!workbook.SheetNames.length) {
        throw new Error("El Excel no contiene hojas.");
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      });

      setMensaje(
        "Excel leído correctamente. " +
        rows.length +
        " filas encontradas."
      );

      const preparados = rows
        .map((row) => {
          const grupo = String(row[0] ?? "").trim();
          const estado = String(row[1] ?? "").trim();
          const nombre = String(row[2] ?? "").trim();
          const telefono = String(row[3] ?? "").trim();
          const disciplina = String(row[4] ?? "").trim();
          const origen = String(row[6] ?? "").trim();
          const observacion = String(row[8] ?? "").trim();

          return {
            nombre,
            telefono: telefono || null,
            disciplina: disciplina || null,
            origen: origen || grupo || null,
            observacion_previa:
              [estado, observacion].filter(Boolean).join(" | ") || null,
            contactado: false,
          };
        })
        .filter((r) => {
          if (!r.nombre) return false;

          const n = r.nombre.toLowerCase();

          if (n === "nombre") return false;
          if (n === "nombre y apellido") return false;
          if (n === "contacto") return false;

          return true;
        });

      if (!preparados.length) {
        throw new Error(
          "El archivo se abrió, pero no pude encontrar nombres en la columna esperada."
        );
      }

      setMensaje(
        preparados.length +
        " referentes detectados. Comparando con Supabase..."
      );

      const { data: existentes, error: errorExistentes } =
        await supabase
          .from("referentes")
          .select("nombre, telefono");

      if (errorExistentes) {
        throw new Error(errorExistentes.message);
      }

      const claves = new Set(
        (existentes || []).map((r: any) =>
          (
            String(r.nombre || "").trim().toLowerCase() +
            "|" +
            String(r.telefono || "").trim()
          )
        )
      );

      const nuevos = preparados.filter((r) => {
        const clave =
          r.nombre.trim().toLowerCase() +
          "|" +
          String(r.telefono || "").trim();

        return !claves.has(clave);
      });

      const duplicados = preparados.length - nuevos.length;

      if (!nuevos.length) {
        setMensaje(
          "Todos los registros ya estaban cargados. " +
          duplicados +
          " duplicados."
        );
        await cargar();
        return;
      }

      setMensaje(
        "Guardando " +
        nuevos.length +
        " referentes en Supabase..."
      );

      let importados = 0;

      for (let i = 0; i < nuevos.length; i += 50) {
        const bloque = nuevos.slice(i, i + 50);

        const { error } = await supabase
          .from("referentes")
          .insert(bloque);

        if (error) {
          throw new Error(
            "Error guardando filas " +
            (i + 1) +
            " a " +
            (i + bloque.length) +
            ": " +
            error.message
          );
        }

        importados += bloque.length;

        setMensaje(
          "Importando... " +
          importados +
          " de " +
          nuevos.length
        );
      }

      await cargar();

      setMensaje(
        "Importación terminada: " +
        importados +
        " nuevos | " +
        duplicados +
        " duplicados."
      );

    } catch (error) {
      console.error(error);

      setMensaje(
        error instanceof Error
          ? "ERROR: " + error.message
          : "ERROR: No se pudo procesar el Excel."
      );
    } finally {
      setImportando(false);
    }
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
      resultado_llamada:
        String(form.get("resultado_llamada") || "") || null,
    };

    const { error } = await supabase
      .from("referentes")
      .update(cambios)
      .eq("id", editando.id);

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando: " + error.message);
      return;
    }

    setEditando(null);
    await cargar();
  }

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();

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

  const total = items.length;
  const contactados = items.filter((x) => x.contactado).length;
  const pendientes = total - contactados;
  const conInformacion = items.filter(
    (x) => Boolean(x.informacion_brindada?.trim())
  ).length;

  return (
    <main
      style={{
        maxWidth: 1450,
        margin: "0 auto",
        padding: 30,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              color: "#6045e8",
              fontWeight: 800,
              letterSpacing: 1.2,
            }}
          >
            FRENTE CULTURA
          </div>

          <h1 style={{ fontSize: 42, margin: "6px 0" }}>
            Referentes
          </h1>

          <p>
            Contactos, llamados, información y seguimiento.
          </p>
        </div>

        <label
          style={{
            background: importando ? "#aaa" : "#6045e8",
            color: "white",
            padding: "14px 20px",
            borderRadius: 12,
            cursor: importando ? "default" : "pointer",
            fontWeight: 700,
          }}
        >
          {importando ? "Importando..." : "Importar Excel"}

          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            disabled={importando}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (!file) {
                setMensaje("No se seleccionó ningún archivo.");
                return;
              }

              setArchivoElegido(file.name);
              importarExcel(file);

              event.target.value = "";
            }}
          />
        </label>
      </header>

      {archivoElegido && (
        <div style={{ marginBottom: 10 }}>
          Archivo seleccionado: <b>{archivoElegido}</b>
        </div>
      )}

      {mensaje && (
        <div
          style={{
            padding: 14,
            marginBottom: 22,
            borderRadius: 10,
            background:
              mensaje.startsWith("ERROR")
                ? "#ffe9e9"
                : "#f1efff",
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          ["Total", total],
          ["Contactados", contactados],
          ["Pendientes", pendientes],
          ["Con información", conInformacion],
        ].map(([label, value]) => (
          <article
            key={String(label)}
            style={{
              background: "white",
              border: "1px solid #ddd9e8",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <strong style={{ fontSize: 29 }}>
              {value}
            </strong>
            <div>{label}</div>
          </article>
        ))}
      </section>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar referente, teléfono, disciplina..."
          style={{
            flex: 1,
            padding: 13,
            border: "1px solid #d8d4e5",
            borderRadius: 10,
          }}
        />

        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            padding: "0 16px",
            border: "1px solid #d8d4e5",
            borderRadius: 10,
          }}
        >
          <option value="todos">Todos</option>
          <option value="pendientes">Pendientes</option>
          <option value="contactados">Contactados</option>
        </select>
      </div>

      <section
        style={{
          background: "white",
          border: "1px solid #ddd9e8",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {!filtrados.length ? (
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
                  "2fr 1fr 1fr 150px",
                gap: 15,
                alignItems: "center",
                padding: 17,
                borderBottom: "1px solid #eeeaf5",
              }}
            >
              <div>
                <b>{r.nombre}</b>
                <div style={{ fontSize: 13 }}>
                  {r.disciplina || "Sin disciplina"}
                  {r.origen ? " · " + r.origen : ""}
                </div>
              </div>

              <div>
                {r.telefono || "Sin teléfono"}
              </div>

              <div>
                {r.contactado ? "Contactado" : "Pendiente"}
              </div>

              <button
                onClick={() => setEditando(r)}
              >
                {r.contactado
                  ? "Ver / editar"
                  : "Registrar llamado"}
              </button>
            </div>
          ))
        )}
      </section>

      {editando && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <form
            onSubmit={guardar}
            style={{
              background: "white",
              padding: 26,
              width: "min(700px,100%)",
              borderRadius: 16,
            }}
          >
            <h2>{editando.nombre}</h2>

            <label>
              <input
                type="checkbox"
                name="contactado"
                defaultChecked={editando.contactado}
              />{" "}
              Ya fue contactado
            </label>

            <p>
              Fecha de contacto
              <input
                type="date"
                name="fecha_contacto"
                defaultValue={editando.fecha_contacto || ""}
                style={{ width: "100%", padding: 9 }}
              />
            </p>

            <p>
              Qué dijo
              <textarea
                name="que_dijo"
                defaultValue={editando.que_dijo || ""}
                rows={3}
                style={{ width: "100%" }}
              />
            </p>

            <p>
              Información que brindó
              <textarea
                name="informacion_brindada"
                defaultValue={editando.informacion_brindada || ""}
                rows={4}
                style={{ width: "100%" }}
              />
            </p>

            <fieldset
              style={{
                border: "1px solid #ddd9e8",
                borderRadius: 10,
                padding: 14,
                marginBottom: 16
              }}
            >
              <legend style={{ fontWeight: 700 }}>
                Resultado del llamado
              </legend>

              <label style={{ marginRight: 18 }}>
                <input
                  type="radio"
                  name="resultado_llamada"
                  value="positivo"
                  defaultChecked={
                    editando.resultado_llamada === "positivo"
                  }
                />{" "}
                Positivo
              </label>

              <label style={{ marginRight: 18 }}>
                <input
                  type="radio"
                  name="resultado_llamada"
                  value="neutral"
                  defaultChecked={
                    editando.resultado_llamada === "neutral"
                  }
                />{" "}
                Neutral
              </label>

              <label>
                <input
                  type="radio"
                  name="resultado_llamada"
                  value="negativo"
                  defaultChecked={
                    editando.resultado_llamada === "negativo"
                  }
                />{" "}
                Negativo
              </label>
            </fieldset>


            <p>
              Seguimiento / próximo paso
              <textarea
                name="seguimiento"
                defaultValue={editando.seguimiento || ""}
                rows={3}
                style={{ width: "100%" }}
              />
            </p>

            {editando.observacion_previa && (
              <div
                style={{
                  background: "#f5f3fa",
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <b>Información previa:</b>
                <div>{editando.observacion_previa}</div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}