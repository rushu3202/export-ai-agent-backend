// my-app/src/App.jsx
import { useState } from "react";
import "./App.css";

function App() {
  const [seller, setSeller] = useState("ACME Exporters");
  const [buyer, setBuyer] = useState("Global Import Ltd");
  const [itemsJSON, setItemsJSON] = useState(
    '[{"description":"Laptop Model X","qty":3,"unitPrice":850},{"description":"Wireless Mouse","qty":5,"unitPrice":25}]'
  );
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setMessage("");
    try {
      // when frontend and backend are served from same origin, this relative path works
      const response = await fetch("/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerName: seller,
          buyerName: buyer,
          items: JSON.parse(itemsJSON),
          currency,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || "Failed to generate invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Invoice generated and downloaded.");
    } catch (err) {
      console.error("Generate error:", err);
      setMessage("Error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", fontFamily: "Inter, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/public/logo.png" alt="Logo" style={{ width: 56, height: 56, objectFit: "contain" }} onError={(e)=>e.target.style.display='none'} />
          <h1 style={{ margin: 0 }}>Export AI Agent</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Status</div>
          <div style={{ fontWeight: 600 }}>{message || "Ready"}</div>
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
        {/* Left: Input / Chat-ish */}
        <section style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
          <h2 style={{ marginTop: 0 }}>Invoice / Export Data</h2>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Seller</label>
            <input value={seller} onChange={e => setSeller(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Buyer</label>
            <input value={buyer} onChange={e => setBuyer(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }}>
              <option>USD</option>
              <option>GBP</option>
              <option>EUR</option>
              <option>INR</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Items (JSON)</label>
            <textarea value={itemsJSON} onChange={e => setItemsJSON(e.target.value)} rows={8} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd", fontFamily: "monospace" }} />
            <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
              Example: <code>{`[{"description":"Widget A","qty":2,"unitPrice":10}]`}</code>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleGenerate} disabled={loading} style={{ padding: "10px 18px", borderRadius: 8, background: "#0b5cff", color: "#fff", border: "none", cursor: "pointer" }}>
              {loading ? "Generating..." : "Generate Invoice PDF"}
            </button>
            <button onClick={() => { setItemsJSON('[{"description":"Widget A","qty":2,"unitPrice":10}]'); setMessage(""); }} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>
              Reset Example
            </button>
          </div>
        </section>

        {/* Right: Summary / Quick actions */}
        <aside style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
          <h3 style={{ marginTop: 0 }}>Export Summary</h3>

          <div style={{ fontSize: 13, color: "#333" }}>
            <div><strong>Seller:</strong> {seller}</div>
            <div style={{ marginTop: 8 }}><strong>Buyer:</strong> {buyer}</div>

            <div style={{ marginTop: 12 }}>
              <strong>Items:</strong>
              <ul>
                {(() => {
                  try {
                    const arr = JSON.parse(itemsJSON || "[]");
                    return arr.map((it, i) => <li key={i}>{it.description} — {it.qty} × {currency} {Number(it.unitPrice).toFixed(2)}</li>);
                  } catch {
                    return <li style={{ color: "#d00" }}>Invalid JSON</li>;
                  }
                })()}
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ seller, buyer, items: JSON.parse(itemsJSON) })); setMessage("Copied export JSON to clipboard"); }} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>
              Copy Export JSON
            </button>
          </div>
        </aside>
      </main>

      <footer style={{ marginTop: 24, textAlign: "center", color: "#666" }}>
        Export AI Agent • Built for exporters • (Logo placeholder)
      </footer>
    </div>
  );
}

export default App;
