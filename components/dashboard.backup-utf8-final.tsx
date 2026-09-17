"use client";
import dynamic from "next/dynamic";
const CulturalMap = dynamic(
  () =>
    import("./cultural-map").then((mod) => mod.CulturalMap),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: "600px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        Cargando mapa...
      </div>
    ),
  }
);
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, ClipboardList, ContactRound, Home, LogOut, MapPinned, Menu, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Activity, Contact, Entity, EntityKind, Member, Task } from "@/types";

type View = "inicio" | "equipo" | "plan" | "actividades" | "registro" | "indicadores" | "mapa";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const phases = {
  1: { name: "Constitución", dates: "Oct. y nov. 2026" },
  2: { name: "Despliegue", dates: "Dic. 2026 a mar. 2027" },
  3: { name: "MasificaciÃ³n", dates: "Abr. a jul. 2027" },
};
const roles = ["Sin designar", "CoordinaciÃ³n", "Co-coordinaciÃ³n", "Enlace OrganizaciÃ³n", "Enlace FormaciÃ³n", "Enlace ComunicaciÃ³n", "Responsable de Registro"];

export function Dashboard({ userEmail }: { userEmail: string }) {
  const [view, setView] = useState<View>("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ kind: EntityKind; item?: Entity } | null>(null);

  const loadData = useCallback(async () => {
    const [m, t, a, c] = await Promise.all([
      supabase.from("members").select("*").eq("workspace_id", WORKSPACE_ID).order("name"),
      supabase.from("tasks").select("*").eq("workspace_id", WORKSPACE_ID).order("phase").order("id"),
      supabase.from("activities").select("*").eq("workspace_id", WORKSPACE_ID).order("activity_date"),
      supabase.from("contacts").select("*").eq("workspace_id", WORKSPACE_ID).order("name"),
    ]);
    const firstError = m.error || t.error || a.error || c.error;
    if (firstError) setNotice("No se pudieron cargar los datos: " + firstError.message);
    else {
      setMembers(m.data ?? []);
      setTasks(t.data ?? []);
      setActivities(a.data ?? []);
      setContacts(c.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => void loadData(), 0);
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void loadData(), 250);
    };
    let channel = supabase.channel("frente-cultura");
    ["members", "tasks", "activities", "contacts"].forEach((table) => {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: "workspace_id=eq." + WORKSPACE_ID }, refresh);
    });
    channel.subscribe();
    return () => {
      clearTimeout(initialLoad);
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  const stats = useMemo(() => ({
    mapped: contacts.length,
    attendees: activities.reduce((n, a) => n + a.attendees, 0),
    adherents: activities.reduce((n, a) => n + a.adherents, 0),
    completed: tasks.filter((t) => t.done).length,
  }), [contacts, activities, tasks]);

  async function toggleTask(task: Task) {
    const { error } = await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    if (error) setNotice(error.message); else void loadData();
  }

  async function remove(kind: EntityKind, id: number) {
    if (!window.confirm("ï¿½??Eliminar este registro?")) return;
    const table = kind === "member" ? "members" : kind === "task" ? "tasks" : kind === "activity" ? "activities" : "contacts";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setNotice(error.message); else void loadData();
  }

  const addKind: EntityKind = view === "equipo" ? "member" : view === "plan" ? "task" : view === "actividades" ? "activity" : "contact";
  const addLabel = { member: "Integrante", task: "AcciÃ³n", activity: "Actividad", contact: "Contacto" }[addKind];
  const filteredContacts = contacts.filter((c) => [c.name, c.type, c.discipline, c.neighborhood].join(" ").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menuOpen ? "open" : "")}>
        <div className="brand"><span className="brand-mark">FC</span><div><strong>Frente Cultura</strong><small>OrganizaciÃ³n y seguimiento</small></div></div>
        <nav>
          <Nav active={view === "inicio"} icon={<Home />} label="Inicio" onClick={() => { setView("inicio"); setMenuOpen(false); }} />
          <Nav active={view === "equipo"} icon={<UsersRound />} label="Equipo y roles" onClick={() => { setView("equipo"); setMenuOpen(false); }} />
          <Nav active={view === "plan"} icon={<ClipboardList />} label="Plan de trabajo" onClick={() => { setView("plan"); setMenuOpen(false); }} />
          <Nav active={view === "actividades"} icon={<CalendarDays />} label="Actividades" onClick={() => { setView("actividades"); setMenuOpen(false); }} />
          <Nav active={view === "registro"} icon={<ContactRound />} label="Registro cultural" onClick={() => { setView("registro"); setMenuOpen(false); }} />
          <Nav active={view === "indicadores"} icon={<ChartNoAxesCombined />} label="Indicadores" onClick={() => { setView("indicadores"); setMenuOpen(false); }} />
          <Nav active={view === "mapa"} icon={<MapPinned />} label="Mapa cultural" onClick={() => { setView("mapa"); setMenuOpen(false); }} />
        </nav>
        <div className="user-box"><small>{userEmail}</small><button onClick={() => supabase.auth.signOut()}><LogOut /> Salir</button></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menÃº"><Menu /></button>
          <div><p className="eyebrow">FRENTE CULTURA</p><h1>{titleFor(view)}</h1></div>
          {!["inicio", "indicadores"].includes(view) && <button className="primary" onClick={() => setEditor({ kind: addKind })}><Plus /> Nuevo {addLabel.toLowerCase()}</button>}
        </header>
        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}><X /></button></div>}
        {loading ? <div className="center-panel"><div className="loader" /></div> : (
          <>
            {view === "inicio" && <HomeView members={members} tasks={tasks} activities={activities} contacts={contacts} stats={stats} toggleTask={toggleTask} navigate={setView} />}
            {view === "equipo" && <TeamView members={members} edit={(item) => setEditor({ kind: "member", item })} remove={remove} />}
            {view === "plan" && <PlanView tasks={tasks} toggleTask={toggleTask} edit={(item) => setEditor({ kind: "task", item })} remove={remove} />}
            {view === "actividades" && <ActivitiesView activities={activities} edit={(item) => setEditor({ kind: "activity", item })} remove={remove} />}
            {view === "registro" && <RegistryView contacts={filteredContacts} search={search} setSearch={setSearch} edit={(item) => setEditor({ kind: "contact", item })} remove={remove} />}
            {view === "indicadores" && <IndicatorsView stats={stats} activities={activities} contacts={contacts} />}
            {view === "mapa" && <MapView contacts={contacts} reload={loadData} error={setNotice} />}
          </>
        )}
      </main>
      {editor && <Editor kind={editor.kind} item={editor.item} close={() => setEditor(null)} saved={() => { setEditor(null); void loadData(); }} error={setNotice} />}
    </div>
  );
}

