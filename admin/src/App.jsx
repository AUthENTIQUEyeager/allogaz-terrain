import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabase";
import {
  Search,
  Users,
  Phone,
  Clock,
  MapPinned,
  Store,
  CircleDot,
  Loader2,
} from "lucide-react";

const STATUS_META = {
  prospect: { label: "Prospect", color: "#4A6FA5" },
  inscrit: { label: "Inscrit", color: "#2F6B4F" },
  refus: { label: "Refus", color: "#9B3B2B" },
};

// Couleurs assignées aux agents par hash de leur id -> stable même si la
// liste d'agents change d'ordre entre deux chargements.
const AGENT_PALETTE = [
  "#2F8F9D",
  "#7A4B8C",
  "#B8862F",
  "#C1543C",
  "#6C5CA6",
  "#A6436B",
];

function colorForAgent(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AGENT_PALETTE[hash % AGENT_PALETTE.length];
}

const MAP_W = 900;
const MAP_H = 540;
const PAD = 46;

// Zone par défaut (Ouagadougou) tant qu'aucune fiche n'est encore arrivée
const DEFAULT_LAT_RANGE = [12.325, 12.418];
const DEFAULT_LNG_RANGE = [-1.558, -1.455];

function computeBounds(visits) {
  if (visits.length === 0) {
    return { latRange: DEFAULT_LAT_RANGE, lngRange: DEFAULT_LNG_RANGE };
  }
  const lats = visits.map((v) => v.lat).filter((n) => typeof n === "number");
  const lngs = visits.map((v) => v.lng).filter((n) => typeof n === "number");
  if (lats.length === 0) {
    return { latRange: DEFAULT_LAT_RANGE, lngRange: DEFAULT_LNG_RANGE };
  }
  // Zoom minimum garanti : avec 1 ou 2 fiches très proches, on évite de
  // sur-zoomer sur un point quasi vide et sans repère.
  const MIN_SPAN = 0.03;
  const latCenter = (Math.max(...lats) + Math.min(...lats)) / 2;
  const lngCenter = (Math.max(...lngs) + Math.min(...lngs)) / 2;
  const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), MIN_SPAN);
  const lngSpan = Math.max(Math.max(...lngs) - Math.min(...lngs), MIN_SPAN);
  const latPad = latSpan * 0.25;
  const lngPad = lngSpan * 0.25;
  return {
    latRange: [latCenter - latSpan / 2 - latPad, latCenter + latSpan / 2 + latPad],
    lngRange: [lngCenter - lngSpan / 2 - lngPad, lngCenter + lngSpan / 2 + lngPad],
  };
}

function project(lat, lng, latRange, lngRange) {
  const x =
    ((lng - lngRange[0]) / (lngRange[1] - lngRange[0])) * (MAP_W - PAD * 2) +
    PAD;
  const y =
    (1 - (lat - latRange[0]) / (latRange[1] - latRange[0])) *
      (MAP_H - PAD * 2) +
    PAD;
  return { x, y };
}

// Transforme une ligne field_visits en objet utilisé par l'UI
function mapVisitRow(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    shopName: row.shop_name || "",
    phone: row.phone || "",
    city: row.city || "",
    neighborhood: row.neighborhood || "",
    status: row.status,
    lat: row.latitude,
    lng: row.longitude,
    time: row.visited_at
      ? new Date(row.visited_at).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "",
  };
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setError("Email ou mot de passe incorrect.");
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Supervision terrain</h1>
        <p className="login-sub">Accès admin AlloGaz</p>

        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="text-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="field-label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          className="text-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="form-error">{error}</div>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="spin" /> Connexion…
            </>
          ) : (
            "Se connecter"
          )}
        </button>
      </form>
    </div>
  );
}

const NEIGHBORHOOD_LABELS = [
  { name: "Somgandé", lat: 12.406, lng: -1.487 },
  { name: "Bendogo", lat: 12.413, lng: -1.506 },
  { name: "Tanghin", lat: 12.388, lng: -1.515 },
  { name: "Zogona", lat: 12.371, lng: -1.533 },
  { name: "Dassasgho", lat: 12.384, lng: -1.474 },
  { name: "Kilwin", lat: 12.397, lng: -1.459 },
  { name: "Gounghin", lat: 12.353, lng: -1.524 },
  { name: "Patte d'Oie", lat: 12.335, lng: -1.511 },
  { name: "Cissin", lat: 12.334, lng: -1.551 },
  { name: "Wemtenga", lat: 12.360, lng: -1.497 },
];

