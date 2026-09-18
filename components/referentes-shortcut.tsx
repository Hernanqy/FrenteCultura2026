"use client";

import Link from "next/link";

export function ReferentesShortcut() {
  return (
    <Link
      href="/referentes"
      aria-label="Abrir referentes"
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        zIndex: 1000,
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
        border: "1px solid rgba(255,255,255,.18)"
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
          fontSize: "16px"
        }}
      >
        👥
      </span>

      Referentes
    </Link>
  );
}