function Nav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={"nav-item " + (active ? "active" : "")} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function titleFor(view: View) {
  return { inicio: "Inicio", equipo: "Equipo y roles", plan: "Plan de trabajo", actividades: "Actividades", registro: "Registro cultural", indicadores: "Indicadores", mapa: "Mapa cultural" }[view];
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function HomeView({ members, tasks, activities, contacts, stats, toggleTask, navigate }: { members: Member[]; tasks: Task[]; activities: Activity[]; contacts: Contact[]; stats: { mapped: number; attendees: number; adherents: number; completed: number }; toggleTask: (task: Task) => void; navigate: (view: View) => void }) {
  const phaseOne = tasks.filter((t) => t.phase === 1);
  const sections: { view: View; title: string; detail: string; value: string; icon: React.ReactNode }[] = [
    { view: "equipo", title: "Equipo y roles", detail: "Integrantes y responsabilidades", value: `${members.length} integrantes`, icon: <UsersRound /> },
    { view: "plan", title: "Plan de trabajo", detail: "Fases, acciones y seguimiento", value: `${stats.completed}/${tasks.length} completadas`, icon: <ClipboardList /> },
    { view: "actividades", title: "Actividades", detail: "Agenda, asistencia y adherentes", value: `${activities.length} cargadas`, icon: <CalendarDays /> },
    { view: "registro", title: "Registro cultural", detail: "Artistas, espacios y organizaciones", value: `${contacts.length} mapeados`, icon: <ContactRound /> },
    { view: "indicadores", title: "Indicadores", detail: "Metas y evolución del trabajo", value: `${stats.adherents} adherentes`, icon: <ChartNoAxesCombined /> },
    { view: "mapa", title: "Mapa cultural", detail: "Organizaciones culturales de OlavarrÃ­a", value: `${contacts.length} registros`, icon: <MapPinned /> },
  ];

  return <>
    <section className="home-intro">
      <div>
        <p className="kicker">PANEL GENERAL</p>
        <h2>¿Qué querés gestionar?</h2>
        <p>Entrá directamente a cada sección del Frente Cultura.</p>
      </div>
    </section>

    <section className="section-menu" aria-label="Secciones de la aplicaciÃ³n">
      {sections.map((section) => (
        <button className="section-card" key={section.view} onClick={() => navigate(section.view)}>
          <span className="section-icon">{section.icon}</span>
          <span className="section-copy">
            <strong>{section.title}</strong>
            <small>{section.detail}</small>
            <b>{section.value}</b>
          </span>
          <ArrowRight className="section-arrow" />
        </button>
      ))}
    </section>

    <section className="phase-banner"><div><span>FASE ACTUAL</span><h2>Constitución</h2><p>Octubre y noviembre de 2026</p></div><div className="phase-count"><strong>{phaseOne.filter((t) => t.done).length}/{phaseOne.length}</strong><small>acciones completadas</small></div></section>
    <section className="metrics-grid"><Metric label="Integrantes" value={members.length} detail="Equipo inicial" /><Metric label="Mapeados" value={contacts.length} detail="Meta: 40 a noviembre" /><Metric label="Actividades" value={activities.length} detail="Meta: una por mes" /><Metric label="Adherentes" value={stats.adherents} detail="Meta: 150 a julio" /></section>
    <section className="grid-2">
      <article className="panel"><p className="kicker">PRÃ“XIMOS PASOS</p><h2>Acciones prioritarias</h2>{phaseOne.filter((t) => !t.done).map((t) => <label className="task-row" key={t.id}><input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} /><span><b>{t.title}</b><small>Fase 1 Â· Constitución</small></span></label>)}</article>
      <article className="panel"><p className="kicker">AGENDA</p><h2>PrÃ³ximas actividades</h2>{activities.map((a) => <div className="event-row" key={a.id}><time>{new Date(a.activity_date + "T12:00:00").getDate()}<small>{new Date(a.activity_date + "T12:00:00").toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</small></time><span><b>{a.name}</b><small>{a.place} Â· {a.status}</small></span></div>)}</article>
    </section>
  </>;
}

function TeamView({ members, edit, remove }: { members: Member[]; edit: (m: Member) => void; remove: (k: EntityKind, id: number) => void }) {
  return <><Intro overline={String(members.length) + " INTEGRANTES"} title="DefiniciÃ³n de responsabilidades" /><div className="role-grid">{roles.slice(1).map((role) => <article key={role}><b>{role}</b><span>{members.filter((m) => m.role === role).length} designado(s)</span></article>)}</div><Table heads={["Integrante", "Rol asignado", "Base", ""]}>{members.map((m) => <tr key={m.id}><td><Avatar name={m.name} /> <b>{m.name}</b></td><td><span className="badge">{m.role}</span></td><td>{m.base ? String(m.base) + " base" : "â€”"}</td><td><Actions edit={() => edit(m)} remove={() => remove("member", m.id)} /></td></tr>)}</Table></>;
}

function PlanView({ tasks, toggleTask, edit, remove }: { tasks: Task[]; toggleTask: (t: Task) => void; edit: (t: Task) => void; remove: (k: EntityKind, id: number) => void }) {
  return <><Intro overline="OCTUBRE 2026 â€” JULIO 2027" title="Programa de trabajo" /><div className="phase-grid">{Object.entries(phases).map(([number, phase]) => <article className="phase-card" key={number}><header><p className="kicker">FASE {number}</p><h2>{phase.name}</h2><span>{phase.dates}</span></header>{tasks.filter((t) => t.phase === Number(number)).map((t) => <div className={"plan-task " + (t.done ? "done" : "")} key={t.id}><input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} /><span>{t.title}</span><Actions edit={() => edit(t)} remove={() => remove("task", t.id)} compact /></div>)}</article>)}</div></>;
}

