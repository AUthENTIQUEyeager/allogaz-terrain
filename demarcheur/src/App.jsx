import { useState } from "react";
import {
  MapPin,
  ClipboardList,
  User,
  Store,
  Phone,
  Navigation,
  Check,
  ChevronRight,
  LogOut,
  Loader2,
  X,
} from "lucide-react";

const STATUS_META = {
  prospect: { label: "Prospect", color: "#4A6FA5", bg: "#EAF0F7" },
  inscrit: { label: "Inscrit", color: "#2F6B4F", bg: "#E7F1EC" },
  refus: { label: "Refus", color: "#9B3B2B", bg: "#F5E9E6" },
};

const REFUS_REASONS = [
  "Pas intéressé",
  "Déjà avec un concurrent",
  "Boutique fermée",
  "Autre",
];

const SEED_FICHES = [
  {
    id: "f1",
    shopName: "Dépôt Gaz Somgandé",
    phone: "70 12 34 56",
    city: "Ouagadougou",
    neighborhood: "Somgandé",
    status: "inscrit",
    notes: "Vend Total et Oryx, bon volume de stock.",
    lat: 12.402,
    lng: -1.489,
    accuracy: 8,
    time: "Hier, 16:42",
  },
  {
    id: "f2",
    shopName: "Alimentation Sawadogo",
    phone: "76 22 11 09",
    city: "Ouagadougou",
    neighborhood: "Tanghin",
    status: "prospect",
    notes: "Intéressé mais veut réfléchir jusqu'à la semaine prochaine.",
    lat: 12.386,
    lng: -1.512,
    accuracy: 12,
    time: "Hier, 11:05",
  },
  {
    id: "f3",
    shopName: "",
    phone: "",
    city: "Ouagadougou",
    neighborhood: "Wemtenga",
    status: "refus",
    notes: "Pas intéressé",
    lat: 12.361,
    lng: -1.498,
    accuracy: 15,
    time: "Lundi, 09:18",
  },
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="badge"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="screen login-screen">
      <div className="login-mark">
        <MapPin size={26} strokeWidth={2.2} />
      </div>
      <h1 className="login-title">Terrain</h1>
      <p className="login-sub">Fiches de prospection AlloGaz</p>

      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          onLogin(email);
        }}
      >
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="text-input"
          type="email"
          placeholder="agent@allogaz.com"
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
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn-primary" type="submit">
          Se connecter
        </button>
      </form>
    </div>
  );
}

function GpsCapture({ position, onCapture, capturing, error }) {
  return (
    <div className="gps-block">
      <div className="gps-row">
        <div className="gps-icon-wrap" data-active={!!position}>
          <Navigation size={18} strokeWidth={2.2} />
        </div>
        <div className="gps-text">
          <div className="gps-title">Position de la visite</div>
          {position ? (
            <div className="gps-value">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              <span className="gps-accuracy">
                {" "}
                · précision ~{Math.round(position.accuracy)} m
              </span>
            </div>
          ) : (
            <div className="gps-value muted">Pas encore capturée</div>
          )}
        </div>
      </div>

      <button
        type="button"
        className={position ? "btn-secondary" : "btn-gps"}
        onClick={onCapture}
        disabled={capturing}
      >
        {capturing ? (
          <>
            <Loader2 size={16} className="spin" /> Localisation…
          </>
        ) : position ? (
          <>
            <Check size={16} /> Position reprise
          </>
        ) : (
          <>
            <Navigation size={16} /> Capturer la position maintenant
          </>
        )}
      </button>

      {error && <div className="gps-error">{error}</div>}
    </div>
  );
}

