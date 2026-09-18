const fs = require("fs");
const path = require("path");

const root = process.cwd();

const dashboard = path.join(
  root,
  "components",
  "dashboard.tsx"
);

const shortcut = path.join(
  root,
  "components",
  "referentes-shortcut.tsx"
);

if (!fs.existsSync(dashboard)) {
  console.error("ERROR: no existe components/dashboard.tsx");
  process.exit(1);
}

if (!fs.existsSync(shortcut)) {
  console.error("ERROR: no existe components/referentes-shortcut.tsx");
  process.exit(1);
}

let text = fs.readFileSync(dashboard, "utf8");

/* =========================================================
   1. IMPORTAR Link SIN TOCAR OTROS IMPORTS
   ========================================================= */

if (!text.includes('import Link from "next/link";')) {
  const anchor = 'import dynamic from "next/dynamic";';

  if (!text.includes(anchor)) {
    console.error("ERROR: no encontre el import de next/dynamic.");
    process.exit(1);
  }

  text = text.replace(
    anchor,
    anchor + '\nimport Link from "next/link";'
  );
}

/* =========================================================
   2. AGREGAR ACCESOS AL MENU LATERAL
   ========================================================= */

if (!text.includes('label="Referentes" href="/referentes"')) {

  const mapaNav =
    '<Nav active={view === "mapa"} icon={<MapPinned />} label="Mapa cultural" onClick={() => { setView("mapa"); setMenuOpen(false); }} />';

  if (!text.includes(mapaNav)) {
    console.error("ERROR: no encontre el item Mapa cultural del menu.");
    console.error("No se modifico dashboard.tsx.");
    process.exit(1);
  }

  const nuevosItems = `${mapaNav}

            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,.12)",
                margin: "10px 8px"
              }}
            />

            <ExternalNav
              href="/referentes"
              icon={<ContactRound />}
              label="Referentes"
            />

            <ExternalNav
              href="/referentes/nuevo"
              icon={<Plus />}
              label="Nuevo referente"
            />

            <ExternalNav
              href="/referentes/informe"
              icon={<ChartNoAxesCombined />}
              label="Informe de llamados"
            />

            <ExternalNav
              href="/espacios"
              icon={<MapPinned />}
              label="Espacios culturales"
            />`;

  text = text.replace(
    mapaNav,
    nuevosItems
  );
}

/* =========================================================
   3. CREAR COMPONENTE ExternalNav
   ========================================================= */

if (!text.includes("function ExternalNav(")) {

  const navFunction =
`function Nav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={"nav-item " + (active ? "active" : "")} onClick={onClick}>{icon}<span>{label}</span></button>;
}`;

  if (!text.includes(navFunction)) {
    console.error("ERROR: no encontre la funcion Nav.");
    console.error("No se modifico dashboard.tsx.");
    process.exit(1);
  }

  const replacement =
`${navFunction}

function ExternalNav({
  href,
  icon,
  label
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="nav-item"
      style={{
        textDecoration: "none"
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}`;

  text = text.replace(
    navFunction,
    replacement
  );
}

/* =========================================================
   4. AGREGAR TARJETAS AL INICIO
   ========================================================= */

if (!text.includes('href="/referentes/nuevo" className="section-card"')) {

  const phaseAnchor =
    '      <section className="phase-banner">';

  if (!text.includes(phaseAnchor)) {
    console.error("ERROR: no encontre phase-banner en HomeView.");
    console.error("No se modifico dashboard.tsx.");
    process.exit(1);
  }

  const accesos = `
      <section
        style={{
          marginTop: 28,
          marginBottom: 18
        }}
      >
        <p className="kicker">
          REFERENTES Y ESPACIOS
        </p>

        <h2
          style={{
            marginTop: 4,
            marginBottom: 6
          }}
        >
          Accesos de trabajo
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: 18
          }}
        >
          Contactos, llamados y espacios culturales.
        </p>
      </section>

      <section
        className="section-menu"
        aria-label="Referentes y espacios"
      >
        <Link
          href="/referentes"
          className="section-card"
        >
          <span className="section-icon">
            <ContactRound />
          </span>

          <span className="section-copy">
            <strong>Referentes</strong>
            <small>
              Contactos y seguimiento
            </small>
            <b>Ver contactos</b>
          </span>

          <ArrowRight className="section-arrow" />
        </Link>

        <Link
          href="/referentes/nuevo"
          className="section-card"
        >
          <span className="section-icon">
            <Plus />
          </span>

          <span className="section-copy">
            <strong>Nuevo referente</strong>
            <small>
              Alta manual de contacto
            </small>
            <b>Agregar referente</b>
          </span>

          <ArrowRight className="section-arrow" />
        </Link>

        <Link
          href="/referentes/informe"
          className="section-card"
        >
          <span className="section-icon">
            <ChartNoAxesCombined />
          </span>

          <span className="section-copy">
            <strong>Informe de llamados</strong>
            <small>
              Pendientes y resultados
            </small>
            <b>Ver informe</b>
          </span>

          <ArrowRight className="section-arrow" />
        </Link>

        <Link
          href="/espacios"
          className="section-card"
        >
          <span className="section-icon">
            <MapPinned />
          </span>

          <span className="section-copy">
            <strong>Espacios culturales</strong>
            <small>
              Base territorial del mapa
            </small>
            <b>Gestionar espacios</b>
          </span>

          <ArrowRight className="section-arrow" />
        </Link>
      </section>

`;

  text = text.replace(
    phaseAnchor,
    accesos + phaseAnchor
  );
}

fs.writeFileSync(
  dashboard,
  text,
  "utf8"
);

/* =========================================================
   5. MENU FLOTANTE INFERIOR
   ========================================================= */

const shortcutCode = `"use client";

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

  const isHome = pathname === "/";

  return (
    <>
      {!isHome && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 1100,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid #d8d4e5",
            background: "#ffffff",
            color: "#17182b",
            fontSize: 21,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow:
              "0 6px 18px rgba(0,0,0,.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          ←
        </button>
      )}

      <nav
        aria-label="Accesos rápidos"
        style={{
          position: "fixed",
          left: "50%",
          bottom: 10,
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: 5,
          background:
            "rgba(28,24,64,.97)",
          border:
            "1px solid rgba(255,255,255,.12)",
          borderRadius: 15,
          boxShadow:
            "0 10px 28px rgba(20,16,50,.28)",
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
                borderRadius: 10,
                fontSize: 12,
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
`;

fs.writeFileSync(
  shortcut,
  shortcutCode,
  "utf8"
);

console.log("");
console.log("OK");
console.log("- Accesos agregados al Inicio.");
console.log("- Accesos agregados al menu lateral.");
console.log("- Menu flotante compacto actualizado.");
console.log("- Flecha oculta en Inicio.");
console.log("- No se modifico Supabase.");
console.log("- No se modifico el mapa.");