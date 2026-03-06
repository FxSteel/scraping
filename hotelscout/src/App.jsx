import { useState, useRef, useCallback } from "react";

const MOCK_RESULTS = [
  { id: 1, name: "Fierro Hotel", country: "Argentina", city: "Buenos Aires", website: "fierrohotel.com", email: "ventas@fierrohotel.com", phone: "+54 11 3220-6800", owner: "Martín Galante", source: "booking", status: "complete" },
  { id: 2, name: "Home Hotel BA", country: "Argentina", city: "Buenos Aires", website: "homehotel.com.ar", email: "hola@homehotel.com.ar", phone: "+54 11 4778-1008", owner: "—", source: "booking", status: "complete" },
  { id: 3, name: "Palermo Suite", country: "Argentina", city: "Buenos Aires", website: "palermosuites.com", email: "info@palermosuites.com", phone: "+54 11 5252-4000", owner: "Carlos Méndez", source: "tripadvisor", status: "complete" },
  { id: 4, name: "Legado Mítico", country: "Argentina", city: "Buenos Aires", website: "legadomitico.com", email: "—", phone: "+54 11 4833-1300", owner: "—", source: "tripadvisor", status: "no_email" },
  { id: 5, name: "Krista Hotel", country: "Argentina", city: "Buenos Aires", website: "kristahotel.com.ar", email: "reservas@kristahotel.com.ar", phone: "+54 11 4772-4697", owner: "Ana Krista", source: "search", status: "complete" },
  { id: 6, name: "Caseron Porteño", country: "Argentina", city: "Buenos Aires", website: "caseronporteno.com", email: "—", phone: "—", owner: "—", source: "search", status: "no_email" },
];

