"use client";

import Link from "next/link";

const base = {
  display: "inline-flex",
  alignItems: "center",
  gap: "9px",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "13px",
  fontWeight: 800,
  boxShadow: "0 8px 24px rgba(0,0,0,.14)",
};

export function ReferentesShortcut() {
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 9,
      }}
    >
      <Link
        href="/referentes/nuevo"
        style={{
          ...base,
          background: "#ffffff",
          color: "#6045e8",
          border: "1px solid #6045e8",
        }}
      >
        + Nuevo referente
      </Link>

      <Link
        href="/referentes/informe"
        style={{
          ...base,
          background: "#ffffff",
          color: "#0b1230",
          border: "1px solid #ddd9e8",
        }}
      >
        Informe de llamados
      </Link>

      <Link
        href="/referentes"
        style={{
          ...base,
          background: "#6045e8",
          color: "#ffffff",
          border: "1px solid #6045e8",
        }}
      >
        Referentes
      </Link>
    </div>
  );
}
