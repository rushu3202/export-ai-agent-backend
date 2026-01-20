<<<<<<< HEAD
import jsPDF from "jspdf";
import { useMemo, useState } from "react";
import "./App.css";

function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

function Card({ title, subtitle, children, right }) {
  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">{title}</div>
          {subtitle ? <div className="card__subtitle">{subtitle}</div> : null}
        </div>
        {right ? <div className="card__right">{right}</div> : null}
      </div>
      <div className="card__body">{children}</div>
=======
import { useState } from "react";

function App() {
  const [product, setProduct] = useState("");
  const [country, setCountry] = useState("");
  const [experience, setExperience] = useState("beginner");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submitExportCheck = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        "https://giuliana-cellarless-leonel.ngrok-free.dev/api/export-check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, country, experience }),
        }
      );

      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Backend not reachable");
    }

    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", padding: "40px" }}>
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "8px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginBottom: "5px" }}>Export AI Agent</h1>
        <p style={{ color: "#666", marginBottom: "30px" }}>
          Intelligent export readiness & compliance guidance
        </p>

        <div style={{ display: "grid", gap: "15px" }}>
          <input
            placeholder="Product you want to export"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Destination country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={inputStyle}
          />

          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            style={inputStyle}
          >
            <option value="beginner">Beginner exporter</option>
            <option value="intermediate">Intermediate exporter</option>
            <option value="expert">Experienced exporter</option>
          </select>

          <button
            onClick={submitExportCheck}
            disabled={loading}
            style={{
              padding: "12px",
              background: "#0b5ed7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {loading ? "Analysing..." : "Analyse Export Readiness"}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: "40px" }}>
            <Section title="Required Documents" items={result.documents} />
            <Section title="Warnings" items={result.warnings} />
            <Section title="Recommended Next Steps" items={result.nextSteps} />
          </div>
        )}
      </div>
>>>>>>> 4ffd3ba (Fix Dashboard null crashes (liveResult/reportResult) and stabilize rules pack)
    </div>
  );
}