function ActivitiesView({ activities, edit, remove }: { activities: Activity[]; edit: (a: Activity) => void; remove: (k: EntityKind, id: number) => void }) {
  return <><Intro overline="AGENDA, ASISTENCIA Y CONVERSIÃ“N" title="Actividades" /><Table heads={["Actividad", "Fecha", "Barrio / lugar", "Asistentes", "Adherentes", "Estado", ""]}>{activities.map((a) => <tr key={a.id}><td><b>{a.name}</b></td><td>{new Date(a.activity_date + "T12:00:00").toLocaleDateString("es-AR")}</td><td>{a.place}</td><td>{a.attendees}</td><td>{a.adherents}</td><td><span className={"badge " + (a.status === "Realizada" ? "green" : "amber")}>{a.status}</span></td><td><Actions edit={() => edit(a)} remove={() => remove("activity", a.id)} /></td></tr>)}</Table></>;
}

function RegistryView({ contacts, search, setSearch, edit, remove }: { contacts: Contact[]; search: string; setSearch: (v: string) => void; edit: (c: Contact) => void; remove: (k: EntityKind, id: number) => void }) {
  return <><Intro overline="ARTISTAS, ESPACIOS, AGRUPACIONES Y COLECTIVIDADES" title="Registro cultural" /><div className="search-box"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, disciplina o barrioâ€¦" /></div><div className="contact-grid">{contacts.length ? contacts.map((c) => <article className="contact-card" key={c.id}><header><div><h3>{c.name}</h3><span className="badge">{c.type}</span></div><Actions edit={() => edit(c)} remove={() => remove("contact", c.id)} compact /></header><p><b>{c.discipline || "Actividad sin especificar"}</b></p><p>{[c.address, c.neighborhood].filter(Boolean).join(" Â· ") || "UbicaciÃ³n sin especificar"}</p><footer>{c.phone || "Sin telÃ©fono"}{c.sustained && <span className="badge green">ParticipaciÃ³n sostenida</span>}</footer></article>) : <div className="panel empty">TodavÃ­a no hay contactos cargados.</div>}</div></>;
}

