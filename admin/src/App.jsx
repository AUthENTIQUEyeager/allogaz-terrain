import { useState, useMemo } from "react";
import {
  Search,
  Users,
  Phone,
  Clock,
  MapPinned,
  Store,
  CircleDot,
} from "lucide-react";

const AGENTS = [
  { id: "a1", name: "Awa Ouédraogo", color: "#2F8F9D" },
  { id: "a2", name: "Boureima Kaboré", color: "#7A4B8C" },
  { id: "a3", name: "Fatou Zongo", color: "#B8862F" },
  { id: "a4", name: "Issa Compaoré", color: "#C1543C" },
  { id: "a5", name: "Mariam Sawadogo", color: "#6C5CA6" },
  { id: "a6", name: "Ousmane Traoré", color: "#A6436B" },
];

const STATUS_META = {
  prospect: { label: "Prospect", color: "#4A6FA5" },
  inscrit: { label: "Inscrit", color: "#2F6B4F" },
  refus: { label: "Refus", color: "#9B3B2B" },
};

const VISITS = [
  { id: "v1", agentId: "a1", shopName: "Dépôt Gaz Somgandé", phone: "70 12 34 56", city: "Ouagadougou", neighborhood: "Somgandé", status: "inscrit", lat: 12.403, lng: -1.489, time: "Aujourd'hui 14:20" },
  { id: "v2", agentId: "a1", shopName: "Boutique Nassa", phone: "70 44 21 08", city: "Ouagadougou", neighborhood: "Somgandé", status: "prospect", lat: 12.407, lng: -1.485, time: "Aujourd'hui 13:05" },
  { id: "v3", agentId: "a1", shopName: "Superette Bendogo", phone: "70 87 65 23", city: "Ouagadougou", neighborhood: "Bendogo", status: "prospect", lat: 12.411, lng: -1.503, time: "Aujourd'hui 11:40" },
  { id: "v4", agentId: "a1", shopName: "", phone: "", city: "Ouagadougou", neighborhood: "Bendogo", status: "refus", lat: 12.414, lng: -1.508, time: "Hier 16:12" },

  { id: "v5", agentId: "a2", shopName: "Alimentation Sawadogo", phone: "76 22 11 09", city: "Ouagadougou", neighborhood: "Tanghin", status: "prospect", lat: 12.386, lng: -1.512, time: "Aujourd'hui 10:55" },
  { id: "v6", agentId: "a2", shopName: "Dépôt Gaz Tanghin", phone: "76 09 88 41", city: "Ouagadougou", neighborhood: "Tanghin", status: "inscrit", lat: 12.389, lng: -1.517, time: "Aujourd'hui 09:30" },
  { id: "v7", agentId: "a2", shopName: "Boutique Zogona", phone: "76 55 12 90", city: "Ouagadougou", neighborhood: "Zogona", status: "refus", lat: 12.373, lng: -1.535, time: "Hier 15:48" },
  { id: "v8", agentId: "a2", shopName: "Point Gaz Zogona 2", phone: "76 91 03 77", city: "Ouagadougou", neighborhood: "Zogona", status: "prospect", lat: 12.369, lng: -1.529, time: "Hier 14:02" },

  { id: "v9", agentId: "a3", shopName: "Alimentation Dassasgho", phone: "78 33 20 61", city: "Ouagadougou", neighborhood: "Dassasgho", status: "inscrit", lat: 12.384, lng: -1.477, time: "Aujourd'hui 15:10" },
  { id: "v10", agentId: "a3", shopName: "Boutique Kilwin", phone: "78 61 44 15", city: "Ouagadougou", neighborhood: "Kilwin", status: "inscrit", lat: 12.398, lng: -1.462, time: "Aujourd'hui 12:22" },
  { id: "v11", agentId: "a3", shopName: "Dépôt Kilwin 2", phone: "78 05 92 38", city: "Ouagadougou", neighborhood: "Kilwin", status: "prospect", lat: 12.395, lng: -1.458, time: "Hier 17:00" },

  { id: "v12", agentId: "a4", shopName: "Superette Gounghin", phone: "71 40 18 65", city: "Ouagadougou", neighborhood: "Gounghin", status: "prospect", lat: 12.354, lng: -1.527, time: "Aujourd'hui 13:48" },
  { id: "v13", agentId: "a4", shopName: "", phone: "", city: "Ouagadougou", neighborhood: "Gounghin", status: "refus", lat: 12.350, lng: -1.522, time: "Aujourd'hui 11:15" },
  { id: "v14", agentId: "a4", shopName: "Boutique Patte d'Oie", phone: "71 76 55 90", city: "Ouagadougou", neighborhood: "Patte d'Oie", status: "inscrit", lat: 12.337, lng: -1.513, time: "Hier 10:30" },
  { id: "v15", agentId: "a4", shopName: "Dépôt Patte d'Oie 2", phone: "71 22 84 03", city: "Ouagadougou", neighborhood: "Patte d'Oie", status: "prospect", lat: 12.333, lng: -1.509, time: "Hier 09:05" },

  { id: "v16", agentId: "a5", shopName: "Alimentation Cissin", phone: "75 18 62 44", city: "Ouagadougou", neighborhood: "Cissin", status: "inscrit", lat: 12.336, lng: -1.548, time: "Aujourd'hui 14:55" },
  { id: "v17", agentId: "a5", shopName: "Boutique Cissin Marché", phone: "75 90 33 12", city: "Ouagadougou", neighborhood: "Cissin", status: "prospect", lat: 12.331, lng: -1.552, time: "Aujourd'hui 12:40" },
  { id: "v18", agentId: "a5", shopName: "", phone: "", city: "Ouagadougou", neighborhood: "Cissin", status: "refus", lat: 12.339, lng: -1.545, time: "Hier 16:50" },

  { id: "v19", agentId: "a6", shopName: "Dépôt Gaz Wemtenga", phone: "79 27 61 88", city: "Ouagadougou", neighborhood: "Wemtenga", status: "inscrit", lat: 12.361, lng: -1.498, time: "Aujourd'hui 15:35" },
  { id: "v20", agentId: "a6", shopName: "Boutique Wemtenga 2", phone: "79 84 10 56", city: "Ouagadougou", neighborhood: "Wemtenga", status: "prospect", lat: 12.358, lng: -1.494, time: "Aujourd'hui 10:12" },
  { id: "v21", agentId: "a6", shopName: "Superette Wemtenga", phone: "79 05 47 29", city: "Ouagadougou", neighborhood: "Wemtenga", status: "prospect", lat: 12.364, lng: -1.501, time: "Hier 13:20" },
  { id: "v22", agentId: "a6", shopName: "", phone: "", city: "Ouagadougou", neighborhood: "Wemtenga", status: "refus", lat: 12.357, lng: -1.503, time: "Hier 08:45" },
];

