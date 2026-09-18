"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Referente = {
  id: string;
  nombre: string;
  telefono: string | null;
  contactado: boolean;
  fecha_contacto: string | null;
  resultado_llamada: string | null;
  asignado_a: string | null;
  que_dijo: string | null;
  informacion_brindada: string | null;
  seguimiento: string | null;
};

type Member = {
  id: string | number;
  name: string;
};

const RESULTADOS = [
  { value: "", label: "Sin clasificar" },
  { value: "positivo", label: "Positivo" },
  { value: "neutral", label: "Neutral" },
  { value: "negativo", label: "Negativo" },
];

export default function InformeReferentesPage() {
  const [referentes, setReferentes] = useState<Referente[]>([]);
  const [miembros, setMiembros] = useState<Member[]>([]);
  const [cargando, setCargando] = useState(true);
  const [distribuyendo, setDistribuyendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [filtroMiembro, setFiltroMiembro] = useState("todos");
  const [filtroResultado, setFiltroResultado] = useState("todos");

  const cargar = useCallback(async () => {
    setCargando(true);
    setMensaje("");

    const [refsResult, membersResult] = await Promise.all([
      supabase
        .from("referentes")
        .select(
          "id,nombre,telefono,contactado,fecha_contacto,resultado_llamada,asignado_a,que_dijo,informacion_brindada,seguimiento"
        )
        .order("nombre"),

      supabase
        .from("members")
        .select("id,name")
        .order("name"),
    ]);

    if (refsResult.error) {
      setMensaje(
        "Error cargando referentes: " +
        refsResult.error.message
      );
    } else {
      setReferentes(
        (refsResult.data || []) as Referente[]
      );
    }

    if (membersResult.error) {
      setMensaje(
        (actual) =>
          actual ||
          "No se pudo cargar el equipo: " +
          membersResult.error.message
      );
    } else {
      setMiembros(
        (membersResult.data || []) as Member[]
      );
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resumen = useMemo(() => {
    const total = referentes.length;
    const llamados = referentes.filter(
      (r) => r.contactado
    ).length;

    return {
      total,
      llamados,
      pendientes: total - llamados,

      positivos: referentes.filter(
        (r) => r.resultado_llamada === "positivo"
      ).length,

      neutrales: referentes.filter(
        (r) => r.resultado_llamada === "neutral"
      ).length,

      negativos: referentes.filter(
        (r) => r.resultado_llamada === "negativo"
      ).length,

      sinClasificar: referentes.filter(
        (r) =>
          r.contactado &&
          !r.resultado_llamada
      ).length,

      sinAsignar: referentes.filter(
        (r) => !r.asignado_a
      ).length,
    };
  }, [referentes]);

  const resumenEquipo = useMemo(() => {
    return miembros.map((miembro) => {
      const propios = referentes.filter(
        (r) => r.asignado_a === miembro.name
      );

      return {
        nombre: miembro.name,
        total: propios.length,
        llamados: propios.filter(
          (r) => r.contactado
        ).length,
        pendientes: propios.filter(
          (r) => !r.contactado
        ).length,
        positivos: propios.filter(
          (r) => r.resultado_llamada === "positivo"
        ).length,
        neutrales: propios.filter(
          (r) => r.resultado_llamada === "neutral"
        ).length,
        negativos: propios.filter(
          (r) => r.resultado_llamada === "negativo"
        ).length,
      };
    });
  }, [miembros, referentes]);

  const filtrados = useMemo(() => {
    return referentes.filter((r) => {
      if (
        filtroMiembro !== "todos" &&
        r.asignado_a !== filtroMiembro
      ) {
        return false;
      }

      if (
        filtroResultado === "pendientes" &&
        r.contactado
      ) {
        return false;
      }

      if (
        filtroResultado === "sin-clasificar" &&
        (!r.contactado || r.resultado_llamada)
      ) {
        return false;
      }

      if (
        ["positivo", "neutral", "negativo"].includes(
          filtroResultado
        ) &&
        r.resultado_llamada !== filtroResultado
      ) {
        return false;
      }

      return true;
    });
  }, [
    referentes,
    filtroMiembro,
    filtroResultado,
  ]);

  async function cambiarAsignacion(
    id: string,
    nombre: string
  ) {
    const { error } = await supabase
      .from("referentes")
      .update({
        asignado_a: nombre || null,
        asignado_at: nombre
          ? new Date().toISOString()
          : null,
      })
      .eq("id", id);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setReferentes((actual) =>
      actual.map((r) =>
        r.id === id
          ? {
              ...r,
              asignado_a: nombre || null,
            }
          : r
      )
    );
  }

  async function cambiarResultado(
    id: string,
    resultado: string
  ) {
    const cambios = resultado
      ? {
          resultado_llamada: resultado,
          contactado: true,
          fecha_contacto:
            new Date()
              .toISOString()
              .slice(0, 10),
        }
      : {
          resultado_llamada: null,
        };

    const { error } = await supabase
      .from("referentes")
      .update(cambios)
      .eq("id", id);

    if (error) {
      setMensaje(error.message);
      return;
    }

    await cargar();
  }

  async function distribuir() {
    if (!miembros.length) {
      setMensaje(
        "No hay integrantes disponibles para distribuir."
      );
      return;
    }

    const sinAsignar = referentes.filter(
      (r) => !r.asignado_a
    );

    if (!sinAsignar.length) {
      setMensaje(
        "Todos los referentes ya tienen responsable."
      );
      return;
    }

    const confirmar = window.confirm(
      "Se van a distribuir " +
      sinAsignar.length +
      " referentes entre " +
      miembros.length +
      " integrantes. Continuar?"
    );

    if (!confirmar) return;

    setDistribuyendo(true);
    setMensaje(
      "Distribuyendo " +
      sinAsignar.length +
      " referentes..."
    );

    try {
      const asignaciones = sinAsignar.map(
        (referente, indice) => ({
          referente,
          miembro:
            miembros[indice % miembros.length],
        })
      );

      const TAMANO = 10;

      for (
        let i = 0;
        i < asignaciones.length;
        i += TAMANO
      ) {
        const bloque = asignaciones.slice(
          i,
          i + TAMANO
        );

        const resultados = await Promise.all(
          bloque.map(({ referente, miembro }) =>
            supabase
              .from("referentes")
              .update({
                asignado_a: miembro.name,
                asignado_at:
                  new Date().toISOString(),
              })
              .eq("id", referente.id)
          )
        );

        const error = resultados.find(
          (r) => r.error
        )?.error;

        if (error) {
          throw new Error(error.message);
        }

        setMensaje(
          "Distribuyendo... " +
          Math.min(
            i + TAMANO,
            asignaciones.length
          ) +
          " de " +
          asignaciones.length
        );
      }

      await cargar();

      setMensaje(
        "Distribucion terminada correctamente."
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo completar la distribucion."
      );
    } finally {
      setDistribuyendo(false);
    }
  }

  return (
    <main className="report-page">
      <style jsx global>{`
        .report-page {
          max-width: 1500px;
          margin: 0 auto;
          padding: 30px;
          color: #0b1230;
        }

        .report-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 26px;
        }

        .report-header h1 {
          font-size: 40px;
          margin: 4px 0 6px;
        }

        .report-kicker {
          color: #6045e8;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .report-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .report-button {
          border: 0;
          border-radius: 11px;
          padding: 12px 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .primary {
          background: #6045e8;
          color: white;
        }

        .secondary {
          background: white;
          border: 1px solid #dcd8e9;
          color: #0b1230;
          text-decoration: none;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(150px,1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: white;
          border: 1px solid #ddd9e8;
          border-radius: 14px;
          padding: 17px;
        }

        .summary-card strong {
          display: block;
          font-size: 28px;
        }

        .summary-card span {
          font-size: 13px;
        }

        .panel {
          background: white;
          border: 1px solid #ddd9e8;
          border-radius: 14px;
          margin-bottom: 22px;
          overflow: hidden;
        }

        .panel-header {
          padding: 18px;
          border-bottom: 1px solid #eeeaf5;
        }

        .panel-header h2 {
          margin: 0;
        }

        .team-table,
        .refs-table {
          width: 100%;
          border-collapse: collapse;
        }

        .team-table th,
        .team-table td,
        .refs-table th,
        .refs-table td {
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid #eeeaf5;
        }

        .team-table th,
        .refs-table th {
          font-size: 12px;
          color: #65627a;
          background: #faf9fc;
        }

        .filters {
          display: flex;
          gap: 10px;
          padding: 15px;
          border-bottom: 1px solid #eeeaf5;
        }

        .filters select,
        .refs-table select {
          padding: 8px 10px;
          border: 1px solid #d9d5e5;
          border-radius: 8px;
          background: white;
        }

        .status {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          background: #f2f0f8;
        }

        .mensaje {
          margin-bottom: 18px;
          padding: 12px;
          border-radius: 10px;
          background: #f1efff;
        }

        @media(max-width: 800px) {
          .report-page {
            padding: 18px;
          }

          .report-header {
            display: block;
          }

          .report-actions {
            margin-top: 15px;
          }

          .panel {
            overflow-x: auto;
          }

          .team-table,
          .refs-table {
            min-width: 850px;
          }
        }
      `}</style>

      <header className="report-header">
        <div>
          <div className="report-kicker">
            FRENTE CULTURA
          </div>

          <h1>Informe de llamados</h1>

          <p>
            Seguimiento, resultados y distribucion
            del equipo.
          </p>
        </div>

        <div className="report-actions">
          <Link
            href="/referentes"
            className="report-button secondary"
          >
            Ver referentes
          </Link>

          <button
            className="report-button primary"
            onClick={distribuir}
            disabled={distribuyendo}
          >
            {distribuyendo
              ? "Distribuyendo..."
              : "Distribuir contactos"}
          </button>
        </div>
      </header>

      {mensaje && (
        <div className="mensaje">
          {mensaje}
        </div>
      )}

      <section className="summary-grid">
        {[
          ["Total", resumen.total],
          ["Sin llamar", resumen.pendientes],
          ["Llamados", resumen.llamados],
          ["Positivos", resumen.positivos],
          ["Neutrales", resumen.neutrales],
          ["Negativos", resumen.negativos],
          ["Sin clasificar", resumen.sinClasificar],
          ["Sin asignar", resumen.sinAsignar],
        ].map(([label, value]) => (
          <article
            className="summary-card"
            key={String(label)}
          >
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Resumen por integrante</h2>
        </div>

        <table className="team-table">
          <thead>
            <tr>
              <th>Integrante</th>
              <th>Asignados</th>
              <th>Sin llamar</th>
              <th>Llamados</th>
              <th>Positivos</th>
              <th>Neutrales</th>
              <th>Negativos</th>
            </tr>
          </thead>

          <tbody>
            {resumenEquipo.map((m) => (
              <tr key={m.nombre}>
                <td><b>{m.nombre}</b></td>
                <td>{m.total}</td>
                <td>{m.pendientes}</td>
                <td>{m.llamados}</td>
                <td>{m.positivos}</td>
                <td>{m.neutrales}</td>
                <td>{m.negativos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Contactos</h2>
        </div>

        <div className="filters">
          <select
            value={filtroMiembro}
            onChange={(e) =>
              setFiltroMiembro(e.target.value)
            }
          >
            <option value="todos">
              Todos los integrantes
            </option>

            {miembros.map((m) => (
              <option
                key={String(m.id)}
                value={m.name}
              >
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={filtroResultado}
            onChange={(e) =>
              setFiltroResultado(e.target.value)
            }
          >
            <option value="todos">
              Todos los resultados
            </option>
            <option value="pendientes">
              Sin llamar
            </option>
            <option value="positivo">
              Positivos
            </option>
            <option value="neutral">
              Neutrales
            </option>
            <option value="negativo">
              Negativos
            </option>
            <option value="sin-clasificar">
              Sin clasificar
            </option>
          </select>
        </div>

        {cargando ? (
          <div style={{ padding: 25 }}>
            Cargando...
          </div>
        ) : (
          <table className="refs-table">
            <thead>
              <tr>
                <th>Referente</th>
                <th>Telefono</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th>Resultado</th>
              </tr>
            </thead>

            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.nombre}</b>
                  </td>

                  <td>
                    {r.telefono || "Sin telefono"}
                  </td>

                  <td>
                    <select
                      value={r.asignado_a || ""}
                      onChange={(e) =>
                        cambiarAsignacion(
                          r.id,
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Sin asignar
                      </option>

                      {miembros.map((m) => (
                        <option
                          key={String(m.id)}
                          value={m.name}
                        >
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <span className="status">
                      {r.contactado
                        ? "Llamado"
                        : "Pendiente"}
                    </span>
                  </td>

                  <td>
                    <select
                      value={
                        r.resultado_llamada || ""
                      }
                      onChange={(e) =>
                        cambiarResultado(
                          r.id,
                          e.target.value
                        )
                      }
                    >
                      {RESULTADOS.map((resultado) => (
                        <option
                          key={resultado.value}
                          value={resultado.value}
                        >
                          {resultado.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