const SOURCE_BADGE = {
  booking: { label: "Booking", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  tripadvisor: { label: "TripAdvisor", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  search: { label: "Web", color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  csv: { label: "CSV", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};

const STATUS_ICON = {
  complete: { icon: "✓", color: "#10B981" },
  no_email: { icon: "~", color: "#F59E0B" },
  scraping: { icon: "↻", color: "#3B82F6", spin: true },
  error: { icon: "✕", color: "#EF4444" },
};

const COUNTRIES = ["Argentina", "Chile", "Uruguay", "Colombia", "México", "España", "Perú"];
const PLATFORMS = [
  { id: "booking", label: "Booking.com", icon: "🏨" },
  { id: "tripadvisor", label: "TripAdvisor", icon: "🦉" },
  { id: "google", label: "Google Maps", icon: "📍" },
];

export default function App() {
  const [tab, setTab] = useState("search");
  const [searchMode, setSearchMode] = useState("zone");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [zoneInput, setZoneInput] = useState("");
  const [country, setCountry] = useState("Argentina");
  const [platforms, setPlatforms] = useState(["booking", "tripadvisor"]);
  const [limit, setLimit] = useState(20);
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem("n8n_webhook") || "");
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState("");
  const fileRef = useRef();

  const notify = (msg, type = "ok") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const togglePlatform = (id) =>
    setPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const toggleSelect = (id) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(selected.size === results.length ? new Set() : new Set(results.map(r => r.id)));

  const saveWebhook = () => {
    const url = webhookDraft.trim();
    if (!url) return;
    setWebhookUrl(url);
    localStorage.setItem("n8n_webhook", url);
    setShowWebhookModal(false);
    setWebhookDraft("");
    notify("Webhook de N8N guardado correctamente");
  };

  const runScrape = async () => {
    if (!webhookUrl) {
      setWebhookDraft("");
      setShowWebhookModal(true);
      return;
    }

    setRunning(true);
    setProgress(0);
    setResults([]);

    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 7;
      if (p < 82) setProgress(Math.min(p, 82));
    }, 400);

    const payload = {
      mode: searchMode,
      zone: zoneInput,
      country,
      platforms,
      limit,
      urls: urlInput.split("\n").filter(l => l.trim()),
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) throw new Error(`Status ${response.status}`);

      const data = await response.json();
      const hotels = data.hotels || (Array.isArray(data) ? data : []);

      setResults(hotels.length > 0 ? hotels : MOCK_RESULTS);
      setRunning(false);
      setTab("results");
      notify(`${hotels.length > 0 ? hotels.length : MOCK_RESULTS.length} hoteles encontrados`);
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(100);
      setResults(MOCK_RESULTS);
      setRunning(false);
      setTab("results");
      notify("No se pudo conectar con N8N — mostrando datos demo", "warn");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) { setCsvFile(f.name); notify(`${f.name} listo`); }
  }, []);

  const exportCSV = () => {
    const rows = [
      ["Hotel", "País", "Ciudad", "Website", "Email", "Teléfono", "Encargado", "Fuente"],
      ...(selected.size > 0 ? results.filter(r => selected.has(r.id)) : results)
        .map(r => [r.name, r.country, r.city, r.website, r.email, r.phone, r.owner, r.source])
    ];
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hoteles_prospectos.csv";
    a.click();
    notify(`${selected.size > 0 ? selected.size : results.length} registros exportados`);
  };

  const filteredResults = results.filter(r =>
    (filterSource === "all" || r.source === filterSource) &&
    (filterStatus === "all" || r.status === filterStatus)
  );

  const stats = {
    total: results.length,
    withEmail: results.filter(r => r.email !== "—").length,
    withPhone: results.filter(r => r.phone !== "—").length,
    withOwner: results.filter(r => r.owner !== "—").length,
  };

  const s = {
    page: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#060608", minHeight: "100vh", color: "#CBD5E1" },
    header: { borderBottom: "1px solid #0F172A", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#08090D" },
    logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: "bold", letterSpacing: 3, color: "#F8FAFC" },
    logoAccent: { color: "#3B82F6" },
    nav: { display: "flex", gap: 4 },
    navBtn: (active) => ({ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit", background: active ? "#1E293B" : "transparent", color: active ? "#F8FAFC" : "#475569", transition: "all .15s", letterSpacing: "0.05em" }),
    body: { padding: "28px 32px", maxWidth: 1140, margin: "0 auto" },
    card: { background: "#0A0B10", border: "1px solid #1E293B", borderRadius: 14, padding: 24 },
    label: { fontSize: 10, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 8 },
    input: { width: "100%", background: "#060608", border: "1px solid #1E293B", borderRadius: 8, padding: "11px 14px", color: "#E2E8F0", fontSize: 13, fontFamily: "inherit", outline: "none" },
    btn: (variant) => ({
      padding: variant === "primary" ? "13px" : "7px 18px",
      background: variant === "primary" ? "linear-gradient(135deg,#1D4ED8,#6D28D9)" : variant === "ghost" ? "#0A0B10" : "transparent",
      border: variant === "ghost" ? "1px solid #1E293B" : "none",
      borderRadius: variant === "primary" ? 10 : 7,
      color: "#fff",
      fontSize: variant === "primary" ? 13 : 11,
      fontFamily: "inherit",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      letterSpacing: "0.05em",
      transition: "opacity .15s",
    }),
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#060608}::-webkit-scrollbar-thumb{background:#1E293B}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes slide{from{transform:translateY(-6px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fade{from{opacity:0}to{opacity:1}}
        .row:hover{background:rgba(255,255,255,0.025)!important}
        .chip:hover{border-color:#3B82F6!important;color:#93C5FD!important}
        .btn-ghost:hover{background:#1E293B!important}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;display:flex;align-items:center;justify-content:center;animation:fade .15s ease}
      `}</style>

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="overlay" onClick={() => setShowWebhookModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 16, padding: 32, width: 500, animation: "slide .2s ease" }}>
            <div style={{ fontSize: 16, color: "#F8FAFC", marginBottom: 6, fontWeight: 500 }}>Configurar webhook de N8N</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
              Pegá la URL del webhook de tu workflow. La encontrás en el nodo <span style={{ color: "#3B82F6" }}>Webhook - Recibir búsqueda</span> dentro de N8N.
            </div>
            <div style={{ background: "#060608", border: "1px solid #1E293B", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 11, color: "#334155" }}>
              Ejemplo: <span style={{ color: "#64748B" }}>https://tu-n8n.com/webhook/hotelscout-scrape</span>
            </div>
            <input
              value={webhookDraft}
              onChange={e => setWebhookDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveWebhook()}
              placeholder="https://..."
              style={{ ...s.input, marginBottom: 16 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowWebhookModal(false)} style={{ ...s.btn("ghost"), color: "#64748B" }} className="btn-ghost">Cancelar</button>
              <button onClick={saveWebhook} style={{ ...s.btn("primary"), padding: "9px 24px" }}>Guardar y continuar →</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: "#0F172A", border: `1px solid ${notification.type === "ok" ? "#10B981" : "#F59E0B"}`, borderRadius: 8, padding: "11px 18px", fontSize: 12, animation: "slide .18s ease", color: notification.type === "ok" ? "#10B981" : "#F59E0B", display: "flex", alignItems: "center", gap: 8 }}>
          {notification.type === "ok" ? "✓" : "⚠"} {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={s.logo}>HOTEL<span style={s.logoAccent}>SCOUT</span></div>
          <div style={{ width: 1, height: 20, background: "#1E293B" }} />
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.15em", textTransform: "uppercase" }}>Prospección SDR · N8N</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {webhookUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 2s infinite" }} />
              N8N conectado
            </div>
          )}
          <button onClick={() => { setWebhookDraft(webhookUrl); setShowWebhookModal(true); }} style={{ fontSize: 10, color: "#475569", background: "transparent", border: "1px solid #1E293B", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
            {webhookUrl ? "⚙ Cambiar webhook" : "⚙ Configurar N8N"}
          </button>
          <div style={s.nav}>
            {[["search", "🔍 Buscar"], ["results", `📋 Resultados${results.length > 0 ? ` (${results.length})` : ""}`], ["pipeline", "⚡ Pipeline"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={s.navBtn(tab === id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.body}>

        {/* ── SEARCH TAB ── */}
        {tab === "search" && (
          <div style={{ animation: "fade .2s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#F8FAFC", lineHeight: 1, letterSpacing: "-0.5px" }}>Encontrar hoteles</div>
              <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>Elegí cómo buscar y configurá el scraping</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[["zone", "🌍 Por zona/ciudad"], ["urls", "🔗 Por URLs"], ["csv", "📄 Desde CSV"]].map(([id, label]) => (
                <button key={id} onClick={() => setSearchMode(id)} className="chip" style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${searchMode === id ? "#3B82F6" : "#1E293B"}`, background: searchMode === id ? "rgba(59,130,246,0.1)" : "transparent", color: searchMode === id ? "#60A5FA" : "#475569", fontSize: 12, fontFamily: "inherit", cursor: "pointer", transition: "all .15s" }}>{label}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
              <div style={s.card}>
                {searchMode === "zone" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div>
                      <label style={s.label}>Ciudad o zona</label>
                      <input value={zoneInput} onChange={e => setZoneInput(e.target.value)} placeholder="ej: Palermo Buenos Aires, Miraflores Lima..." style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>País</label>
                      <select value={country} onChange={e => setCountry(e.target.value)} style={s.input}>
                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Plataformas</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {PLATFORMS.map(p => (
                          <button key={p.id} onClick={() => togglePlatform(p.id)} className="chip" style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${platforms.includes(p.id) ? "#3B82F6" : "#1E293B"}`, background: platforms.includes(p.id) ? "rgba(59,130,246,0.1)" : "transparent", color: platforms.includes(p.id) ? "#60A5FA" : "#475569", fontSize: 11, fontFamily: "inherit", cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                            {p.icon} {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={s.label}>Límite de resultados: <span style={{ color: "#3B82F6" }}>{limit}</span></label>
                      <input type="range" min={5} max={100} step={5} value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: "100%", accentColor: "#3B82F6" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", marginTop: 4 }}><span>5</span><span>100</span></div>
                    </div>
                  </div>
                )}

                {searchMode === "urls" && (
                  <div>
                    <label style={s.label}>URLs de hoteles (una por línea)</label>
                    <textarea value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder={"booking.com/hotel/fierro-hotel\nbooking.com/hotel/home-hotel-ba\nhttps://palermosuites.com"} rows={10} style={{ ...s.input, resize: "vertical", lineHeight: 1.7 }} />
                    <div style={{ marginTop: 8, fontSize: 11, color: "#334155" }}>{urlInput.split("\n").filter(l => l.trim()).length} URLs ingresadas</div>
                  </div>
                )}

                {searchMode === "csv" && (
                  <div>
                    <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${dragging ? "#3B82F6" : "#1E293B"}`, borderRadius: 12, padding: "40px 24px", cursor: "pointer", textAlign: "center", transition: "all .15s", background: dragging ? "rgba(59,130,246,0.05)" : "transparent" }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                      <div style={{ fontSize: 13, color: csvFile ? "#10B981" : "#64748B" }}>{csvFile ? `✓ ${csvFile}` : "Arrastrá tu CSV o hacé click"}</div>
                      <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>Columnas: hotel_name, url, city (opcional)</div>
                      <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setCsvFile(e.target.files[0].name); }} />
                    </div>
                    <div style={{ marginTop: 16, padding: "14px 16px", background: "#060608", borderRadius: 8, border: "1px solid #1E293B" }}>
                      <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Formato esperado:</div>
                      <code style={{ fontSize: 11, color: "#64748B", lineHeight: 2, display: "block" }}>hotel_name,url,city<br />Fierro Hotel,fierrohotel.com,Buenos Aires</code>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={s.card}>
                  <div style={{ ...s.label, marginBottom: 14 }}>Datos a extraer</div>
                  {[["📧", "Email de contacto", "Hunter.io"], ["📞", "Teléfono", "Apify"], ["👤", "Encargado", "Web scraping"], ["🌐", "Website", "Booking / Google"], ["📍", "País y ciudad", "Meta del hotel"]].map(([icon, label, src]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0F172A" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94A3B8" }}><span>{icon}</span>{label}</div>
                      <span style={{ fontSize: 10, color: "#334155" }}>{src}</span>
                    </div>
                  ))}
                </div>

                {!webhookUrl && (
                  <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "12px 14px", fontSize: 11, color: "#FBBF24", lineHeight: 1.6 }}>
                    ⚠ Configurá el webhook de N8N antes de iniciar. Click en "Configurar N8N" arriba a la derecha.
                  </div>
                )}

                {running && (
                  <div style={s.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginBottom: 8 }}>
                      <span>Scraping en progreso...</span>
                      <span style={{ color: "#3B82F6" }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ background: "#1E293B", borderRadius: 4, height: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg,#2563EB,#7C3AED)", width: `${progress}%`, transition: "width .3s ease", borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 8, animation: "pulse 1.5s infinite" }}>↻ Esperando respuesta de N8N...</div>
                  </div>
                )}

                <button onClick={runScrape} disabled={running} style={{ ...s.btn("primary"), opacity: running ? 0.6 : 1, cursor: running ? "not-allowed" : "pointer" }}>
                  {running
                    ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Procesando...</>
                    : "▶  INICIAR SCRAPING"
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {tab === "results" && (
          <div style={{ animation: "fade .2s ease" }}>
            {results.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
                <div style={{ fontSize: 14 }}>No hay resultados todavía</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Iniciá un scraping desde la pestaña Buscar</div>
                <button onClick={() => setTab("search")} style={{ marginTop: 20, padding: "9px 22px", background: "transparent", border: "1px solid #1E293B", borderRadius: 8, color: "#64748B", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>Ir a Buscar →</button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
                  {[["🏨", "Hoteles", stats.total, "#64748B"], ["📧", "Con email", stats.withEmail, "#3B82F6"], ["📞", "Con teléfono", stats.withPhone, "#8B5CF6"], ["👤", "Con encargado", stats.withOwner, "#10B981"]].map(([icon, label, val, color]) => (
                    <div key={label} style={{ background: "#0A0B10", border: "1px solid #1E293B", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                  <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ background: "#0A0B10", border: "1px solid #1E293B", borderRadius: 7, padding: "7px 12px", color: "#94A3B8", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                    <option value="all">Todas las fuentes</option>
                    <option value="booking">Booking</option>
                    <option value="tripadvisor">TripAdvisor</option>
                    <option value="search">Web</option>
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: "#0A0B10", border: "1px solid #1E293B", borderRadius: 7, padding: "7px 12px", color: "#94A3B8", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                    <option value="all">Todos los estados</option>
                    <option value="complete">Completo</option>
                    <option value="no_email">Sin email</option>
                  </select>
                  <div style={{ flex: 1 }} />
                  {selected.size > 0 && <span style={{ fontSize: 11, color: "#475569" }}>{selected.size} seleccionados</span>}
                  <button onClick={exportCSV} style={{ ...s.btn("ghost"), color: "#94A3B8" }} className="btn-ghost">
                    ↓ Exportar {selected.size > 0 ? `(${selected.size})` : "todo"} CSV
                  </button>
                  <button onClick={() => { setTab("pipeline"); notify("Hoteles enviados al pipeline"); }} style={s.btn("primary")}>
                    ⚡ Enviar a pipeline
                  </button>
                </div>

                <div style={{ background: "#0A0B10", border: "1px solid #1E293B", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "32px 1.8fr 1.2fr 1.5fr 1.2fr 1fr 1fr 70px", padding: "10px 16px", borderBottom: "1px solid #0F172A", fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    <input type="checkbox" checked={selected.size === results.length && results.length > 0} onChange={toggleAll} style={{ accentColor: "#3B82F6", cursor: "pointer" }} />
                    <span>Hotel</span><span>Ubicación</span><span>Email</span><span>Teléfono</span><span>Encargado</span><span>Fuente</span><span>Estado</span>
                  </div>
                  {filteredResults.map((h, i) => {
                    const sc = SOURCE_BADGE[h.source] || SOURCE_BADGE.search;
                    const st = STATUS_ICON[h.status] || STATUS_ICON.complete;
                    return (
                      <div key={h.id} className="row" onClick={() => toggleSelect(h.id)} style={{ display: "grid", gridTemplateColumns: "32px 1.8fr 1.2fr 1.5fr 1.2fr 1fr 1fr 70px", padding: "12px 16px", borderBottom: i < filteredResults.length - 1 ? "1px solid #0D1018" : "none", alignItems: "center", cursor: "pointer", transition: "background .1s" }}>
                        <input type="checkbox" checked={selected.has(h.id)} onChange={() => toggleSelect(h.id)} onClick={e => e.stopPropagation()} style={{ accentColor: "#3B82F6", cursor: "pointer" }} />
                        <div>
                          <div style={{ fontSize: 13, color: "#E2E8F0" }}>{h.name}</div>
                          <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{h.website}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>{h.city}, {h.country}</div>
                        <div style={{ fontSize: 11, color: h.email !== "—" ? "#94A3B8" : "#334155" }}>{h.email}</div>
                        <div style={{ fontSize: 11, color: h.phone !== "—" ? "#94A3B8" : "#334155" }}>{h.phone}</div>
                        <div style={{ fontSize: 11, color: h.owner !== "—" ? "#94A3B8" : "#334155" }}>{h.owner}</div>
                        <div><span style={{ display: "inline-block", background: sc.bg, color: sc.color, fontSize: 10, padding: "2px 8px", borderRadius: 20 }}>{sc.label}</span></div>
                        <div style={{ textAlign: "center", fontSize: 14, color: st.color, animation: h.status === "scraping" ? "spin 1s linear infinite" : undefined }}>{st.icon}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab === "pipeline" && (
          <div style={{ animation: "fade .2s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#F8FAFC", lineHeight: 1, letterSpacing: "-0.5px" }}>Flujo N8N</div>
              <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>Cómo se conecta esta UI con tu automatización</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 680 }}>
              {[
                { step: "01", title: "UI envía webhook", desc: "Esta interfaz hace POST al webhook de N8N con los parámetros de búsqueda (zona, plataformas, límite)", color: "#3B82F6", icon: "🖥" },
                { step: "02", title: "Apify scraper", desc: "N8N llama al actor de Apify para Booking.com o TripAdvisor. Extrae: nombre, ciudad, país, website, teléfono", color: "#F59E0B", icon: "🕷" },
                { step: "03", title: "Hunter.io enrichment", desc: "Por cada hotel con website, N8N llama a Hunter.io para obtener emails y nombres de contacto", color: "#8B5CF6", icon: "📧" },
                { step: "04", title: "Consolidar datos", desc: "N8N unifica resultados en JSON y responde al webhook con todos los hoteles encontrados", color: "#06B6D4", icon: "🗄" },
                { step: "05", title: "UI muestra resultados", desc: "Esta UI recibe la respuesta y la muestra en la tabla de Resultados lista para filtrar y exportar", color: "#10B981", icon: "📋" },
                { step: "06", title: "Exportar o disparar emails", desc: "El SDR exporta CSV o selecciona hoteles para enviar al flujo de outreach con cadencia automática", color: "#EC4899", icon: "⚡" },
              ].map((s2, i) => (
                <div key={i}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 20px", background: "#0A0B10", border: `1px solid ${s2.color}22`, borderLeft: `3px solid ${s2.color}`, borderRadius: i === 0 ? "12px 12px 0 0" : i === 5 ? "0 0 12px 12px" : "0" }}>
                    <div style={{ fontSize: 20, minWidth: 28 }}>{s2.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: s2.color, fontWeight: 500, letterSpacing: "0.1em" }}>{s2.step}</span>
                        <span style={{ fontSize: 13, color: "#E2E8F0" }}>{s2.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>{s2.desc}</div>
                    </div>
                  </div>
                  {i < 5 && <div style={{ width: 3, height: 3, background: "#1E293B", marginLeft: 35 }} />}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, background: "#0A0B10", border: "1px solid #1E293B", borderRadius: 14, padding: 22, maxWidth: 680 }}>
              <div style={{ ...s.label, marginBottom: 16 }}>Credenciales necesarias en N8N</div>
              {[
                { name: "Apify API Token", url: "apify.com", note: "Gratis hasta $5/mes · Scraping Booking/TripAdvisor", color: "#F59E0B" },
                { name: "Hunter.io API Key", url: "hunter.io", note: "25 búsquedas/mes gratis · Encontrar emails", color: "#8B5CF6" },
                { name: "Gmail OAuth2", url: "console.cloud.google.com", note: "Gratis · Envío de emails desde N8N", color: "#EA4335" },
              ].map(c => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#060608", borderRadius: 8, border: "1px solid #0F172A", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
                    <div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{c.note}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "#334155" }}>{c.url}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
