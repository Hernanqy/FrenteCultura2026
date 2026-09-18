"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NuevoReferentePage() {
  const router = useRouter();

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function guardar(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const nombre =
      String(form.get("nombre") || "").trim();

    if (!nombre) {
      setMensaje("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);
    setMensaje("Guardando...");

    const registro = {
      nombre,
      telefono:
        String(form.get("telefono") || "").trim() || null,
      disciplina:
        String(form.get("disciplina") || "").trim() || null,
      origen:
        String(form.get("origen") || "").trim() || null,
      observacion_previa:
        String(form.get("observacion_previa") || "").trim() || null,
      contactado: false,
    };

    const { data, error } = await supabase
      .from("referentes")
      .insert(registro)
      .select("*")
      .single();

    setGuardando(false);

    if (error) {
      console.error(error);
      setMensaje("ERROR: " + error.message);
      return;
    }

    if (!data) {
      setMensaje("ERROR: no se pudo confirmar el alta.");
      return;
    }

    router.push("/referentes");
    router.refresh();
  }

  return (
    <main
      style={{
        maxWidth: 850,
        margin: "0 auto",
        padding: 32,
        color: "#0b1230",
      }}
    >
      <div
        style={{
          color: "#6045e8",
          fontWeight: 800,
          letterSpacing: 1.2,
          fontSize: 13,
        }}
      >
        FRENTE CULTURA
      </div>

      <h1
        style={{
          fontSize: 40,
          margin: "6px 0",
        }}
      >
        Nuevo referente
      </h1>

      <p style={{ marginBottom: 28 }}>
        Alta manual de un nuevo contacto.
      </p>

      {mensaje && (
        <div
          style={{
            padding: 13,
            marginBottom: 18,
            borderRadius: 10,
            background: mensaje.startsWith("ERROR")
              ? "#ffe9e9"
              : "#f1efff",
          }}
        >
          {mensaje}
        </div>
      )}

      <form
        onSubmit={guardar}
        style={{
          background: "#ffffff",
          border: "1px solid #ddd9e8",
          borderRadius: 16,
          padding: 26,
        }}
      >
        <Campo
          label="Nombre y apellido"
          name="nombre"
          required
        />

        <Campo
          label="Telefono"
          name="telefono"
        />

        <Campo
          label="Disciplina / actividad"
          name="disciplina"
        />

        <Campo
          label="Origen / procedencia"
          name="origen"
        />

        <label
          style={{
            display: "block",
            marginBottom: 20,
            fontWeight: 700,
          }}
        >
          Observacion inicial

          <textarea
            name="observacion_previa"
            rows={4}
            style={{
              display: "block",
              width: "100%",
              marginTop: 7,
              padding: 11,
              borderRadius: 9,
              border: "1px solid #d8d4e5",
              font: "inherit",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <Link
            href="/referentes"
            style={{
              padding: "11px 16px",
              borderRadius: 9,
              border: "1px solid #d8d4e5",
              color: "#0b1230",
              textDecoration: "none",
            }}
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: "11px 18px",
              border: 0,
              borderRadius: 9,
              background: "#6045e8",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {guardando
              ? "Guardando..."
              : "Agregar referente"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Campo({
  label,
  name,
  required = false,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 18,
        fontWeight: 700,
      }}
    >
      {label}

      <input
        name={name}
        required={required}
        style={{
          display: "block",
          width: "100%",
          marginTop: 7,
          padding: 11,
          borderRadius: 9,
          border: "1px solid #d8d4e5",
          font: "inherit",
        }}
      />
    </label>
  );
}