function IndicatorsView({ stats, activities, contacts }: { stats: { mapped: number; attendees: number; adherents: number; completed: number }; activities: Activity[]; contacts: Contact[] }) {
  const sustained = contacts.filter((c) => c.sustained).length;
  const goals: [string, number, number][] = [["Artistas y espacios mapeados", stats.mapped, 40], ["Adherentes fichados", stats.adherents, 150], ["Actividades realizadas", activities.filter((a) => a.status === "Realizada").length, 10]];
  return <><Intro overline="RESULTADOS Y METAS ACUMULADAS" title="Indicadores" /><section className="metrics-grid"><Metric label="Asistentes" value={stats.attendees} detail="Total acumulado" /><Metric label="Adherentes" value={stats.adherents} detail="Contactos convertidos" /><Metric label="ConversiÃ³n" value={stats.attendees ? String(Math.round(stats.adherents / stats.attendees * 100)) + "%" : "0%"} detail="Adherentes / asistentes" /><Metric label="ParticipaciÃ³n sostenida" value={sustained} detail="Espacios y organizaciones" /></section><article className="panel goals"><p className="kicker">AVANCE DE METAS</p><h2>Objetivos a julio de 2027</h2>{goals.map(([label, value, target]) => <div className="goal" key={label}><div><b>{label}</b><span>{value} / {target}</span></div><progress value={value} max={target} /></div>)}</article></>;
}

function MapView({ contacts, reload, error }: { contacts: Contact[]; reload: () => void; error: (message: string) => void }) {
  return <>
    <Intro overline="MAPA TERRITORIAL" title="Mapa cultural de OlavarrÃ­a" />
    <CulturalMap contacts={contacts} onChanged={reload} onError={error} />
  </>;
}

function Intro({ overline, title }: { overline: string; title: string }) {
  return <header className="section-intro"><p className="eyebrow">{overline}</p><h2>{title}</h2></header>;
}