const LAT_RANGE = [12.325, 12.418];
const LNG_RANGE = [-1.558, -1.455];
const MAP_W = 900;
const MAP_H = 540;
const PAD = 46;

function project(lat, lng) {
  const x =
    ((lng - LNG_RANGE[0]) / (LNG_RANGE[1] - LNG_RANGE[0])) * (MAP_W - PAD * 2) +
    PAD;
  const y =
    (1 - (lat - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) *
      (MAP_H - PAD * 2) +
    PAD;
  return { x, y };
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

function agentById(id) {
  return AGENTS.find((a) => a.id === id);
}

function Marker({ visit, selected, onSelect }) {
  const { x, y } = project(visit.lat, visit.lng);
  const agent = agentById(visit.agentId);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelect(visit.id)}
      style={{ cursor: "pointer" }}
    >
      {selected && (
        <circle r="14" fill="none" stroke={agent.color} strokeWidth="1.5" opacity="0.45" />
      )}
      {visit.status === "inscrit" && (
        <circle r="7" fill={agent.color} stroke="#fff" strokeWidth="2" />
      )}
      {visit.status === "prospect" && (
        <circle r="7" fill="#fff" stroke={agent.color} strokeWidth="2.5" />
      )}
      {visit.status === "refus" && (
        <rect
          x="-5"
          y="-5"
          width="10"
          height="10"
          fill={agent.color}
          opacity="0.5"
          transform="rotate(45)"
        />
      )}
    </g>
  );
}

