$ErrorActionPreference = "Stop"

$project = (Get-Location).Path

if (-not (Test-Path (Join-Path $project "package.json"))) {
  Write-Host "Abrí la terminal dentro del proyecto Frente Cultura y volvé a ejecutar este instalador." -ForegroundColor Red
  return
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $project "respaldo-referentes-$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$filesToBackup = @(
  "components\dashboard.tsx",
  "app\globals.css",
  "package.json",
  "package-lock.json"
)

foreach ($rel in $filesToBackup) {
  $src = Join-Path $project $rel
  if (Test-Path $src) {
    $dst = Join-Path $backup $rel
    New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
    Copy-Item $src $dst -Force
  }
}

Write-Host "Instalando dependencia para leer Excel..." -ForegroundColor Cyan
npm install xlsx

New-Item -ItemType Directory -Path (Join-Path $project "components") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $project "supabase") -Force | Out-Null
Copy-Item (Join-Path $scriptDir "components\referentes-panel.tsx") (Join-Path $project "components\referentes-panel.tsx") -Force
Copy-Item (Join-Path $scriptDir "supabase\referentes.sql") (Join-Path $project "supabase\referentes.sql") -Force

$patchJs = @'
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dashboardPath = path.join(root, "components", "dashboard.tsx");
const cssPath = path.join(root, "app", "globals.css");

let src = fs.readFileSync(dashboardPath, "utf8");

function replaceExact(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) {
    throw new Error("No pude aplicar el cambio: " + label + ". El dashboard tiene una estructura distinta.");
  }
  src = src.replace(from, to);
}

replaceExact(
  'import { CulturalMap } from "@/components/cultural-map";',
  'import { CulturalMap } from "@/components/cultural-map";\nimport { ReferentesPanel } from "@/components/referentes-panel";',
  "import ReferentesPanel"
);

replaceExact(
  'type View = "inicio" | "equipo" | "plan" | "actividades" | "registro" | "indicadores" | "mapa";',
  'type View = "inicio" | "equipo" | "plan" | "actividades" | "registro" | "referentes" | "indicadores" | "mapa";',
  "tipo View"
);

replaceExact(
  '<Nav active={view === "registro"} icon={<ContactRound />} label="Registro cultural" onClick={() => { setView("registro"); setMenuOpen(false); }} />',
  '<Nav active={view === "registro"} icon={<ContactRound />} label="Registro cultural" onClick={() => { setView("registro"); setMenuOpen(false); }} />\n          <Nav active={view === "referentes"} icon={<UsersRound />} label="Referentes" onClick={() => { setView("referentes"); setMenuOpen(false); }} />',
  "navegación Referentes"
);

replaceExact(
  '{view === "registro" && <RegistryView contacts={filteredContacts} search={search} setSearch={setSearch} edit={(item) => setEditor({ kind: "contact", item })} remove={remove} />}',
  '{view === "registro" && <RegistryView contacts={filteredContacts} search={search} setSearch={setSearch} edit={(item) => setEditor({ kind: "contact", item })} remove={remove} />}\n            {view === "referentes" && <ReferentesPanel onError={setNotice} />}',
  "vista Referentes"
);

replaceExact(
  'return { inicio: "Inicio", equipo: "Equipo y roles", plan: "Plan de trabajo", actividades: "Actividades", registro: "Registro cultural", indicadores: "Indicadores", mapa: "Mapa cultural" }[view];',
  'return { inicio: "Inicio", equipo: "Equipo y roles", plan: "Plan de trabajo", actividades: "Actividades", registro: "Registro cultural", referentes: "Referentes", indicadores: "Indicadores", mapa: "Mapa cultural" }[view];',
  "título Referentes"
);

replaceExact(
  '{ view: "registro", title: "Registro cultural", detail: "Artistas, espacios y organizaciones", value: `${contacts.length} mapeados`, icon: <ContactRound /> },',
  '{ view: "registro", title: "Registro cultural", detail: "Artistas, espacios y organizaciones", value: `${contacts.length} mapeados`, icon: <ContactRound /> },\n    { view: "referentes", title: "Referentes", detail: "Contactos, llamados y seguimiento", value: "Listado de referentes", icon: <UsersRound /> },',
  "tarjeta Referentes"
);