function Table({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return <div className="table-card"><div className="table-wrap"><table><thead><tr>{heads.map((h, i) => <th key={h + "-" + i}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>;
}

function Avatar({ name }: { name: string }) {
  return <span className="avatar">{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>;
}

function Actions({ edit, remove }: { edit: () => void; remove: () => void; compact?: boolean }) {
  return <div className="actions"><button onClick={edit}>Editar</button><button className="danger" onClick={remove} aria-label="Eliminar"><Trash2 /></button></div>;
}

function Editor({ kind, item, close, saved, error }: { kind: EntityKind; item?: Entity; close: () => void; saved: () => void; error: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const values = item as unknown as Record<string, string | number | boolean | null> | undefined;
  const labels = { member: "integrante", task: "acciÃ³n", activity: "actividad", contact: "contacto" };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string | number | boolean | null> = { workspace_id: WORKSPACE_ID };
    if (kind === "member") Object.assign(payload, { name: data.get("name") as string, base: Number(data.get("base")) || 0, role: data.get("role") as string });
    if (kind === "task") Object.assign(payload, { title: data.get("title") as string, phase: Number(data.get("phase")), done: values?.done ?? false });
    if (kind === "activity") Object.assign(payload, { name: data.get("name") as string, activity_date: data.get("activity_date") as string, place: data.get("place") as string, attendees: Number(data.get("attendees")) || 0, adherents: Number(data.get("adherents")) || 0, status: data.get("status") as string });
    if (kind === "contact") Object.assign(payload, {
      name: data.get("name") as string,
      type: data.get("type") as string,
      discipline: data.get("discipline") as string,
      neighborhood: data.get("neighborhood") as string,
      address: data.get("address") as string,
      phone: data.get("phone") as string,
      latitude: data.get("latitude") ? Number(data.get("latitude")) : null,
      longitude: data.get("longitude") ? Number(data.get("longitude")) : null,
      sustained: data.get("sustained") === "on",
    });
    const table = kind === "member" ? "members" : kind === "task" ? "tasks" : kind === "activity" ? "activities" : "contacts";
    const query = item ? supabase.from(table).update(payload).eq("id", item.id) : supabase.from(table).insert(payload);
    const { error: saveError } = await query;
    setBusy(false);
    if (saveError) error(saveError.message); else saved();
  }
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><form className="editor" onSubmit={submit}><header><div><p className="kicker">{item ? "EDITAR" : "NUEVO REGISTRO"}</p><h2>{item ? "Editar" : "Agregar"} {labels[kind]}</h2></div><button type="button" onClick={close}><X /></button></header><div className="form-grid">
    {kind === "member" && <><Field label="Nombre y apellido" name="name" value={values?.name} required wide /><Field label="Base" name="base" type="number" value={values?.base} /><Select label="Rol" name="role" value={values?.role} options={roles} /></>}
    {kind === "task" && <><Field label="AcciÃ³n" name="title" value={values?.title} required wide /><Select label="Fase" name="phase" value={values?.phase} options={["1", "2", "3"]} /></>}
    {kind === "activity" && <><Field label="Nombre" name="name" value={values?.name} required wide /><Field label="Fecha" name="activity_date" type="date" value={values?.activity_date} required /><Field label="Barrio / lugar" name="place" value={values?.place} /><Field label="Asistentes" name="attendees" type="number" value={values?.attendees} /><Field label="Adherentes" name="adherents" type="number" value={values?.adherents} /><Select label="Estado" name="status" value={values?.status} options={["Planificada", "En curso", "Realizada"]} /></>}
    {kind === "contact" && <><Field label="Nombre" name="name" value={values?.name} required wide /><Select label="Tipo" name="type" value={values?.type} options={["Artista", "Espacio cultural", "OrganizaciÃ³n cultural", "AgrupaciÃ³n", "Colectividad", "PeÃ±a"]} /><Field label="Disciplina / actividad" name="discipline" value={values?.discipline} /><Field label="Barrio" name="neighborhood" value={values?.neighborhood} /><Field label="DirecciÃ³n" name="address" value={values?.address} wide /><Field label="TelÃ©fono o contacto" name="phone" value={values?.phone} /><Field label="Latitud" name="latitude" type="number" step="any" value={values?.latitude} /><Field label="Longitud" name="longitude" type="number" step="any" value={values?.longitude} /><p className="field-help wide-field">PodÃ©s dejar latitud y longitud vacÃ­as y ubicar el registro directamente haciendo clic en el Mapa cultural.</p><label className="check"><input type="checkbox" name="sustained" defaultChecked={Boolean(values?.sustained)} /> ParticipaciÃ³n sostenida</label></>}
  </div><footer><button className="secondary" type="button" onClick={close}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "Guardandoâ€¦" : "Guardar"}</button></footer></form></div>;
}

function Field({ label, name, type = "text", value, required, wide, step }: { label: string; name: string; type?: string; value?: string | number | boolean | null; required?: boolean; wide?: boolean; step?: string }) {
  return <label className={wide ? "wide-field" : ""}>{label}<input name={name} type={type} step={step} defaultValue={typeof value === "boolean" || value === null ? "" : value} required={required} /></label>;
}

function Select({ label, name, value, options }: { label: string; name: string; value?: string | number | boolean | null; options: string[] }) {
  return <label>{label}<select name={name} defaultValue={String(value ?? options[0])}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