<<<<<<< HEAD
function List({ items, empty = "None" }) {
  if (!items || items.length === 0) return <div className="muted">{empty}</div>;
  return (
    <ul className="list">
      {items.map((x, i) => (
        <li key={i} className="list__item">
          <span className="dot" />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [product, setProduct] = useState("T-shirts");
  const [country, setCountry] = useState("UK");
  const [experience, setExperience] = useState("beginner");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [lockedHs, setLockedHs] = useState(null);
  const [selectedHs, setSelectedHs] = useState(null);

  const [savedReportId, setSavedReportId] = useState(null);
  const [saving, setSaving] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const canSubmit = product.trim().length > 0 && country.trim().length > 0;

  const journeySteps = useMemo(
    () => [
      { key: "INPUT", label: "Input details" },
      { key: "READINESS", label: "Readiness check" },
      { key: "DOCS", label: "Documents" },
      { key: "NEXT", label: "Next actions" },
    ],
    []
  );

  const currentStepIndex = useMemo(() => {
    if (!result) return 0;
    if (result?.documents?.length) return 2;
    return 1;
  }, [result]);

  const checkExport = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setResult(null);
    setLockedHs(null);
    setSelectedHs(null);
    setSavedReportId(null);

    try {
      const res = await fetch(`${API_BASE}/api/export-check`,  {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, country, experience }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Backend error");

      setResult(data);

      // Auto-select first HS suggestion (better UX)
      if (data?.hs_code_suggestions?.length) {
        setSelectedHs(data.hs_code_suggestions[0]);
      }
    } catch (err) {
      setError(err?.message || "Unable to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!result || !lockedHs) {
      alert("Please run a check and lock an HS code first.");
      return;
    }

    const doc = new jsPDF();
    let y = 15;

    doc.setFontSize(16);
    doc.text("Export Readiness Report", 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text("Generated by Export AI Agent", 14, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Product: ${product}`, 14, y);
    y += 6;
    doc.text(`Destination: ${country}`, 14, y);
    y += 6;
    doc.text(`Experience: ${experience}`, 14, y);
    y += 6;
    doc.text(`Risk Level: ${result.risk_level}`, 14, y);
    y += 6;
    doc.text(`Incoterm: ${result.recommended_incoterm}`, 14, y);
    y += 8;

    doc.setFontSize(13);
    doc.text("HS Code", 14, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(`${lockedHs.code} - ${lockedHs.description}`, 14, y);
    y += 8;

    doc.setFontSize(13);
    doc.text("Required Documents", 14, y);
    y += 6;
    doc.setFontSize(11);
    (result.documents || []).forEach((d) => {
      doc.text(`• ${d}`, 16, y);
      y += 5;
    });

    y += 4;
    doc.setFontSize(13);
    doc.text("Warnings", 14, y);
    y += 6;
    doc.setFontSize(11);
    ((result.warnings && result.warnings.length) ? result.warnings : ["None"]).forEach((w) => {
      doc.text(`• ${w}`, 16, y);
      y += 5;
    });

    y += 4;
    doc.setFontSize(13);
    doc.text("Next Steps", 14, y);
    y += 6;
    doc.setFontSize(11);
    (result.nextSteps || []).forEach((n) => {
      doc.text(`• ${n}`, 16, y);
      y += 5;
    });

    y += 8;
    doc.setFontSize(9);
    doc.text(
      "Disclaimer: This report provides guidance only. Final compliance decisions must be confirmed with customs authorities or licensed professionals.",
      14,
      y,
      { maxWidth: 180 }
    );

    doc.save("export-readiness-report.pdf");
  };

  const saveReport = async () => {
    if (!result || !lockedHs) {
      alert("Please run a check and lock an HS code first.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          country,
          experience,
          result,
          lockedHs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save report");

      setSavedReportId(data.reportId);
      alert(`Report saved ✅ ID: ${data.reportId}`);
    } catch (e) {
      alert(e?.message || "Could not save report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      {/* Top Bar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand__logo">EA</div>
          <div className="brand__text">
            <div className="brand__name">Export AI Agent</div>
            <div className="brand__tag">Export readiness & compliance guidance</div>
          </div>
        </div>

        <div className="topbar__actions">
          <Badge tone="neutral">UK-first</Badge>
          <Badge tone="success">Backend Connected</Badge>
        </div>
      </header>

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar__title">Export Journey</div>

          <div className="steps">
            {journeySteps.map((s, idx) => {
              const state =
                idx < currentStepIndex ? "done" : idx === currentStepIndex ? "active" : "todo";
              return (
                <div key={s.key} className={`step step--${state}`}>
                  <div className="step__icon">{state === "done" ? "✓" : idx + 1}</div>
                  <div className="step__label">{s.label}</div>
                </div>
              );
            })}
          </div>

          <div className="sidebar__help">
            <div className="sidebar__helpTitle">Tip</div>
            <div className="sidebar__helpText">
              Start simple: product + destination + experience. We’ll generate a clear checklist and
              next actions.
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <Card
            title="Start an export readiness check"
            subtitle="Enter the basics — the engine will return required documents, warnings, and next steps."
            right={loading ? <Badge tone="neutral">Analysing…</Badge> : <Badge tone="neutral">v1</Badge>}
          >
            <div className="grid">
              <div className="field">
                <label className="label">Product</label>
                <input
                  className="input"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g., T-shirts, spices, machine parts"
                />
              </div>

              <div className="field">
                <label className="label">Destination Country</label>
                <input
                  className="input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., Germany, UAE, India"
                />
              </div>

              <div className="field">
                <label className="label">Experience</label>
                <select
                  className="input"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="actions">
                <button className="btn" onClick={checkExport} disabled={!canSubmit || loading}>
                  {loading ? "Checking…" : "Check Export Readiness"}
                </button>

                {!canSubmit ? <div className="muted">Please enter product and destination.</div> : null}
              </div>
            </div>

            {result ? (
              <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                <Badge
                  tone={
                    result.risk_level === "HIGH"
                      ? "warning"
                      : result.risk_level === "MEDIUM"
                      ? "neutral"
                      : "success"
                  }
                >
                  Risk: {result.risk_level}
                </Badge>

                <Badge tone="neutral">Incoterm: {result.recommended_incoterm}</Badge>
                <Badge tone="neutral">Stage: {result.journey_stage}</Badge>
              </div>
            ) : null}

            {error ? <div className="alert alert--error">{error}</div> : null}
          </Card>

          <Card
            title="HS Code Suggestions"
            subtitle="Initial classification guidance (confirm before shipping)"
            right={
              result?.hs_code_suggestions?.length ? (
                <Badge tone="success">{result.hs_code_suggestions.length} suggestion(s)</Badge>
              ) : (
                <Badge tone="neutral">None</Badge>
              )
            }
          >
            {result?.hs_code_suggestions?.length ? (
              <div className="hsList">
                {result.hs_code_suggestions.map((s, i) => {
                  const isSelected = selectedHs?.code === s.code;
                  const isLocked = lockedHs?.code === s.code;

                  return (
                    <div
                      key={i}
                      className={`hsRow ${isSelected ? "hsRow--selected" : ""} ${
                        isLocked ? "hsRow--locked" : ""
                      }`}
                      onClick={() => setSelectedHs(s)}
                      style={{ cursor: "pointer" }}
                      title="Click to select"
                    >
                      <div className="hsCode">{s.code}</div>

                      <div className="hsText">
                        <div className="hsDesc">{s.description}</div>
                        <div className="muted">Confidence: {s.confidence}</div>
                        {isLocked ? <div className="hsLockedText">✅ Locked as final HS code</div> : null}
                      </div>
                    </div>
                  );
                })}

                <div className="muted" style={{ marginTop: "10px" }}>
                  {result.hs_note}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                  <button
                    className="btn secondary"
                    disabled={!selectedHs || !!lockedHs}
                    onClick={() => setLockedHs(selectedHs)}
                  >
                    Confirm HS Code
                  </button>

                  <button className="btn" disabled={!lockedHs} onClick={downloadPDF}>
                    Download Export Report (PDF)
                  </button>

                  <button
                    className="btn secondary"
                    disabled={!lockedHs || saving}
                    onClick={saveReport}
                  >
                    {saving ? "Saving..." : "Save Report"}
                  </button>

                  <button className="btn secondary" disabled={!lockedHs} onClick={() => setLockedHs(null)}>
                    Unlock
                  </button>

                  <div className="muted">
                    {lockedHs
                      ? `Final HS code locked: ${lockedHs.code}`
                      : selectedHs
                      ? `Selected: ${selectedHs.code} (click Confirm to lock)`
                      : "Tip: click a suggestion to select it"}
                  </div>
                </div>

                {savedReportId ? (
                  <div className="muted" style={{ marginTop: "8px" }}>
                    Saved Report ID: <b>{savedReportId}</b>
                  </div>
                ) : null}

                {result?.hs_clarification_questions?.length ? (
                  <div style={{ marginTop: "14px" }}>
                    <h4 style={{ marginBottom: "8px" }}>Help us refine the HS code</h4>

                    {result.hs_clarification_questions.map((q, qi) => (
                      <div key={qi} style={{ marginBottom: "12px" }}>
                        <div className="muted" style={{ marginBottom: "4px" }}>
                          {q.question}
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {q.options.map((opt) => (
                            <button
                              key={opt}
                              className="btn secondary"
                              onClick={() => alert("HS refinement logic will be added next")}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="muted">{result?.hs_note || "Run a check to get HS code guidance."}</div>
            )}
          </Card>

          {/* Results */}
          <div className="results">
            <Card
              title="Required Documents"
              subtitle="What you’ll typically need to prepare"
              right={result ? <Badge tone="success">Ready</Badge> : <Badge tone="neutral">Waiting</Badge>}
            >
              <List items={result?.documents} empty="Run a check to generate your checklist." />
            </Card>

            <Card
              title="Warnings"
              subtitle="Things that commonly cause delays or mistakes"
              right={
                result?.warnings?.length ? (
                  <Badge tone="warning">{result.warnings.length} alerts</Badge>
                ) : (
                  <Badge tone="neutral">None</Badge>
                )
              }
            >
              <List items={result?.warnings} empty="No warnings yet." />
            </Card>

            <Card
              title="Next Steps"
              subtitle="Your recommended actions from here"
              right={result ? <Badge tone="neutral">Action plan</Badge> : null}
            >
              <List items={result?.nextSteps} empty="Run a check to see next steps." />
            </Card>
          </div>

          <div className="footerNote">
            This is your v1. Next we’ll add country rules, HS code intelligence, and PDF export packs.
          </div>
        </main>
      </div>
    </div>
  );
}
=======
const inputStyle = {
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "14px",
};

const Section = ({ title, items }) => (
  <div style={{ marginBottom: "25px" }}>
    <h3>{title}</h3>
    <ul>
      {items?.length ? (
        items.map((item, i) => <li key={i}>{item}</li>)
      ) : (
        <li>None</li>
      )}
    </ul>
  </div>
);

export default App;
>>>>>>> 4ffd3ba (Fix Dashboard null crashes (liveResult/reportResult) and stabilize rules pack)