// La pantalla Referentes gestiona su propio alta/importación, por eso no muestra el botón genérico Nuevo.
replaceExact(
  '!["inicio", "indicadores"].includes(view)',
  '!["inicio", "indicadores", "referentes"].includes(view)',
  "botón Nuevo en Referentes"
);

fs.writeFileSync(dashboardPath, src, "utf8");

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* REFERENTES MODULE */";
if (!css.includes(marker)) {
  css += `\n\n${marker}\n
.referentes-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.referentes-import-actions{display:flex;gap:10px}.referentes-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}.referentes-kpis article{background:#fff;border:1px solid var(--line,#ddd8e7);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:3px}.referentes-kpis strong{font-size:28px;font-family:Georgia,serif;color:#17112f}.referentes-kpis span{font-size:12px;color:#6b6480}.referentes-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:12px;margin-bottom:16px}.referentes-toolbar select{height:46px;border:1px solid #d8d2e6;border-radius:12px;background:#fff;padding:0 12px;color:#211a3a}.referentes-search{margin:0}.referentes-table-card{background:#fff;border:1px solid #ddd8e7;border-radius:18px;overflow:hidden}.referentes-table{min-width:1280px;width:100%;border-collapse:collapse}.referentes-table th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#645b7a;background:#f8f6fc;text-align:left;padding:13px 14px;border-bottom:1px solid #e4dfed}.referentes-table td{vertical-align:top;padding:14px;border-bottom:1px solid #eeeaf4;font-size:13px}.referentes-table td:first-child{min-width:190px}.referentes-table td:nth-child(5),.referentes-table td:nth-child(6),.referentes-table td:nth-child(7){min-width:210px}.referentes-table small{display:block;margin-top:4px;color:#7b738d}.referente-original{max-width:260px;line-height:1.35}.referente-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700}.referente-status svg{width:15px;height:15px}.referente-status.done{color:#187653}.referente-call-btn,.referente-edit-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #d7d0e7;background:#fff;border-radius:9px;padding:7px 9px;font-size:12px;font-weight:700;white-space:nowrap}.referente-call-btn svg,.referente-edit-btn svg{width:15px;height:15px}.referente-call-btn{color:#5434d9}.referente-longtext{max-width:280px;white-space:pre-wrap;line-height:1.4}.muted{color:#9a93aa}.referentes-empty{padding:42px;text-align:center;color:#766e89}.referentes-editor textarea{width:100%;border:1px solid #d8d2e6;border-radius:10px;padding:10px 12px;font:inherit;resize:vertical}.spin-icon{animation:referentes-spin .8s linear infinite}@keyframes referentes-spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.referentes-title-row{align-items:stretch;flex-direction:column}.referentes-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.referentes-toolbar{grid-template-columns:1fr}.referentes-import-actions .primary{width:100%;justify-content:center}}
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("Dashboard y estilos actualizados correctamente.");
'@

$patchPath = Join-Path $project "instalar-referentes-patch.js"
[System.IO.File]::WriteAllText($patchPath, $patchJs, (New-Object System.Text.UTF8Encoding($false)))
node $patchPath
Remove-Item $patchPath -Force

Remove-Item (Join-Path $project ".next") -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "" 
Write-Host "MÓDULO REFERENTES INSTALADO" -ForegroundColor Green
Write-Host "" 
Write-Host "1) Ahora ejecutá en Supabase SQL Editor el archivo:" -ForegroundColor Yellow
Write-Host "   supabase\referentes.sql" -ForegroundColor White
Write-Host "" 
Write-Host "2) Después probá el proyecto con:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host "" 
Write-Host "3) En la nueva sección Referentes, usá 'Importar Excel' y elegí Contactos_Unificados_2025.xlsx." -ForegroundColor Yellow
Write-Host "" 
Write-Host "Backup creado en: $backup" -ForegroundColor DarkGray
