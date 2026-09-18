"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/referentes", label: "Referentes" },
  { href: "/referentes/informe", label: "Informe de llamados" },
  { href: "/espacios", label: "Espacios culturales" },
];

export function ReferentesShortcut() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Volver atrás"
        style={{
          position: "fixed",
          top: "18px",
          left: "18px",
          zIndex: 1100,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "1px solid #d8d4e5",
          background: "#ffffff",
          color: "#17182b",
          fontSize: "23px",
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 8px 22px rgba(0,0,0,.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ←
      </button>

      <nav
        aria-label="Navegación principal"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "18px",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "7px",
          background: "rgba(28,24,64,.94)",
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: "17px",
          boxShadow: "0 12px 36px rgba(20,16,50,.28)",
          backdropFilter: "blur(12px)",
          maxWidth: "calc(100vw - 24px)",
          overflowX: "auto",
        }}
      >
        {links.map((link) => {
          const active =
            link.href === "/referentes"
              ? pathname === "/referentes"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                whiteSpace: "nowrap",
                textDecoration: "none",
                padding: "10px 15px",
                borderRadius: "11px",
                fontSize: "14px",
                fontWeight: 750,
                transition: "all .18s ease",
                background: active
                  ? "#6b4df6"
                  : "transparent",
                color: "#ffffff",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}