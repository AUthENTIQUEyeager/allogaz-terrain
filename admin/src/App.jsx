import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker as LeafletMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
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
  SlidersHorizontal,
  X,
  UserPlus,
  Map as MapIcon,
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

// Centre par défaut (Ouagadougou) tant qu'aucune fiche n'est encore arrivée
const DEFAULT_CENTER = [12.3714, -1.5197];
const DEFAULT_ZOOM = 12;

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

// Icône colorée par agent, formée selon le statut (rond plein = inscrit,
// rond creux = prospect, losange = refus) — construite en HTML pur pour
// ne pas dépendre des images d'icône par défaut de Leaflet.
function buildIcon(color, status, emphasized) {
  const size = emphasized ? 22 : 16;
  let html;
  if (status === "inscrit") {
    html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>`;
  } else if (status === "prospect") {
    html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>`;
  } else {
    const d = size * 0.75;
    html = `<div style="width:${d}px;height:${d}px;background:${color};opacity:0.6;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`;
  }
  return L.divIcon({
    html,
    className: "visit-marker-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Recadre automatiquement la carte sur les fiches visibles à chaque
// changement de filtre, avec un zoom minimum pour ne pas sur-zoomer sur
// une ou deux fiches très proches.
function FitToVisits({ visits }) {
  const map = useMap();
  useEffect(() => {
    if (visits.length === 0) return;
    const bounds = L.latLngBounds(visits.map((v) => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [visits, map]);
  return null;
}

function VisitMarker({ visit, agent, selected, hovered, onSelect, onHover }) {
  const color = agent?.color || "#9AA3A9";
  const emphasized = selected || hovered;
  const label = visit.shopName || "Sans nom (refus)";
  const meta = STATUS_META[visit.status];

  const icon = useMemo(
    () => buildIcon(color, visit.status, emphasized),
    [color, visit.status, emphasized]
  );

  return (
    <LeafletMarker
      position={[visit.lat, visit.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(visit.id),
        mouseover: () => onHover(visit.id),
        mouseout: () => onHover(null),
      }}
    >
      <Tooltip permanent direction="right" offset={[10, 0]} className="marker-label" opacity={1}>
        {label}
      </Tooltip>
      <Tooltip direction="top" offset={[0, -8]} className="marker-hover-tip">
        {label} — {agent?.name || "Agent inconnu"} — {meta.label}
      </Tooltip>
    </LeafletMarker>
  );
}

function CityMap({ visits, agentsById, selectedId, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="city-map"
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <FitToVisits visits={visits} />
      {visits.map((v) => (
        <VisitMarker
          key={v.id}
          visit={v}
          agent={agentsById[v.agentId]}
          selected={v.id === selectedId}
          hovered={v.id === hoveredId}
          onSelect={onSelect}
          onHover={setHoveredId}
        />
      ))}
    </MapContainer>
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

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function AgentsManager({ agents, onAgentCreated }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) return;
    setError("");
    setSuccessInfo(null);
    setSubmitting(true);

    const { data, error: invokeError } = await supabase.functions.invoke(
      "create-agent",
      { body: { email: email.trim(), password, full_name: fullName.trim() } }
    );

    setSubmitting(false);

    if (invokeError) {
      setError(
        "Échec de la création. Vérifie que la fonction 'create-agent' est bien déployée sur Supabase."
      );
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    setSuccessInfo({ email: email.trim(), password });
    setFullName("");
    setEmail("");
    setPassword(generatePassword());
    onAgentCreated();
  };

  return (
    <div className="agents-manager">
      <div className="agents-form-card">
        <h3>
          <UserPlus size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Nouveau démarcheur
        </h3>
        <form onSubmit={handleCreate}>
          <label className="field-label">Nom complet</label>
          <input
            className="text-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <label className="field-label">Email</label>
          <input
            className="text-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="field-label">Mot de passe temporaire</label>
          <div className="password-row">
            <input
              className="text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="btn-secondary small"
              onClick={() => setPassword(generatePassword())}
            >
              Générer
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} className="spin" /> Création…
              </>
            ) : (
              "Créer le compte"
            )}
          </button>
        </form>

        {successInfo && (
          <div className="success-box">
            Compte créé — communique ces identifiants à l'agent :
            <div className="cred-line">
              <strong>Email :</strong> {successInfo.email}
            </div>
            <div className="cred-line">
              <strong>Mot de passe :</strong> {successInfo.password}
            </div>
          </div>
        )}
      </div>

      <div className="agents-list-card">
        <h3>Démarcheurs ({agents.length})</h3>
        {agents.length === 0 ? (
          <p className="empty-hint">Aucun démarcheur pour l'instant.</p>
        ) : (
          <div className="agents-table">
            {agents.map((a) => (
              <div key={a.id} className="agents-table-row">
                <span className="agent-swatch" style={{ background: a.color }} />
                <div className="agents-table-info">
                  <div className="agents-table-name">{a.name}</div>
                  <div className="agents-table-email">{a.email || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [view, setView] = useState("map");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadAgents() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "demarcheur");
    const agentList = (data || []).map((p) => ({
      id: p.id,
      name: p.full_name || p.email || "Agent",
      email: p.email,
      color: colorForAgent(p.id),
    }));
    setAgents(agentList);
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      agentList.forEach((a) => next.add(a.id));
      return next;
    });
  }

  async function loadVisits() {
    const { data } = await supabase
      .from("field_visits")
      .select("*")
      .order("visited_at", { ascending: false });
    setVisits((data || []).map(mapVisitRow));
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      await Promise.all([loadAgents(), loadVisits()]);
      if (!cancelled) setLoading(false);
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
      <aside className={`sidebar${mobileFiltersOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-mobile-header">
          <h2>Filtres</h2>
          <button className="icon-btn" onClick={() => setMobileFiltersOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <h2 className="sidebar-title-desktop">Filtres</h2>
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

      {mobileFiltersOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileFiltersOpen(false)} />
      )}

      <div className="dash-main">
        <div className="dash-top">
          <div className="dash-top-left">
            <div className="dash-title">Supervision terrain</div>
            <div className="view-tabs">
              <button className="view-tab" data-active={view === "map"} onClick={() => setView("map")}>
                <MapIcon size={13} /> Carte
              </button>
              <button className="view-tab" data-active={view === "agents"} onClick={() => setView("agents")}>
                <Users size={13} /> Démarcheurs
              </button>
            </div>
          </div>
          <div className="dash-top-right">
            {view === "map" && (
              <button className="mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)}>
                <SlidersHorizontal size={14} /> Filtres
              </button>
            )}
            <div className="live-badge">
              <span className="live-dot" />
              Temps réel
            </div>
          </div>
        </div>

        {view === "agents" ? (
          <div className="agents-view">
            <AgentsManager agents={agents} onAgentCreated={loadAgents} />
          </div>
        ) : (
          <>
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
              Survolez ou cliquez un point pour voir le détail. La carte se recadre automatiquement sur les fiches visibles.
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
        </>
        )}
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
        .sidebar-mobile-header { display: none; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .sidebar-sub { font-size: 12px; color: #8B9299; margin-bottom: 18px; }
        .empty-hint { font-size: 12px; color: #9AA3A9; }
        .icon-btn { background: #F0F2F1; border: none; border-radius: 8px; padding: 6px; cursor: pointer; color: var(--ink); display: flex; }
        .sidebar-backdrop { display: none; }

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
        .dash-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px; border-bottom: 1px solid var(--line); background: #fff; flex-wrap: wrap; }
        .dash-top-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .dash-top-right { display: flex; align-items: center; gap: 12px; }
        .dash-title { font-size: 18px; font-weight: 600; }
        .view-tabs { display: flex; gap: 4px; background: #F5F3EC; border-radius: 9px; padding: 3px; }
        .view-tab { display: flex; align-items: center; gap: 6px; border: none; background: none; font-family: inherit; font-size: 12.5px; font-weight: 500; color: #6B7A85; padding: 6px 11px; border-radius: 7px; cursor: pointer; }
        .view-tab[data-active="true"] { background: #fff; color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(30,42,51,0.08); }
        .mobile-filter-btn { display: none; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--line); border-radius: 9px; padding: 7px 12px; font-size: 12.5px; font-family: inherit; cursor: pointer; color: var(--ink); }
        .live-badge { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #2F6B4F; font-weight: 500; white-space: nowrap; }
        .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #2F6B4F; animation: pulse 1.8s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .kpi-strip { display: flex; background: #fff; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
        .kpi-item { flex: 1; padding: 14px 24px; border-left: 1px solid #F0EEE4; min-width: 110px; }
        .kpi-item:first-child { border-left: none; }
        .kpi-num { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; display: block; }
        .kpi-label { font-size: 11.5px; color: #8B9299; margin-top: 2px; }

        .map-area { flex: 1; display: flex; min-height: 0; }
        .map-col { flex: 1; padding: 18px; display: flex; flex-direction: column; min-width: 0; }
        .map-wrap { position: relative; flex: 1; display: flex; min-height: 420px; }
        .city-map { width: 100%; height: 100%; border-radius: 12px; border: 1px solid var(--line); z-index: 0; }
        .map-loading { flex: 1; display: flex; align-items: center; justify-content: center; color: #9AA3A9; font-size: 13px; border: 1px solid var(--line); border-radius: 12px; }
        .map-caption { font-size: 11.5px; color: #9AA3A9; margin-top: 8px; }

        /* Légendes flottantes sur la carte */
        .map-legend { position: absolute; z-index: 500; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 9px 11px; box-shadow: 0 2px 8px rgba(30,42,51,0.1); font-size: 11.5px; }
        .map-legend-status { top: 12px; left: 12px; }
        .map-legend-agents { top: 12px; right: 12px; max-height: 180px; overflow-y: auto; max-width: 170px; }
        .legend-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #9AA3A9; margin-bottom: 6px; }
        .legend-item { display: flex; align-items: center; gap: 7px; color: #5A6670; padding: 2px 0; white-space: nowrap; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .legend-shape { flex-shrink: 0; }
        .legend-shape-filled { width: 9px; height: 9px; border-radius: 50%; background: var(--c); border: 1.5px solid #fff; outline: 1px solid var(--c); }
        .legend-shape-ring { width: 9px; height: 9px; border-radius: 50%; background: #fff; border: 2px solid var(--c); }
        .legend-shape-diamond { width: 8px; height: 8px; background: var(--c); opacity: 0.6; transform: rotate(45deg); }

        /* Étiquette permanente à côté de chaque marqueur */
        .leaflet-tooltip.marker-label { background: rgba(255,255,255,0.92); border: none; box-shadow: none; padding: 1px 5px; font-family: 'IBM Plex Sans', sans-serif; font-size: 11px; font-weight: 600; color: #3B4650; border-radius: 4px; }
        .leaflet-tooltip.marker-label::before { display: none; }
        .leaflet-tooltip.marker-hover-tip { font-family: 'IBM Plex Sans', sans-serif; font-size: 11.5px; }

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

        /* Vue "Démarcheurs" */
        .agents-view { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .agents-manager { display: grid; grid-template-columns: 340px 1fr; gap: 18px; align-items: start; }
        .agents-form-card, .agents-list-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
        .agents-form-card h3, .agents-list-card h3 { font-size: 15px; margin-bottom: 14px; display: flex; align-items: center; }
        .password-row { display: flex; gap: 8px; }
        .password-row .text-input { flex: 1; }
        .btn-secondary.small { width: auto; padding: 10px 14px; white-space: nowrap; }
        .success-box { margin-top: 14px; background: #E7F1EC; color: #2F6B4F; border-radius: 10px; padding: 12px 14px; font-size: 12.5px; line-height: 1.6; }
        .cred-line { margin-top: 2px; }
        .agents-table { display: flex; flex-direction: column; gap: 4px; }
        .agents-table-row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 9px; }
        .agents-table-row:hover { background: #F5F3EC; }
        .agents-table-info { min-width: 0; }
        .agents-table-name { font-size: 13px; font-weight: 600; }
        .agents-table-email { font-size: 11.5px; color: #8B9299; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ===== Responsive ===== */
        @media (max-width: 900px) {
          .dash-shell { min-height: auto; border-radius: 0; }
          .sidebar-title-desktop { display: none; }
          .mobile-filter-btn { display: flex; }

          .sidebar { display: none; }
          .sidebar.mobile-open {
            display: flex;
            flex-direction: column;
            position: fixed;
            inset: 0;
            z-index: 2001;
            width: 85%;
            max-width: 320px;
            height: 100%;
            box-shadow: 2px 0 16px rgba(30,42,51,0.2);
          }
          .sidebar-mobile-header { display: flex; }
          .sidebar-backdrop { display: block; position: fixed; inset: 0; background: rgba(30,42,51,0.4); z-index: 2000; }

          .dash-top { padding: 12px 14px; }
          .dash-title { font-size: 16px; }
          .view-tabs { order: 3; width: 100%; }

          .kpi-strip { }
          .kpi-item { flex: 1 1 33%; padding: 10px 12px; border-bottom: 1px solid #F0EEE4; }

          .map-area { flex-direction: column; }
          .map-col { padding: 12px; }
          .map-wrap { min-height: 320px; }
          .map-legend-agents { max-width: 130px; }

          .right-col { width: 100%; border-left: none; border-top: 1px solid var(--line); max-height: 320px; }

          .agents-view { padding: 14px; }
          .agents-manager { grid-template-columns: 1fr; }
        }
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