function Marker({ visit, agent, selected, hovered, latRange, lngRange, onSelect, onHover }) {
  const { x, y } = project(visit.lat, visit.lng, latRange, lngRange);
  const color = agent?.color || "#9AA3A9";
  const label = visit.shopName || "Sans nom (refus)";
  const emphasized = selected || hovered;
  const r = emphasized ? 9 : 7;
  const meta = STATUS_META[visit.status];

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelect(visit.id)}
      onMouseEnter={() => onHover(visit.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer" }}
    >
      <title>{`${label} — ${agent?.name || "Agent inconnu"} — ${meta.label}`}</title>

      {emphasized && (
        <circle r={r + 8} fill="none" stroke={color} strokeWidth="1.5" opacity="0.45" />
      )}
      {visit.status === "inscrit" && (
        <circle r={r} fill={color} stroke="#fff" strokeWidth="2" />
      )}
      {visit.status === "prospect" && (
        <circle r={r} fill="#fff" stroke={color} strokeWidth="2.5" />
      )}
      {visit.status === "refus" && (
        <rect x={-r * 0.7} y={-r * 0.7} width={r * 1.4} height={r * 1.4} fill={color} opacity="0.55" transform="rotate(45)" />
      )}

      <text
        x={r + 6}
        y={4}
        fontSize={emphasized ? "11.5" : "10.5"}
        fontWeight={emphasized ? "700" : "600"}
        fontFamily="'IBM Plex Sans', sans-serif"
        fill="#3B4650"
        style={{ pointerEvents: "none" }}
      >
        {label.length > 20 ? `${label.slice(0, 19)}…` : label}
      </text>
    </g>
  );
}

function CityMap({ visits, agentsById, selectedId, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);
  const { latRange, lngRange } = useMemo(() => computeBounds(visits), [visits]);

  const ordered = useMemo(
    () => [...visits].sort((a, b) => (a.id === selectedId ? 1 : b.id === selectedId ? -1 : 0)),
    [visits, selectedId]
  );

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="city-map">
      <rect width={MAP_W} height={MAP_H} fill="#F5F1E7" />

      {Array.from({ length: 13 }).map((_, i) => (
        <line key={`v${i}`} x1={PAD + i * 66} y1={0} x2={PAD + i * 66} y2={MAP_H} stroke="#E4DCC9" strokeWidth="1" />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={PAD + i * 58} x2={MAP_W} y2={PAD + i * 58} stroke="#E4DCC9" strokeWidth="1" />
      ))}
      <line x1="0" y1="70" x2={MAP_W} y2="330" stroke="#DCD2B8" strokeWidth="3" />
      <line x1="120" y1="0" x2="640" y2={MAP_H} stroke="#DCD2B8" strokeWidth="3" />

      {NEIGHBORHOOD_LABELS.map((n) => {
        const { x, y } = project(n.lat, n.lng, latRange, lngRange);
        if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return null;
        return (
          <text key={n.name} x={x} y={y} fontSize="11.5" fill="#A79E86" fontFamily="'Space Grotesk', sans-serif" fontWeight="600" textAnchor="middle">
            {n.name.toUpperCase()}
          </text>
        );
      })}

      {ordered.map((v) => (
        <Marker
          key={v.id}
          visit={v}
          agent={agentsById[v.agentId]}
          selected={v.id === selectedId}
          hovered={v.id === hoveredId}
          latRange={latRange}
          lngRange={lngRange}
          onSelect={onSelect}
          onHover={setHoveredId}
        />
      ))}
    </svg>
  );
}

function DetailPanel({ visit, agent }) {
  if (!visit) {
    return (
      <div className="detail-empty">
        <MapPinned size={22} />
        <p>Sélectionnez un point sur la carte pour voir le détail.</p>
      </div>
    );
  }
  const meta = STATUS_META[visit.status];
  return (
    <div className="detail-panel">
      <div className="detail-status" style={{ color: meta.color }}>
        <CircleDot size={13} /> {meta.label}
      </div>
      <h3>{visit.shopName || "Sans nom (refus)"}</h3>
      <div className="detail-row">
        <Store size={14} />
        {visit.neighborhood}, {visit.city}
      </div>
      {visit.phone && (
        <div className="detail-row">
          <Phone size={14} />
          {visit.phone}
        </div>
      )}
      <div className="detail-row">
        <Clock size={14} />
        {visit.time}
      </div>
      <div className="detail-agent">
        <span className="agent-dot" style={{ background: agent?.color || "#9AA3A9" }} />
        {agent?.name || "Agent inconnu"}
      </div>
      <div className="detail-coords">
        {visit.lat?.toFixed(5)}, {visit.lng?.toFixed(5)}
      </div>
    </div>
  );
}

