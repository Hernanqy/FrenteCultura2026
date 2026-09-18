"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  {
    href: "/referentes",
    label: "Referentes"
  },
  {
    href: "/referentes/nuevo",
    label: "Nuevo"
  },
  {
    href: "/referentes/informe",
    label: "Informe"
  },
  {
    href: "/espacios",
    label: "Espacios"
  }
];

export function ReferentesShortcut() {
  const pathname = usePathname();
  const router = useRouter();

  const estaEnDashboard = pathname === "/";

  function volver() {
    const rutaActual = window.location.pathname;

    if (window.history.length <= 1) {
      router.push("/");
      return;
    }

    router.back();

    window.setTimeout(() => {
      if (window.location.pathname === rutaActual) {
        router.push("/");
      }
    }, 350);
  }

  return (
    <>
      {!estaEnDashboard && (
        <button
          className="global-back-button"
          type="button"
          onClick={volver}
          aria-label="Volver"
          style={{
            position: "fixed",
            top: "14px",
            left: "14px",
            zIndex: 1100,
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid #d8d4e5",
            background: "#ffffff",
            color: "#17182b",
            fontSize: "21px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {"\u2190"}
        </button>
      )}

      <nav
        className="global-quick-nav"
        aria-label="Accesos rápidos"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "10px",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "3px",
          padding: "5px",
          background: "rgba(28,24,64,.97)",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: "15px",
          boxShadow: "0 10px 28px rgba(20,16,50,.28)",
          backdropFilter: "blur(12px)",
          maxWidth: "calc(100vw - 14px)",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch"
        }}
      >
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (
              link.href === "/espacios" &&
              pathname.startsWith("/espacios/")
            );

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                textDecoration: "none",
                padding: "8px 10px",
                borderRadius: "10px",
                fontSize: "12px",
                lineHeight: 1,
                fontWeight: 750,
                background: active
                  ? "#6b4df6"
                  : "transparent",
                color: "#ffffff"
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