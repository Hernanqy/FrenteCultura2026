"use client";

import Link from "next/link";

export function ReferentesShortcut() {
  return (
    <Link
      href="/referentes"
      style={{
        position: "fixed",
        right: "22px",
        bottom: "22px",
        zIndex: 500,
        background: "#6045e8",
        color: "#fff",
        textDecoration: "none",
        padding: "13px 18px",
        borderRadius: "14px",
        fontWeight: 800,
        boxShadow: "0 8px 24px rgba(0,0,0,.18)"
      }}
    >
      Referentes
    </Link>
  );
}