function NewFicheScreen({ onSave }) {
  const [status, setStatus] = useState("prospect");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Ouagadougou");
  const [neighborhood, setNeighborhood] = useState("");
  const [notes, setNotes] = useState("");
  const [refusReason, setRefusReason] = useState(REFUS_REASONS[0]);

  const [position, setPosition] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const captureGps = () => {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setCapturing(false);
      },
      () => {
        setGpsError(
          "Position refusée ou indisponible. Autorisez la localisation pour continuer."
        );
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const isRefus = status === "refus";
  const canSave =
    position &&
    city.trim() &&
    (isRefus || shopName.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: `f${Date.now()}`,
      shopName: isRefus ? shopName.trim() : shopName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      status,
      notes: isRefus ? refusReason : notes.trim(),
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy,
      time: "À l'instant",
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    setShopName("");
    setPhone("");
    setNeighborhood("");
    setNotes("");
    setStatus("prospect");
    setPosition(null);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Nouvelle fiche</h2>
        <p className="screen-sub">
          Remplissez pendant que vous êtes devant le commerce.
        </p>
      </div>

      <GpsCapture
        position={position}
        onCapture={captureGps}
        capturing={capturing}
        error={gpsError}
      />

      <div className="status-grid">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            className="status-card"
            data-selected={status === key}
            style={{ "--status-color": meta.color, "--status-bg": meta.bg }}
            onClick={() => setStatus(key)}
          >
            {meta.label}
          </button>
        ))}
      </div>

      <div className="form-block">
        <label className="field-label" htmlFor="shopName">
          <Store size={14} /> Nom du commerce {!isRefus && "*"}
        </label>
        <input
          id="shopName"
          className="text-input"
          placeholder="Ex : Dépôt Gaz Somgandé"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
        />

        <label className="field-label" htmlFor="phone">
          <Phone size={14} /> Téléphone du vendeur
        </label>
        <input
          id="phone"
          className="text-input"
          placeholder="70 00 00 00"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="field-row">
          <div className="field-col">
            <label className="field-label" htmlFor="city">
              Ville *
            </label>
            <input
              id="city"
              className="text-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="field-col">
            <label className="field-label" htmlFor="neighborhood">
              Quartier
            </label>
            <input
              id="neighborhood"
              className="text-input"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </div>
        </div>

        {isRefus ? (
          <>
            <label className="field-label" htmlFor="reason">
              Raison du refus
            </label>
            <select
              id="reason"
              className="text-input"
              value={refusReason}
              onChange={(e) => setRefusReason(e.target.value)}
            >
              {REFUS_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            {status === "inscrit" && (
              <div className="reminder-banner">
                Inscrivez maintenant le vendeur dans l'app AlloGaz principale
                avec ce même numéro de téléphone.
              </div>
            )}
            <label className="field-label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="text-input textarea"
              placeholder="Marques vendues, stock estimé, remarques…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </>
        )}
      </div>

      <button
        className="btn-primary save-btn"
        disabled={!canSave}
        onClick={handleSave}
      >
        {savedFlash ? (
          <>
            <Check size={16} /> Fiche enregistrée
          </>
        ) : (
          "Enregistrer la fiche"
        )}
      </button>
      {!position && (
        <p className="hint-below">
          Capturez la position avant de pouvoir enregistrer.
        </p>
      )}
    </div>
  );
}

