import React, { useState } from "react";
import { supabase } from "../lib/supabase";

// Brand tokens — keep consistent with the rest of AziLearn
const NAVY = "#0A1628";
const ORANGE = "#F97316";

interface AdminSchoolCreateProps {
  onBack?: () => void;
}

/**
 * Route this at something like /admin/schools — never link it from public nav.
 * The passphrase is verified fresh on the server with every "Create school"
 * call (admin_create_school re-checks it internally), so there is nothing
 * sensitive kept in browser storage between visits.
 */
export default function AdminSchoolCreate({ onBack }: AdminSchoolCreateProps) {
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: NAVY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {unlocked ? (
          <CreateSchoolForm
            passphrase={passphrase}
            onLock={() => {
              setPassphrase("");
              setUnlocked(false);
            }}
          />
        ) : (
          <PassphraseGate
            passphrase={passphrase}
            setPassphrase={setPassphrase}
            onUnlocked={() => setUnlocked(true)}
          />
        )}

        {onBack && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button
              onClick={onBack}
              style={{
                background: "none",
                border: "none",
                color: "#8C9BB5",
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Back to App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface PassphraseGateProps {
  passphrase: string;
  setPassphrase: (val: string) => void;
  onUnlocked: () => void;
}

function PassphraseGate({ passphrase, setPassphrase, onUnlocked }: PassphraseGateProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc("verify_admin_passphrase", {
      p_passphrase: passphrase,
    });

    setLoading(false);

    if (rpcError || data !== true) {
      setError("Incorrect passphrase.");
      return;
    }
    onUnlocked();
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle as React.CSSProperties}>
      <h1 style={titleStyle as React.CSSProperties}>Admin access</h1>
      <p style={subtitleStyle as React.CSSProperties}>This page creates new school accounts on AziLearn.</p>

      <label style={labelStyle as React.CSSProperties}>Passphrase</label>
      <input
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        required
        style={inputStyle as React.CSSProperties}
        autoComplete="off"
      />

      {error && <p style={errorStyle as React.CSSProperties}>{error}</p>}

      <button type="submit" disabled={loading} style={buttonStyle as React.CSSProperties}>
        {loading ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}

interface CreateSchoolFormProps {
  passphrase: string;
  onLock: () => void;
}

function CreateSchoolForm({ passphrase, onLock }: CreateSchoolFormProps) {
  const [form, setForm] = useState({
    name: "",
    pin: "",
    contactName: "",
    contactPhone: "",
    county: "",
  });
  const [result, setResult] = useState<any>(null); // { success, message, id, name }
  const [loading, setLoading] = useState(false);

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    const { data, error } = await supabase.rpc("admin_create_school", {
      p_admin_passphrase: passphrase,
      p_name: form.name.trim(),
      p_pin: form.pin.trim(),
      p_contact_name: form.contactName.trim() || null,
      p_contact_phone: form.contactPhone.trim() || null,
      p_county: form.county.trim() || null,
    });

    setLoading(false);

    if (error) {
      setResult({ success: false, message: "Something went wrong. Try again." });
      return;
    }

    const response = data as any;
    setResult(response);

    if (response && !response.success && response.message === "Not authorized.") {
      // Passphrase was rejected server-side (e.g. it changed, or got locked
      // out) — drop back to the gate rather than letting the form sit open.
      onLock();
      return;
    }

    if (response && response.success) {
      setForm({ name: "", pin: "", contactName: "", contactPhone: "", county: "" });
    }
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle as React.CSSProperties}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={titleStyle as React.CSSProperties}>New school account</h1>
        <button type="button" onClick={onLock} style={linkButtonStyle as React.CSSProperties}>
          Lock
        </button>
      </div>
      <p style={subtitleStyle as React.CSSProperties}>
        Give the school name and a 4-digit PIN. Share the PIN with the school admin so they can
        sign in and create assignments.
      </p>

      <label style={labelStyle as React.CSSProperties}>School name</label>
      <input
        value={form.name}
        onChange={update("name")}
        required
        placeholder="e.g. Greenfield Academy"
        style={inputStyle as React.CSSProperties}
      />

      <label style={labelStyle as React.CSSProperties}>4-digit PIN</label>
      <input
        value={form.pin}
        onChange={update("pin")}
        required
        inputMode="numeric"
        pattern="\\d{4}"
        maxLength={4}
        placeholder="0000"
        style={inputStyle as React.CSSProperties}
      />

      <label style={labelStyle as React.CSSProperties}>Contact name (optional)</label>
      <input value={form.contactName} onChange={update("contactName")} style={inputStyle as React.CSSProperties} />

      <label style={labelStyle as React.CSSProperties}>Contact phone (optional)</label>
      <input value={form.contactPhone} onChange={update("contactPhone")} style={inputStyle as React.CSSProperties} />

      <label style={labelStyle as React.CSSProperties}>County (optional)</label>
      <input value={form.county} onChange={update("county")} style={inputStyle as React.CSSProperties} />

      {result && (
        <p style={(result.success ? successStyle : errorStyle) as React.CSSProperties}>
          {result.success
            ? `"${result.name}" created. Share the PIN with their admin to sign in.`
            : result.message}
        </p>
      )}

      <button type="submit" disabled={loading} style={buttonStyle as React.CSSProperties}>
        {loading ? "Creating…" : "Create school"}
      </button>
    </form>
  );
}

const cardStyle = {
  background: "#101F38",
  border: "1px solid #1C2D4A",
  borderRadius: 16,
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const titleStyle = { color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 };
const subtitleStyle = { color: "#8C9BB5", fontSize: 14, marginTop: 6, marginBottom: 18 };
const labelStyle = { color: "#C5CEDD", fontSize: 13, marginTop: 14, marginBottom: 6 };
const inputStyle = {
  background: "#0A1628",
  border: "1px solid #2A3B5C",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 15,
  outline: "none",
  width: "100%",
  boxSizing: "border-box"
};
const buttonStyle = {
  marginTop: 22,
  background: ORANGE,
  color: "#0A1628",
  fontWeight: 700,
  fontSize: 15,
  border: "none",
  borderRadius: 8,
  padding: "12px 16px",
  cursor: "pointer",
  width: "100%"
};
const linkButtonStyle = {
  background: "none",
  border: "none",
  color: "#8C9BB5",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
};
const errorStyle = { color: "#FCA5A5", fontSize: 13, marginTop: 14 };
const successStyle = { color: "#86EFAC", fontSize: 13, marginTop: 14 };
