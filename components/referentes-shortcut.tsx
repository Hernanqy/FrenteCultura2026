"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/referentes", label: "Referentes", short: "Referentes" },
  { href: "/referentes/informe", label: "Informe de llamados", short: "Informe" },
  { href: "/espacios", label: "Espacios culturales", short: "Espacios" },
];

export function ReferentesShortcut() {
  const pathname = usePathname();
  const router = useRouter();

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
      <button
        className="global-back-button"
        type="button"
        onClick={volver}
        aria-label="Volver atrás"
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
          justifyContent: "center",
        }}
      >
        ←
      </button>

      <nav
        className="global-quick-nav"
        aria-label="Navegación principal"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "10px",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "5px",
          background: "rgba(28,24,64,.96)",
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: "15px",
          boxShadow: "0 10px 28px rgba(20,16,50,.26)",
          backdropFilter: "blur(12px)",
          maxWidth: "calc(100vw - 16px)",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
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
              title={link.label}
              style={{
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                textDecoration: "none",
                padding: "8px 11px",
                borderRadius: "10px",
                fontSize: "13px",
                lineHeight: 1,
                fontWeight: 750,
                transition: "all .18s ease",
                background: active ? "#6b4df6" : "transparent",
                color: "#ffffff",
              }}
            >
              <span className="nav-full">{link.label}</span>
              <span className="nav-short">{link.short}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx global>{`
        .nav-short {
          display: none;
        }

        @media (max-width: 640px) {
          .nav-full {
            display: none;
          }

          .nav-short {
            display: inline;
          }
        }
      `}</style>
    </>
  );
}