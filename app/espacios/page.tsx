"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type Espacio = {
  id: number;
  name: string;
  type: string;
  discipline: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
};

const TIPOS = [
  "Espacio cultural",
  "Organizaci\u00f3n cultural",
  "Agrupaci\u00f3n",
  "Colectividad",
  "Pe\u00f1a"
];

function texto(row: Record<string, any>, nombres: string[]) {
  const keys = Object.keys(row);

  for (const nombre of nombres) {
    const key = keys.find(
      (k) =>
        k.trim().toLowerCase() ===
        nombre.trim().toLowerCase()
    );

    if (key && row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim();
    }
  }

  return "";
}

function numero(valor: string) {
  if (!valor) return null;

  const n = Number(
    valor.replace(",", ".")
  );

  return Number.isFinite(n) ? n : null;
}

export default function EspaciosPage() {
  const [items, setItems] = useState<Espacio[]>([]);
  const [buscar, setBuscar] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Espacio | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [importando, setImportando] = useState(false);

  async function cargar() {
    setCargando(true);

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .in("type", TIPOS)
      .order("name");

    if (error) {
      setMensaje("ERROR: " + error.message);
    } else {
      setItems((data || []) as Espacio[]);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      [
        item.name,
        item.type,
        item.discipline,
        item.address,
        item.neighborhood,
        item.phone
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, buscar]);

  const ubicados = items.filter(
    (x) =>
      x.latitude !== null &&
      x.longitude !== null
  ).length;

  async function guardarManual(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setGuardando(true);
    setMensaje("Guardando...");

    const form = new FormData(e.currentTarget);

    const registro = {
      name: String(form.get("name") || "").trim(),
      type:
        String(form.get("type") || "").trim() ||
        "Espacio cultural",
      discipline:
        String(form.get("discipline") || "").trim() ||
        null,
      phone:
        String(form.get("phone") || "").trim() ||
        null,
      address:
        String(form.get("address") || "").trim() ||
        null,
      neighborhood:
        String(form.get("neighborhood") || "").trim() ||
        null,
      latitude: numero(
        String(form.get("latitude") || "").trim()
      ),
      longitude: numero(
        String(form.get("longitude") || "").trim()
      )
    };

    if (!registro.name) {
      setMensaje("ERROR: el nombre es obligatorio.");
      setGuardando(false);
      return;
    }

    let resultado;

    if (editando) {
      resultado = await supabase
        .from("contacts")
        .update(registro)
        .eq("id", editando.id)
        .select("*")
        .single();
    } else {
      resultado = await supabase
        .from("contacts")
        .insert(registro)
        .select("*")
        .single();
    }

    setGuardando(false);

    if (resultado.error) {
      setMensaje("ERROR: " + resultado.error.message);
      return;
    }

    setMensaje(
      editando
        ? "Espacio actualizado correctamente."
        : "Espacio agregado correctamente."
    );

    setMostrarNuevo(false);
    setEditando(null);

    await cargar();
  }

  async function importarExcel(file: File) {
    setImportando(true);
    setMensaje("Leyendo Excel...");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array"
      });

      const sheet =
        workbook.Sheets[workbook.SheetNames[0]];

      const rows =
        XLSX.utils.sheet_to_json<Record<string, any>>(
          sheet,
          {
            defval: "",
            raw: false
          }
        );

      if (!rows.length) {
        throw new Error(
          "El archivo no contiene registros."
        );
      }

      const preparados = rows
        .map((row) => {
          const name = texto(row, [
            "Nombre",
            "Espacio",
            "Nombre del espacio",
            "Organizacion",
            "Organización"
          ]);

          const type =
            texto(row, [
              "Tipo",
              "Categoria",
              "Categoría"
            ]) || "Espacio cultural";

          return {
            name,
            type: TIPOS.includes(type)
              ? type
              : "Espacio cultural",

            discipline:
              texto(row, [
                "Disciplina",
                "Actividad",
                "Rubro"
              ]) || null,

            phone:
              texto(row, [
                "Telefono",
                "Teléfono",
                "Celular",
                "WhatsApp"
              ]) || null,

            address:
              texto(row, [
                "Direccion",
                "Dirección",
                "Domicilio"
              ]) || null,

            neighborhood:
              texto(row, [
                "Barrio",
                "Localidad"
              ]) || null,

            latitude: numero(
              texto(row, [
                "Latitud",
                "Latitude"
              ])
            ),

            longitude: numero(
              texto(row, [
                "Longitud",
                "Longitude"
              ])
            )
          };
        })
        .filter((r) => r.name);

      if (!preparados.length) {
        throw new Error(
          "No pude encontrar una columna de nombres."
        );
      }

      setMensaje(
        preparados.length +
        " espacios detectados. Comparando..."
      );

      const { data: existentes, error } =
        await supabase
          .from("contacts")
          .select("name,type")
          .in("type", TIPOS);

      if (error) {
        throw new Error(error.message);
      }

      const claves = new Set(
        (existentes || []).map((r: any) =>
          (
            String(r.name || "")
              .trim()
              .toLowerCase() +
            "|" +
            String(r.type || "")
              .trim()
              .toLowerCase()
          )
        )
      );

      const nuevos = preparados.filter((r) => {
        const clave =
          r.name.trim().toLowerCase() +
          "|" +
          r.type.trim().toLowerCase();

        return !claves.has(clave);
      });

      const duplicados =
        preparados.length - nuevos.length;

      if (nuevos.length) {
        const { error: insertError } =
          await supabase
            .from("contacts")
            .insert(nuevos);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      await cargar();

      setMensaje(
        "Importacion terminada: " +
        nuevos.length +
        " nuevos | " +
        duplicados +
        " duplicados."
      );

    } catch (error) {
      setMensaje(
        "ERROR: " +
        (
          error instanceof Error
            ? error.message
            : "No se pudo importar el archivo."
        )
      );
    } finally {
      setImportando(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: 30,
        color: "#0b1230"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "center",
          marginBottom: 26
        }}
      >
        <div>
          <div
            style={{
              color: "#6045e8",
              fontWeight: 800,
              letterSpacing: 1.2,
              fontSize: 13
            }}
          >
            FRENTE CULTURA
          </div>

          <h1
            style={{
              fontSize: 40,
              margin: "6px 0"
            }}
          >
            Espacios culturales
          </h1>

          <p>
            Base territorial para alimentar el mapa cultural.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10
          }}
        >
          <label
            style={{
              background: "#ffffff",
              color: "#6045e8",
              border: "1px solid #6045e8",
              padding: "12px 16px",
              borderRadius: 10,
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            {importando
              ? "Importando..."
              : "Importar Excel"}

            <input
              hidden
              type="file"
              accept=".xlsx,.xls"
              disabled={importando}
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  importarExcel(file);
                }

                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            onClick={() => {
              setEditando(null);
              setMostrarNuevo(true);
            }}
            style={{
              border: 0,
              background: "#6045e8",
              color: "#fff",
              padding: "12px 16px",
              borderRadius: 10,
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            + Nuevo espacio
          </button>
        </div>
      </header>

      {mensaje && (
        <div
          style={{
            padding: 13,
            marginBottom: 18,
            background: mensaje.startsWith("ERROR")
              ? "#ffe9e9"
              : "#f1efff",
            borderRadius: 10
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3,minmax(0,1fr))",
          gap: 14,
          marginBottom: 20
        }}
      >
        <Tarjeta
          numero={items.length}
          label="Espacios"
        />

        <Tarjeta
          numero={ubicados}
          label="Ubicados en mapa"
        />

        <Tarjeta
          numero={items.length - ubicados}
          label="Sin ubicar"
        />
      </section>

      <input
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        placeholder="Buscar espacio, barrio, actividad..."
        style={{
          width: "100%",
          padding: 13,
          borderRadius: 10,
          border: "1px solid #d8d4e5",
          marginBottom: 16
        }}
      />

      <section
        style={{
          background: "#fff",
          border: "1px solid #ddd9e8",
          borderRadius: 14,
          overflow: "hidden"
        }}
      >
        {cargando ? (
          <div style={{ padding: 25 }}>
            Cargando...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 25 }}>
            No hay espacios cargados.
          </div>
        ) : (
          filtrados.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr 1.5fr 130px",
                gap: 15,
                padding: 17,
                alignItems: "center",
                borderBottom:
                  "1px solid #eeeaf5"
              }}
            >
              <div>
                <b>{item.name}</b>
                <div style={{ fontSize: 13 }}>
                  {item.type}
                  {item.discipline
                    ? " | " + item.discipline
                    : ""}
                </div>
              </div>

              <div>
                {item.neighborhood ||
                  "Sin barrio"}
              </div>

              <div>
                {item.address ||
                  "Sin direccion"}
              </div>

              <button
                onClick={() => {
                  setEditando(item);
                  setMostrarNuevo(true);
                }}
                style={{
                  padding: "8px 11px",
                  borderRadius: 8,
                  border:
                    "1px solid #6045e8",
                  background: "#fff",
                  color: "#6045e8",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Editar
              </button>
            </div>
          ))
        )}
      </section>

      {mostrarNuevo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <form
            onSubmit={guardarManual}
            style={{
              width: "min(760px,100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              padding: 26,
              borderRadius: 16
            }}
          >
            <h2>
              {editando
                ? "Editar espacio"
                : "Nuevo espacio"}
            </h2>

            <Campo
              label="Nombre"
              name="name"
              value={editando?.name}
              required
            />

            <label style={{ display: "block", marginBottom: 14 }}>
              Tipo

              <select
                name="type"
                defaultValue={
                  editando?.type ||
                  "Espacio cultural"
                }
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  padding: 10
                }}
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>

            <Campo
              label="Disciplina / actividad"
              name="discipline"
              value={editando?.discipline}
            />

            <Campo
              label="Telefono"
              name="phone"
              value={editando?.phone}
            />

            <Campo
              label={"Direcci\u00f3n"}
              name="address"
              value={editando?.address}
            />

            <Campo
              label="Barrio / localidad"
              name="neighborhood"
              value={editando?.neighborhood}
            />

            <Campo
              label="Latitud"
              name="latitude"
              value={editando?.latitude}
            />

            <Campo
              label="Longitud"
              name="longitude"
              value={editando?.longitude}
            />

            <div
              style={{
                padding: 12,
                background: "#f7f6fb",
                borderRadius: 9,
                marginBottom: 16
              }}
            >
              Si dejás latitud y longitud vacías,
              el espacio aparecerá como sin ubicar
              dentro del mapa cultural.
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMostrarNuevo(false);
                  setEditando(null);
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar espacio"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Tarjeta({
  numero,
  label
}: {
  numero: number;
  label: string;
}) {
  return (
    <article
      style={{
        background: "#fff",
        border: "1px solid #ddd9e8",
        borderRadius: 14,
        padding: 18
      }}
    >
      <strong style={{ fontSize: 28 }}>
        {numero}
      </strong>

      <div>{label}</div>
    </article>
  );
}

function Campo({
  label,
  name,
  value,
  required = false
}: {
  label: string;
  name: string;
  value?: string | number | null;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 14
      }}
    >
      {label}

      <input
        name={name}
        required={required}
        defaultValue={
          value === null ||
          value === undefined
            ? ""
            : String(value)
        }
        style={{
          display: "block",
          width: "100%",
          marginTop: 6,
          padding: 10,
          border:
            "1px solid #d8d4e5",
          borderRadius: 8
        }}
      />
    </label>
  );
}