function FicheDetail({ fiche, onClose }) {
  const meta = STATUS_META[fiche.status];
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <h3>{fiche.shopName || "Sans nom (refus)"}</h3>
            <StatusBadge status={fiche.status} />
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sheet-row">
          <span className="sheet-label">Téléphone</span>
          <span>{fiche.phone || "—"}</span>
        </div>
        <div className="sheet-row">
          <span className="sheet-label">Lieu</span>
          <span>
            {fiche.neighborhood ? `${fiche.neighborhood}, ` : ""}
            {fiche.city}
          </span>
        </div>
        <div className="sheet-row">
          <span className="sheet-label">Position</span>
          <span>
            {fiche.lat.toFixed(5)}, {fiche.lng.toFixed(5)}
          </span>
        </div>
        <div className="sheet-row">
          <span className="sheet-label">Visite</span>
          <span>{fiche.time}</span>
        </div>
        {fiche.notes && (
          <div className="sheet-notes">
            <span className="sheet-label">Notes</span>
            <p>{fiche.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MesFichesScreen({ fiches }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Mes fiches</h2>
        <p className="screen-sub">{fiches.length} visite(s) enregistrée(s)</p>
      </div>

      {fiches.length === 0 ? (
        <div className="empty-state">
          Aucune fiche pour l'instant. Créez-en une depuis l'onglet
          "Nouvelle".
        </div>
      ) : (
        <div className="fiche-list">
          {fiches.map((f) => (
            <button
              key={f.id}
              className="fiche-card"
              onClick={() => setSelected(f)}
            >
              <div className="fiche-card-top">
                <span className="fiche-name">
                  {f.shopName || "Sans nom (refus)"}
                </span>
                <StatusBadge status={f.status} />
              </div>
              <div className="fiche-card-bottom">
                <span>
                  {f.neighborhood ? `${f.neighborhood}, ` : ""}
                  {f.city}
                </span>
                <span className="dot">·</span>
                <span>{f.time}</span>
                <ChevronRight size={15} className="chevron" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <FicheDetail fiche={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ProfilScreen({ agentEmail, fiches, onLogout }) {
  const counts = fiches.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    { prospect: 0, inscrit: 0, refus: 0 }
  );

  const displayName = agentEmail.split("@")[0].replace(/[._]/g, " ");

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Profil</h2>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="profile-name">{displayName}</div>
          <div className="profile-email">{agentEmail}</div>
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-item">
          <span className="stat-num">{fiches.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item">
          <span className="stat-num" style={{ color: STATUS_META.prospect.color }}>
            {counts.prospect}
          </span>
          <span className="stat-label">Prospects</span>
        </div>
        <div className="stat-item">
          <span className="stat-num" style={{ color: STATUS_META.inscrit.color }}>
            {counts.inscrit}
          </span>
          <span className="stat-label">Inscrits</span>
        </div>
        <div className="stat-item">
          <span className="stat-num" style={{ color: STATUS_META.refus.color }}>
            {counts.refus}
          </span>
          <span className="stat-label">Refus</span>
        </div>
      </div>

      <button className="btn-secondary logout-btn" onClick={onLogout}>
        <LogOut size={16} /> Se déconnecter
      </button>
    </div>
  );
}

export default function App() {
  const [agentEmail, setAgentEmail] = useState(null);
  const [tab, setTab] = useState("new");
  const [fiches, setFiches] = useState(SEED_FICHES);

  const addFiche = (fiche) => {
    setFiches((prev) => [fiche, ...prev]);
    setTab("list");
  };

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        .app-shell {
          --ink: #1E2A33;
          --sand: #FAF6EE;
          --line: #E4DCC9;
          --gold: #C97A2B;
          --gold-bg: #F5E7D6;
          font-family: 'IBM Plex Sans', system-ui, sans-serif;
          color: var(--ink);
          background: var(--sand);
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          min-height: 640px;
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 0 var(--line);
          border: 1px solid var(--line);
        }
        h1, h2, h3 { font-family: 'Space Grotesk', system-ui, sans-serif; margin: 0; }
        .screen { flex: 1; overflow-y: auto; padding: 20px 18px 90px; }
        .screen-header { margin-bottom: 16px; }
        .screen-header h2 { font-size: 20px; font-weight: 600; }
        .screen-sub { margin: 4px 0 0; font-size: 13px; color: #6B7A85; }

        /* Login */
        .login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 28px; flex: 1; }
        .login-mark { width: 48px; height: 48px; border-radius: 12px; background: var(--gold-bg); color: var(--gold); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .login-title { font-size: 26px; font-weight: 700; }
        .login-sub { color: #6B7A85; font-size: 13px; margin: 6px 0 28px; }
        .login-form { width: 100%; display: flex; flex-direction: column; gap: 4px; }

        .field-label { font-size: 12.5px; font-weight: 500; color: #5A6670; display: flex; align-items: center; gap: 5px; margin: 12px 0 6px; }
        .text-input { width: 100%; box-sizing: border-box; border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 11px 13px; font-size: 14.5px; font-family: inherit; color: var(--ink); outline: none; }
        .text-input:focus { border-color: var(--gold); }
        .textarea { resize: vertical; }
        .field-row { display: flex; gap: 10px; }
        .field-col { flex: 1; }

        .btn-primary { margin-top: 20px; width: 100%; background: var(--ink); color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 600; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
        .btn-primary:disabled { background: #C9CFD3; cursor: not-allowed; }
        .btn-secondary { width: 100%; background: #fff; color: var(--ink); border: 1px solid var(--line); border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 500; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }

        /* GPS */
        .gps-block { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-bottom: 16px; }
        .gps-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .gps-icon-wrap { width: 36px; height: 36px; border-radius: 10px; background: #F0F2F1; color: #8B9299; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .gps-icon-wrap[data-active="true"] { background: var(--gold-bg); color: var(--gold); }
        .gps-title { font-size: 12.5px; color: #6B7A85; }
        .gps-value { font-size: 14.5px; font-weight: 600; font-family: 'Space Grotesk', monospace; }
        .gps-value.muted { font-weight: 400; color: #9AA3A9; font-family: inherit; }
        .gps-accuracy { font-weight: 400; color: #9AA3A9; font-size: 12.5px; }
        .btn-gps { width: 100%; background: var(--gold); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
        .btn-gps:disabled { opacity: 0.7; }
        .gps-error { margin-top: 10px; font-size: 12.5px; color: #9B3B2B; }
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Status selector */
        .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 6px; }
        .status-card { padding: 12px 4px; border-radius: 12px; border: 1.5px solid var(--line); background: #fff; font-family: inherit; font-size: 13px; font-weight: 600; color: #8B9299; cursor: pointer; }
        .status-card[data-selected="true"] { border-color: var(--status-color); background: var(--status-bg); color: var(--status-color); }

        .form-block { margin-top: 8px; }
        .reminder-banner { margin-top: 14px; background: #E7F1EC; color: #2F6B4F; border-radius: 10px; padding: 11px 13px; font-size: 13px; line-height: 1.45; }

        .save-btn { margin-top: 22px; }
        .hint-below { text-align: center; font-size: 12px; color: #9AA3A9; margin-top: 8px; }

        /* List */
        .fiche-list { display: flex; flex-direction: column; gap: 10px; }
        .fiche-card { text-align: left; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 13px 14px; font-family: inherit; cursor: pointer; }
        .fiche-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .fiche-name { font-weight: 600; font-size: 14.5px; }
        .fiche-card-bottom { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #6B7A85; }
        .chevron { margin-left: auto; color: #C9CFD3; }
        .badge { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 100px; white-space: nowrap; }
        .empty-state { text-align: center; color: #9AA3A9; font-size: 13.5px; padding: 40px 20px; }

        /* Sheet */
        .sheet-overlay { position: absolute; inset: 0; background: rgba(30,42,51,0.4); display: flex; align-items: flex-end; }
        .sheet { background: #fff; width: 100%; border-radius: 20px 20px 0 0; padding: 10px 20px 26px; }
        .sheet-handle { width: 36px; height: 4px; background: var(--line); border-radius: 4px; margin: 6px auto 14px; }
        .sheet-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
        .sheet-header h3 { font-size: 17px; margin-bottom: 6px; }
        .icon-btn { background: #F0F2F1; border: none; border-radius: 8px; padding: 6px; cursor: pointer; color: var(--ink); }
        .sheet-row { display: flex; justify-content: space-between; padding: 9px 0; border-top: 1px solid #F0EEE4; font-size: 13.5px; }
        .sheet-label { color: #8B9299; }
        .sheet-notes { padding-top: 9px; border-top: 1px solid #F0EEE4; font-size: 13.5px; }
        .sheet-notes p { margin: 6px 0 0; line-height: 1.5; }

        /* Profile */
        .profile-card { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-bottom: 16px; }
        .profile-avatar { width: 44px; height: 44px; border-radius: 12px; background: var(--gold); color: #fff; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; display: flex; align-items: center; justify-content: center; }
        .profile-name { font-weight: 600; text-transform: capitalize; font-size: 15px; }
        .profile-email { font-size: 12.5px; color: #8B9299; }
        .stat-strip { display: flex; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px 0; margin-bottom: 20px; }
        .stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; border-left: 1px solid #F0EEE4; }
        .stat-item:first-child { border-left: none; }
        .stat-num { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; }
        .stat-label { font-size: 11px; color: #8B9299; }
        .logout-btn { color: #9B3B2B; }

        /* Tab bar */
        .tab-bar { position: absolute; bottom: 0; left: 0; right: 0; max-width: 400px; margin: 0 auto; background: #fff; border-top: 1px solid var(--line); display: flex; padding: 8px 6px calc(8px + env(safe-area-inset-bottom)); }
        .tab-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; font-family: inherit; font-size: 11px; color: #9AA3A9; padding: 6px 0; cursor: pointer; border-radius: 10px; }
        .tab-btn[data-active="true"] { color: var(--gold); }
      `}</style>

      {!agentEmail ? (
        <LoginScreen onLogin={setAgentEmail} />
      ) : (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>
          {tab === "new" && <NewFicheScreen onSave={addFiche} />}
          {tab === "list" && <MesFichesScreen fiches={fiches} />}
          {tab === "profil" && (
            <ProfilScreen
              agentEmail={agentEmail}
              fiches={fiches}
              onLogout={() => setAgentEmail(null)}
            />
          )}

          <div className="tab-bar">
            <button
              className="tab-btn"
              data-active={tab === "new"}
              onClick={() => setTab("new")}
            >
              <MapPin size={19} />
              Nouvelle
            </button>
            <button
              className="tab-btn"
              data-active={tab === "list"}
              onClick={() => setTab("list")}
            >
              <ClipboardList size={19} />
              Mes fiches
            </button>
            <button
              className="tab-btn"
              data-active={tab === "profil"}
              onClick={() => setTab("profil")}
            >
              <User size={19} />
              Profil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