function CityMap({ visits, selectedId, onSelect }) {
  const ordered = useMemo(
    () => [...visits].sort((a, b) => (a.id === selectedId ? 1 : b.id === selectedId ? -1 : 0)),
    [visits, selectedId]
  );

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="city-map">
      <rect width={MAP_W} height={MAP_H} fill="#F5F1E7" />

      {Array.from({ length: 13 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={PAD + i * 66}
          y1={0}
          x2={PAD + i * 66}
          y2={MAP_H}
          stroke="#E4DCC9"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={PAD + i * 58}
          x2={MAP_W}
          y2={PAD + i * 58}
          stroke="#E4DCC9"
          strokeWidth="1"
        />
      ))}
      <line x1="0" y1="70" x2={MAP_W} y2="330" stroke="#DCD2B8" strokeWidth="3" />
      <line x1="120" y1="0" x2="640" y2={MAP_H} stroke="#DCD2B8" strokeWidth="3" />

      {NEIGHBORHOOD_LABELS.map((n) => {
        const { x, y } = project(n.lat, n.lng);
        return (
          <text
            key={n.name}
            x={x}
            y={y}
            fontSize="11.5"
            fill="#A79E86"
            fontFamily="'Space Grotesk', sans-serif"
            fontWeight="600"
            textAnchor="middle"
          >
            {n.name.toUpperCase()}
          </text>
        );
      })}

      {ordered.map((v) => (
        <Marker
          key={v.id}
          visit={v}
          selected={v.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </svg>
  );
}

function DetailPanel({ visit }) {
  if (!visit) {
    return (
      <div className="detail-empty">
        <MapPinned size={22} />
        <p>Sélectionnez un point sur la carte pour voir le détail.</p>
      </div>
    );
  }
  const agent = agentById(visit.agentId);
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
        <span className="agent-dot" style={{ background: agent.color }} />
        {agent.name}
      </div>
      <div className="detail-coords">
        {visit.lat.toFixed(5)}, {visit.lng.toFixed(5)}
      </div>
    </div>
  );
}

export default function App() {
  const [selectedAgents, setSelectedAgents] = useState(
    new Set(AGENTS.map((a) => a.id))
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const toggleAgent = (id) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusFiltered = useMemo(
    () =>
      VISITS.filter(
        (v) =>
          (statusFilter === "all" || v.status === statusFilter) &&
          (search === "" ||
            v.shopName.toLowerCase().includes(search.toLowerCase()) ||
            v.phone.includes(search) ||
            v.neighborhood.toLowerCase().includes(search.toLowerCase()))
      ),
    [statusFilter, search]
  );

  const visible = useMemo(
    () => statusFiltered.filter((v) => selectedAgents.has(v.agentId)),
    [statusFiltered, selectedAgents]
  );

  const agentCounts = useMemo(() => {
    const counts = {};
    AGENTS.forEach((a) => (counts[a.id] = 0));
    statusFiltered.forEach((v) => (counts[v.agentId] = (counts[v.agentId] || 0) + 1));
    return counts;
  }, [statusFiltered]);

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

        /* Sidebar */
        .sidebar { width: 220px; flex-shrink: 0; background: #fff; border-right: 1px solid var(--line); padding: 20px 16px; overflow-y: auto; }
        .sidebar h2 { font-size: 16px; margin-bottom: 4px; }
        .sidebar-sub { font-size: 12px; color: #8B9299; margin-bottom: 18px; }

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
          <button
            className="status-chip"
            data-active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            Tous les statuts
          </button>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              className="status-chip"
              data-active={statusFilter === key}
              onClick={() => setStatusFilter(key)}
            >
              <span className="status-dot" style={{ background: meta.color }} />
              {meta.label}
            </button>
          ))}
        </div>

        <div className="filter-label">
          <Users size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
          Démarcheurs
        </div>
        {AGENTS.map((a) => (
          <div
            key={a.id}
            className="agent-row"
            onClick={() => toggleAgent(a.id)}
          >
            <div
              className="agent-check"
              data-checked={selectedAgents.has(a.id)}
              style={{ "--agent-color": a.color }}
            />
            <span className="agent-swatch" style={{ background: a.color }} />
            <span className="agent-name">{a.name}</span>
            <span className="agent-count">{agentCounts[a.id]}</span>
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
            <CityMap visits={visible} selectedId={selectedId} onSelect={setSelectedId} />
            <p className="map-caption">
              Carte simplifiée à l'échelle de Ouagadougou — à remplacer par une vraie carte (Mapbox/Google Maps) avec les coordonnées réelles des fiches en production.
            </p>
          </div>

          <div className="right-col">
            <DetailPanel visit={selectedVisit} />
            <div className="visit-list">
              {visible.map((v) => {
                const agent = agentById(v.agentId);
                const meta = STATUS_META[v.status];
                return (
                  <button
                    key={v.id}
                    className="visit-row"
                    data-selected={v.id === selectedId}
                    onClick={() => setSelectedId(v.id)}
                  >
                    <div className="visit-row-top">
                      <span className="visit-shop">
                        {v.shopName || "Sans nom (refus)"}
                      </span>
                      <span className="agent-dot" style={{ background: agent.color, width: 7, height: 7, borderRadius: "50%" }} />
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
