// server.js
import express from "express";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets (logo, etc.)
app.use("/public", express.static(path.join(__dirname, "public")));

// Serve React production build files from /dist
const distFolder = path.join(__dirname, "dist");
if (fs.existsSync(distFolder)) {
  app.use(express.static(distFolder));
}

// OpenAI client (optional)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("OpenAI client configured.");
} else {
  console.log("OpenAI API key not found - HS code lookups will use fallback.");
}

// Utility: currency symbol map
const currencySymbols = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  JPY: "¥",
};

// Generate invoice number
function generateInvoiceNumber() {
  const now = new Date();
  return (
    "INV-" +
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0") +
    "-" +
    Math.floor(1000 + Math.random() * 9000)
  );
}

// Safe HS-code fetch (tries OpenAI if available, else returns fallback)
async function getHSCode(description) {
  if (!openai) return "000000";
  try {
    const prompt = `Provide the best matching 6-digit HS (Harmonized System) code for the product: "${description}". Output only the 6 digits.`;
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
    });
    const text = (resp?.choices?.[0]?.message?.content || "").trim();
    // extract first 6-digit sequence
    const match = text.match(/\d{6}/);
    return match ? match[0] : text.slice(0, 6).padEnd(6, "0");
  } catch (err) {
    console.error("OpenAI HS code error:", err?.message || err);
    return "000000";
  }
}

// POST /generate-invoice
app.post("/generate-invoice", async (req, res) => {
  try {
    const payload = req.body || {};
    let { sellerName, buyerName, items, currency } = payload;

    currency = (currency || "USD").toString().toUpperCase();
    const symbol = currencySymbols[currency] || currency + " ";

    // items must be array
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    items = Array.isArray(items) ? items : [];

    // ensure required fields
    sellerName = sellerName || "Seller";
    buyerName = buyerName || "Buyer";

    // enrich with HS codes (sequential to avoid parallel throttling)
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it) continue;
      if (!it.description) it.description = "Item " + (i + 1);
      // only attempt HS if not provided
      if (!it.hsCode || it.hsCode === "N/A") {
        // optional OpenAI lookup
        it.hsCode = await getHSCode(it.description);
      }
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Set response headers before piping
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${generateInvoiceNumber()}.pdf`
    );

    doc.pipe(res);

    // Header: logo + title + invoice meta
    const logoPath = path.join(__dirname, "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 30, { width: 110 });
      } catch (err) {
        console.warn("Logo render failed:", err?.message || err);
      }
    }
    doc.fontSize(20).text("COMMERCIAL INVOICE", { align: "center" });

    // invoice number & date top-right
    const invoiceNo = generateInvoiceNumber();
    const invoiceDate = new Date().toLocaleDateString("en-GB");
    doc.fontSize(10).text(`Invoice No: ${invoiceNo}`, 420, 50, { align: "left" });
    doc.text(`Date: ${invoiceDate}`, 420, 65, { align: "left" });

    doc.moveDown(3);

    // Seller & Buyer blocks
    doc.fontSize(11).fillColor("black");
    const leftX = 50;
    const midX = 300;
    doc.text("Seller:", leftX, doc.y);
    doc.font("Helvetica-Bold").text(sellerName);
    doc.font("Helvetica").moveDown(0.5);
    doc.text("Buyer:", midX, doc.y - 28);
    doc.font("Helvetica-Bold").text(buyerName);
    doc.moveDown();

    // Table header
    const tableTop = doc.y + 10;
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("No", 50, tableTop);
    doc.text("Description", 90, tableTop);
    doc.text("Qty", 330, tableTop, { width: 40, align: "right" });
    doc.text("Unit", 380, tableTop, { width: 70, align: "right" });
    doc.text("Line Total", 455, tableTop, { width: 80, align: "right" });
    doc.text("HS Code", 540, tableTop, { width: 70, align: "right" });

    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    // Items rows
    doc.font("Helvetica").fontSize(10);
    let position = tableTop + 25;
    let grandTotal = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = Number(it.qty || 0);
      const unit = Number(it.unitPrice || 0);
      const lineTotal = qty * unit;
      grandTotal += lineTotal;

      doc.text(String(i + 1), 50, position);
      doc.text(it.description, 90, position, { width: 230 });
      doc.text(qty.toString(), 330, position, { width: 40, align: "right" });
      doc.text(symbol + unit.toFixed(2), 380, position, { width: 70, align: "right" });
      doc.text(symbol + lineTotal.toFixed(2), 455, position, { width: 80, align: "right" });
      doc.text(String(it.hsCode || "N/A"), 540, position, { width: 70, align: "right" });

      position += 20;
      // new page if nearing bottom
      if (position > 720) {
        doc.addPage();
        position = 50;
      }
    }

    // Totals
    doc.moveTo(350, position + 5).lineTo(560, position + 5).stroke();
    doc.fontSize(12).font("Helvetica-Bold").text(`Grand Total: ${symbol}${grandTotal.toFixed(2)}`, 350, position + 15, { align: "right" });

    // Signature & stamp placeholders
    doc.moveDown(6);
    const sigY = doc.y + 20;
    doc.fontSize(11).font("Helvetica").text("Authorized Signature:", 50, sigY + 20);
    doc.moveTo(180, sigY + 40).lineTo(350, sigY + 40).stroke();

    doc.rect(400, sigY + 10, 120, 80).stroke();
    doc.fontSize(10).text("Company Stamp", 410, sigY + 50);

    // Footer
    doc.moveDown(6);
    doc.fontSize(9).fillColor("gray").text("Generated by Export AI Agent", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Generate invoice error:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

// Route for root - serve React index if exists
app.get("/", (req, res) => {
  const indexPath = path.join(distFolder, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("Export AI Agent backend is running. Build your frontend into /dist and place logo at /public/logo.png");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
