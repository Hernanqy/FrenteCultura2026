"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Pencil, PhoneCall, Search, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

type Referente = {
  id: number;
  workspace_id: string;
  name: string;
  phone: string;
  discipline: string;
  source: string;
  original_status: string;
  original_notes: string;
  contacted: boolean;
  contact_date: string | null;
  response: string;
  information_provided: string;
  follow_up: string;
  created_at: string;
  updated_at: string;
};

type EditForm = {
  contacted: boolean;
  contact_date: string;
  response: string;
  information_provided: string;
  follow_up: string;
};

const emptyForm: EditForm = {
  contacted: false,
  contact_date: "",
  response: "",
  information_provided: "",
  follow_up: "",
};

function normalizePhone(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function ReferentesPanel({ onError }: { onError?: (message: string) => void }) {
  const [referentes, setReferentes] = useState<Referente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "pendientes" | "contactados">("todos");
  const [editing, setEditing] = useState<Referente | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("referentes")
      .select("*")
      .eq("workspace_id", WORKSPACE_ID)
      .order("name");

    if (error) {
      const message = "No se pudieron cargar los referentes: " + error.message;
      setNotice(message);
      onError?.(message);
    } else {
      setReferentes((data ?? []) as Referente[]);
    }
    setLoading(false);
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("es");
    return referentes.filter((r) => {
      if (filter === "pendientes" && r.contacted) return false;
      if (filter === "contactados" && !r.contacted) return false;
      if (!q) return true;
      const haystack = [r.name, r.phone, r.discipline, r.source, r.response, r.information_provided, r.follow_up]
        .join(" ")
        .toLocaleLowerCase("es");
      return haystack.includes(q);
    });
  }, [referentes, search, filter]);

  const stats = useMemo(() => ({
    total: referentes.length,
    contacted: referentes.filter((r) => r.contacted).length,
    pending: referentes.filter((r) => !r.contacted).length,
    withInfo: referentes.filter((r) => r.information_provided.trim()).length,
  }), [referentes]);

  function openEdit(item: Referente) {
    setEditing(item);
    setForm({
      contacted: item.contacted,
      contact_date: item.contact_date ?? "",
      response: item.response ?? "",
      information_provided: item.information_provided ?? "",
      follow_up: item.follow_up ?? "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("referentes")
      .update({
        contacted: form.contacted,
        contact_date: form.contacted ? (form.contact_date || new Date().toISOString().slice(0, 10)) : null,
        response: form.response,
        information_provided: form.information_provided,
        follow_up: form.follow_up,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editing.id);

    setSaving(false);
    if (error) {
      setNotice(error.message);
      onError?.(error.message);
      return;
    }
    setEditing(null);
    await load();
  }

  async function quickMarkCalled(item: Referente) {
    const { error } = await supabase
      .from("referentes")
      .update({
        contacted: true,
        contact_date: item.contact_date || new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setNotice(error.message);
      onError?.(error.message);
    } else {
      await load();
    }
  }

  async function importExcel(file: File) {
    setImporting(true);
    setNotice("");
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      const mapped = rows
        .map((row) => ({
          workspace_id: WORKSPACE_ID,
          period: text(row[0]),
          original_status: text(row[1]),
          name: text(row[2]),
          phone: normalizePhone(row[3]),
          discipline: text(row[4]),
          source: text(row[6]),
          original_notes: text(row[8]),
          raw_data: {
            column_f: text(row[5]),
            column_h: text(row[7]),
          },
          contacted: false,
          response: "",
          information_provided: "",
          follow_up: "",
        }))
        .filter((row) => row.name);

      if (!mapped.length) {
        throw new Error("No encontré nombres en la tercera columna del Excel.");
      }

      const { data: current, error: currentError } = await supabase
        .from("referentes")
        .select("name,phone")
        .eq("workspace_id", WORKSPACE_ID);
      if (currentError) throw currentError;

      const existing = new Set(
        (current ?? []).map((r) => `${String(r.name).trim().toLocaleLowerCase("es")}|${String(r.phone ?? "").trim()}`)
      );

      const newRows = mapped.filter((row) => {
        const key = `${row.name.toLocaleLowerCase("es")}|${row.phone}`;
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });

      if (!newRows.length) {
        setNotice("El Excel no agregó registros nuevos: todos ya estaban cargados.");
        return;
      }

      for (let i = 0; i < newRows.length; i += 100) {
        const { error } = await supabase.from("referentes").insert(newRows.slice(i, i + 100));
        if (error) throw error;
      }

      setNotice(`Importación completa: ${newRows.length} referentes nuevos.`);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo importar el Excel.";
      setNotice(message);
      onError?.(message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="referentes-section">
      <header className="section-intro referentes-title-row">
        <div>
          <p className="eyebrow">CONTACTOS Y SEGUIMIENTO</p>
          <h2>Referentes</h2>
        </div>
        <div className="referentes-import-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importExcel(file);
            }}
          />
          <button className="primary" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Upload className="spin-icon" /> : <FileSpreadsheet />}
            {importing ? "Importando…" : "Importar Excel"}
          </button>
        </div>
      </header>

      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}><X /></button></div>}

      <div className="referentes-kpis">
        <article><strong>{stats.total}</strong><span>Total</span></article>
        <article><strong>{stats.contacted}</strong><span>Contactados</span></article>
        <article><strong>{stats.pending}</strong><span>Pendientes</span></article>
        <article><strong>{stats.withInfo}</strong><span>Con información</span></article>
      </div>

      <div className="referentes-toolbar">
        <label className="search-box referentes-search">
          <Search />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, teléfono, disciplina o información…" />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="todos">Todos</option>
          <option value="pendientes">Pendientes de contacto</option>
          <option value="contactados">Contactados</option>
        </select>
      </div>

      <div className="referentes-table-card">
        <div className="table-wrap">
          <table className="referentes-table">
            <thead>
              <tr>
                <th>Referente</th>
                <th>Contacto</th>
                <th>Disciplina / origen</th>
                <th>¿Llamado?</th>
                <th>Qué dijo</th>
                <th>Información brindada</th>
                <th>Seguimiento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="referentes-empty">Cargando referentes…</div></td></tr>
              ) : filtered.length ? filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    {(item.original_status || item.original_notes) && (
                      <small className="referente-original">Dato previo: {[item.original_status, item.original_notes].filter(Boolean).join(" · ")}</small>
                    )}
                  </td>
                  <td>{item.phone || <span className="muted">Sin teléfono</span>}</td>
                  <td>
                    <span>{item.discipline || "—"}</span>
                    <small>{item.source || "Sin origen"}</small>
                  </td>
                  <td>
                    {item.contacted ? (
                      <span className="referente-status done"><CheckCircle2 /> Sí {item.contact_date ? `· ${new Date(item.contact_date + "T12:00:00").toLocaleDateString("es-AR")}` : ""}</span>
                    ) : (
                      <button className="referente-call-btn" onClick={() => void quickMarkCalled(item)}><PhoneCall /> Marcar llamado</button>
                    )}
                  </td>
                  <td className="referente-longtext">{item.response || <span className="muted">Sin registro</span>}</td>
                  <td className="referente-longtext">{item.information_provided || <span className="muted">Sin registro</span>}</td>
                  <td className="referente-longtext">{item.follow_up || <span className="muted">Sin seguimiento</span>}</td>
                  <td><button className="referente-edit-btn" onClick={() => openEdit(item)}><Pencil /> Editar</button></td>
                </tr>
              )) : (
                <tr><td colSpan={8}><div className="referentes-empty">No hay referentes que coincidan con la búsqueda.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="editor referentes-editor">
            <header>
              <div><p className="kicker">SEGUIMIENTO</p><h2>{editing.name}</h2></div>
              <button type="button" onClick={() => setEditing(null)}><X /></button>
            </header>
            <div className="form-grid">
              <label className="check wide-field">
                <input
                  type="checkbox"
                  checked={form.contacted}
                  onChange={(e) => setForm((f) => ({ ...f, contacted: e.target.checked }))}
                />
                Ya fue contactado / llamado
              </label>
              <label>
                Fecha de contacto
                <input
                  type="date"
                  value={form.contact_date}
                  onChange={(e) => setForm((f) => ({ ...f, contact_date: e.target.value }))}
                />
              </label>
              <label className="wide-field">
                Qué dijo
                <textarea
                  rows={4}
                  value={form.response}
                  onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}
                  placeholder="Respuesta, disponibilidad, interés, dudas, compromisos…"
                />
              </label>
              <label className="wide-field">
                Información que brindó
                <textarea
                  rows={4}
                  value={form.information_provided}
                  onChange={(e) => setForm((f) => ({ ...f, information_provided: e.target.value }))}
                  placeholder="Datos sobre espacios, artistas, actividades, contactos, barrios…"
                />
              </label>
              <label className="wide-field">
                Seguimiento / próximo paso
                <textarea
                  rows={3}
                  value={form.follow_up}
                  onChange={(e) => setForm((f) => ({ ...f, follow_up: e.target.value }))}
                  placeholder="Volver a llamar, pedir información, invitar, derivar…"
                />
              </label>
            </div>
            <footer>
              <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary" type="button" disabled={saving} onClick={() => void saveEdit()}>{saving ? "Guardando…" : "Guardar seguimiento"}</button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
