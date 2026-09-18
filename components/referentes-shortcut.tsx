"use client";

import Link from "next/link";

export function ReferentesShortcut() {
  return (
    <div
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "flex-end",
      }}
    >
      <Link
        href="/referentes/informe"
        aria-label="Abrir informe de llamados"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          background: "#ffffff",
          color: "#0b1230",
          textDecoration: "none",
          padding: "13px 17px",
          borderRadius: "14px",
          fontWeight: 800,
          fontSize: "14px",
          border: "1px solid #ddd9e8",
          boxShadow: "0 8px 24px rgba(0,0,0,.12)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#f1efff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          📊
        </span>

        Informe de llamados
      </Link>

      <Link
        href="/referentes"
        aria-label="Abrir referentes"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          background: "#6045e8",
          color: "#ffffff",
          textDecoration: "none",
          padding: "14px 18px",
          borderRadius: "14px",
          fontWeight: 800,
          fontSize: "15px",
          boxShadow: "0 10px 28px rgba(0,0,0,.18)",
          border: "1px solid rgba(255,255,255,.18)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "rgba(255,255,255,.16)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          👥
        </span>

        Referentes
      </Link>
    </div>
  );
}