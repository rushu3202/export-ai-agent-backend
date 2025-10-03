import { useState } from "react";

export default function InvoiceGenerator() {
  const [mode, setMode] = useState("text"); // "text" or "json"
  const [textInvoice, setTextInvoice] = useState("");
  const [seller, setSeller] = useState("");
  const [buyer, setBuyer] = useState("");
  const [itemsJson, setItemsJson] = useState(
    '[{"description":"Widget A","qty":2,"unitPrice":10}]'
  );

  const generateInvoice = async () => {
    let body;

    if (mode === "text") {
      body = { textInvoice };
    } else {
      body = {
        seller,
        buyer,
        items: JSON.parse(itemsJson),
      };
    }
    const response = await fetch("/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoice.pdf";
    a.click();
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow-lg rounded-xl">
      <h1 className="text-2xl font-bold mb-4">AI Invoice Generator</h1>

      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            mode === "text" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setMode("text")}
        >
          Option 1: Plain Text
        </button>
        <button
          className={`px-4 py-2 rounded ${
            mode === "json" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setMode("json")}
        >
          Option 2: JSON
        </button>
      </div>

      {mode === "text" ? (
        <textarea
          className="w-full h-48 border p-2 rounded mb-4"
          value={textInvoice}
          onChange={(e) => setTextInvoice(e.target.value)}
          placeholder={`Commercial Invoice\nSeller: ACME Exporters\nBuyer: Global Import Ltd\nItems:\n1. Widget A — Qty: 2 — Unit: 10.00 — Total: 20.00\n2. Widget B — Qty: 1 — Unit: 25.00 — Total: 25.00\nGrand Total: 45.0`}
        />
      ) : (
        <div>
          <input
            className="w-full border p-2 rounded mb-2"
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            placeholder="Seller name"
          />
          <input
            className="w-full border p-2 rounded mb-2"
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            placeholder="Buyer name"
          />
          <textarea
            className="w-full h-32 border p-2 rounded"
            value={itemsJson}
            onChange={(e) => setItemsJson(e.target.value)}
            placeholder='[{"description":"Widget A","qty":2,"unitPrice":10}]'
          />
        </div>
      )}

      <button
        onClick={generateInvoice}
        className="mt-4 w-full bg-green-600 text-white font-bold py-2 rounded"
      >
        Generate Invoice PDF
      </button>
    </div>
  );
}