function Dashboard({ session }) {
  const [agents, setAgents] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [{ data: profileRows }, { data: visitRows }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("role", "demarcheur"),
        supabase.from("field_visits").select("*").order("visited_at", { ascending: false }),
      ]);
      if (cancelled) return;

      const agentList = (profileRows || []).map((p) => ({
        id: p.id,
        name: p.full_name || "Agent",
        color: colorForAgent(p.id),
      }));
      setAgents(agentList);
      setSelectedAgents(new Set(agentList.map((a) => a.id)));
      setVisits((visitRows || []).map(mapVisitRow));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Abonnement temps réel — nécessite que Realtime soit activé sur
  // field_visits dans Supabase (Database -> Replication).
  useEffect(() => {
    const channel = supabase
      .channel("field_visits_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "field_visits" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setVisits((prev) => [mapVisitRow(payload.new), ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setVisits((prev) =>
              prev.map((v) => (v.id === payload.new.id ? mapVisitRow(payload.new) : v))
            );
          } else if (payload.eventType === "DELETE") {
            setVisits((prev) => prev.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const agentsById = useMemo(() => {
    const map = {};
    agents.forEach((a) => (map[a.id] = a));
    return map;
  }, [agents]);

  const toggleAgent = (id) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusFiltered = useMemo(
    () =>
      visits.filter(
        (v) =>
          (statusFilter === "all" || v.status === statusFilter) &&
          (search === "" ||
            v.shopName.toLowerCase().includes(search.toLowerCase()) ||
            v.phone.includes(search) ||
            v.neighborhood.toLowerCase().includes(search.toLowerCase()))
      ),
    [visits, statusFilter, search]
  );

  const visible = useMemo(
    () => statusFiltered.filter((v) => selectedAgents.has(v.agentId)),
    [statusFiltered, selectedAgents]
  );

  const agentCounts = useMemo(() => {
    const counts = {};
    agents.forEach((a) => (counts[a.id] = 0));
    statusFiltered.forEach((v) => (counts[v.agentId] = (counts[v.agentId] || 0) + 1));
    return counts;
  }, [statusFiltered, agents]);

  const kpi = useMemo(() => {
    const total = visible.length;
    const inscrit = visible.filter((v) => v.status === "inscrit").length;
    const prospect = visible.filter((v) => v.status === "prospect").length;
    const refus = visible.filter((v) => v.status === "refus").length;
    const rate = total ? Math.round((inscrit / total) * 100) : 0;
    return { total, inscrit, prospect, refus, rate };
  }, [visible]);

  const selectedVisit = visible.find((v) => v.id === selectedId) || null;

  return (
    <div className="dash-body">
      <aside className="sidebar">
        <h2>Filtres</h2>
        <p className="sidebar-sub">{visible.length} visite(s) affichée(s)</p>

        <div className="search-box">
          <Search size={14} />
          <input
            placeholder="Commerce, quartier, tél."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-label">Statut</div>
        <div className="status-filter-row">
          <button className="status-chip" data-active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            Tous les statuts
          </button>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button key={key} className="status-chip" data-active={statusFilter === key} onClick={() => setStatusFilter(key)}>
              <span className="status-dot" style={{ background: meta.color }} />
              {meta.label}
            </button>
          ))}
        </div>

        <div className="filter-label">
          <Users size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
          Démarcheurs
        </div>
        {agents.length === 0 && !loading && (
          <p className="empty-hint">Aucun agent trouvé (role = demarcheur).</p>
        )}
        {agents.map((a) => (
          <div key={a.id} className="agent-row" onClick={() => toggleAgent(a.id)}>
            <div className="agent-check" data-checked={selectedAgents.has(a.id)} style={{ "--agent-color": a.color }} />
            <span className="agent-swatch" style={{ background: a.color }} />
            <span className="agent-name">{a.name}</span>
            <span className="agent-count">{agentCounts[a.id] || 0}</span>
          </div>
        ))}
      </aside>

      <div className="dash-main">
        <div className="dash-top">
          <div className="dash-title">Supervision terrain</div>
          <div className="live-badge">
            <span className="live-dot" />
            Temps réel
          </div>
        </div>

        <div className="kpi-strip">
          <div className="kpi-item">
            <span className="kpi-num">{kpi.total}</span>
            <span className="kpi-label">Visites</span>
          </div>
          <div className="kpi-item">
            <span className="kpi-num" style={{ color: STATUS_META.prospect.color }}>{kpi.prospect}</span>
            <span className="kpi-label">Prospects</span>
          </div>
          <div className="kpi-item">
            <span className="kpi-num" style={{ color: STATUS_META.inscrit.color }}>{kpi.inscrit}</span>
            <span className="kpi-label">Inscrits</span>
          </div>
          <div className="kpi-item">
            <span className="kpi-num" style={{ color: STATUS_META.refus.color }}>{kpi.refus}</span>
            <span className="kpi-label">Refus</span>
          </div>
          <div className="kpi-item">
            <span className="kpi-num">{kpi.rate}%</span>
            <span className="kpi-label">Taux de conversion</span>
          </div>
        </div>

        <div className="map-area">
          <div className="map-col">
            <div className="map-wrap">
              {loading ? (
                <div className="map-loading">Chargement des visites…</div>
              ) : (
                <>
                  <CityMap visits={visible} agentsById={agentsById} selectedId={selectedId} onSelect={setSelectedId} />

                  <div className="map-legend map-legend-status">
                    <div className="legend-title">Statut</div>
                    <div className="legend-item">
                      <span className="legend-shape legend-shape-filled" style={{ "--c": STATUS_META.inscrit.color }} />
                      Inscrit
                    </div>
                    <div className="legend-item">
                      <span className="legend-shape legend-shape-ring" style={{ "--c": STATUS_META.prospect.color }} />
                      Prospect
                    </div>
                    <div className="legend-item">
                      <span className="legend-shape legend-shape-diamond" style={{ "--c": STATUS_META.refus.color }} />
                      Refus
                    </div>
                  </div>

                  {agents.filter((a) => selectedAgents.has(a.id)).length > 0 && (
                    <div className="map-legend map-legend-agents">
                      <div className="legend-title">Démarcheurs</div>
                      {agents
                        .filter((a) => selectedAgents.has(a.id))
                        .map((a) => (
                          <div key={a.id} className="legend-item">
                            <span className="legend-dot" style={{ background: a.color }} />
                            {a.name}
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="map-caption">
              Carte simplifiée, cadrée automatiquement sur les fiches existantes — à remplacer par une vraie carte (Mapbox/Google Maps) en production. Survolez ou cliquez un point pour le détail.
            </p>
          </div>

          <div className="right-col">
            <DetailPanel visit={selectedVisit} agent={selectedVisit ? agentsById[selectedVisit.agentId] : null} />
            <div className="visit-list">
              {visible.map((v) => {
                const agent = agentsById[v.agentId];
                const meta = STATUS_META[v.status];
                return (
                  <button key={v.id} className="visit-row" data-selected={v.id === selectedId} onClick={() => setSelectedId(v.id)}>
                    <div className="visit-row-top">
                      <span className="visit-shop">{v.shopName || "Sans nom (refus)"}</span>
                      <span className="agent-dot" style={{ background: agent?.color || "#9AA3A9", width: 7, height: 7, borderRadius: "50%" }} />
                    </div>
                    <span className="visit-meta" style={{ color: meta.color }}>
                      {meta.label} · {v.neighborhood} · {v.time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="dash-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        .dash-shell {
          --ink: #1E2A33;
          --sand: #F7F3EA;
          --line: #E4DCC9;
          --gold: #C97A2B;
          --gold-bg: #F5E7D6;
          font-family: 'IBM Plex Sans', system-ui, sans-serif;
          color: var(--ink);
          background: var(--sand);
          width: 100%;
          min-height: 680px;
          border-radius: 18px;
          border: 1px solid var(--line);
          overflow: hidden;
          display: flex;
        }
        h1, h2, h3 { font-family: 'Space Grotesk', system-ui, sans-serif; margin: 0; }

        .login-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
        .login-card { width: 100%; max-width: 340px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 28px; display: flex; flex-direction: column; }
        .login-card h1 { font-size: 20px; }
        .login-sub { color: #8B9299; font-size: 12.5px; margin: 4px 0 20px; }
        .field-label { font-size: 12.5px; font-weight: 500; color: #5A6670; margin: 10px 0 6px; }
        .text-input { width: 100%; box-sizing: border-box; border: 1px solid var(--line); background: #fff; border-radius: 9px; padding: 10px 12px; font-size: 14px; font-family: inherit; color: var(--ink); outline: none; }
        .text-input:focus { border-color: var(--gold); }
        .btn-primary { margin-top: 18px; width: 100%; background: var(--ink); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
        .btn-primary:disabled { background: #C9CFD3; }
        .form-error { margin-top: 10px; font-size: 12.5px; color: #9B3B2B; }
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dash-body { flex: 1; display: flex; min-width: 0; }

        /* Sidebar */
        .sidebar { width: 220px; flex-shrink: 0; background: #fff; border-right: 1px solid var(--line); padding: 20px 16px; overflow-y: auto; }
        .sidebar h2 { font-size: 16px; margin-bottom: 4px; }
        .sidebar-sub { font-size: 12px; color: #8B9299; margin-bottom: 18px; }
        .empty-hint { font-size: 12px; color: #9AA3A9; }

        .search-box { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); border-radius: 9px; padding: 8px 10px; margin-bottom: 18px; }
        .search-box input { border: none; outline: none; font-family: inherit; font-size: 13px; width: 100%; background: transparent; color: var(--ink); }
        .search-box svg { color: #9AA3A9; flex-shrink: 0; }

        .filter-label { font-size: 11px; font-weight: 600; color: #8B9299; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 8px; }
        .status-filter-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 20px; }
        .status-chip { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: #fff; border-radius: 9px; padding: 7px 10px; font-family: inherit; font-size: 12.5px; cursor: pointer; text-align: left; color: #5A6670; }
        .status-chip[data-active="true"] { border-color: var(--ink); color: var(--ink); background: #F5F3EC; font-weight: 600; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .agent-row { display: flex; align-items: center; gap: 8px; padding: 7px 4px; cursor: pointer; border-radius: 8px; }
        .agent-row:hover { background: #F5F3EC; }
        .agent-check { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid var(--line); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .agent-check[data-checked="true"] { background: var(--agent-color); border-color: var(--agent-color); }
        .agent-swatch { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .agent-name { font-size: 12.5px; flex: 1; }
        .agent-count { font-size: 11.5px; color: #9AA3A9; font-family: 'Space Grotesk', sans-serif; font-weight: 600; }

        /* Main */
        .dash-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .dash-top { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 14px; border-bottom: 1px solid var(--line); background: #fff; }
        .dash-title { font-size: 18px; font-weight: 600; }
        .live-badge { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #2F6B4F; font-weight: 500; }
        .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #2F6B4F; animation: pulse 1.8s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .kpi-strip { display: flex; background: #fff; border-bottom: 1px solid var(--line); }
        .kpi-item { flex: 1; padding: 14px 24px; border-left: 1px solid #F0EEE4; }
        .kpi-item:first-child { border-left: none; }
        .kpi-num { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; display: block; }
        .kpi-label { font-size: 11.5px; color: #8B9299; margin-top: 2px; }

        .map-area { flex: 1; display: flex; min-height: 0; }
        .map-col { flex: 1; padding: 18px; display: flex; flex-direction: column; min-width: 0; }
        .city-map { width: 100%; flex: 1; border-radius: 12px; border: 1px solid var(--line); }
        .map-loading { flex: 1; display: flex; align-items: center; justify-content: center; color: #9AA3A9; font-size: 13px; border: 1px solid var(--line); border-radius: 12px; }
        .map-caption { font-size: 11.5px; color: #9AA3A9; margin-top: 8px; }

        .right-col { width: 300px; flex-shrink: 0; border-left: 1px solid var(--line); background: #fff; display: flex; flex-direction: column; }
        .detail-empty { flex-shrink: 0; padding: 30px 20px; text-align: center; color: #9AA3A9; font-size: 12.5px; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .detail-panel { flex-shrink: 0; padding: 18px 20px; border-bottom: 1px solid var(--line); }
        .detail-status { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
        .detail-panel h3 { font-size: 16px; margin-bottom: 10px; }
        .detail-row { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: #5A6670; margin-bottom: 6px; }
        .detail-agent { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 500; margin-top: 10px; }
        .agent-dot { width: 8px; height: 8px; border-radius: 50%; }
        .detail-coords { font-family: 'Space Grotesk', monospace; font-size: 11.5px; color: #9AA3A9; margin-top: 8px; }

        .visit-list { flex: 1; overflow-y: auto; padding: 8px 10px; }
        .visit-row { width: 100%; text-align: left; background: none; border: none; font-family: inherit; padding: 9px 10px; border-radius: 9px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; }
        .visit-row:hover { background: #F5F3EC; }
        .visit-row[data-selected="true"] { background: var(--gold-bg); }
        .visit-row-top { display: flex; align-items: center; justify-content: space-between; }
        .visit-shop { font-size: 12.5px; font-weight: 600; }
        .visit-meta { font-size: 11px; color: #9AA3A9; }
      `}</style>

      {authLoading ? (
        <div className="map-loading" style={{ flex: 1, border: "none" }}>Chargement…</div>
      ) : !session ? (
        <LoginScreen />
      ) : (
        <Dashboard session={session} />
      )}
    </div>
  );
}