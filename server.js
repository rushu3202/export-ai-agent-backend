const express = require("express");
const PDFDocument = require("pdfkit");
const path = require("path");
const OpenAI = require("openai");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate PDF invoice with HS codes
app.post("/generate-invoice", async (req, res) => {
  const { sellerName, buyerName, items } = req.body;
  const itemsArr = typeof items === "string" ? JSON.parse(items) : items || [];

  // Get HS codes from OpenAI for each item
  for (let i = 0; i < itemsArr.length; i++) {
    const item = itemsArr[i];
    try {
      const prompt = `Suggest the correct HS (Harmonized System) code for this product: "${item.description}". Only give me the 6-digit code.`;
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      });
      item.hsCode = response.choices[0].message.content.trim();
    } catch (err) {
      item.hsCode = "N/A";
    }
  }

  // Create PDF
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");
  doc.pipe(res);

  doc.fontSize(20).text("Commercial Invoice", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Seller: ${sellerName}`);
  doc.text(`Buyer: ${buyerName}`);
  doc.moveDown();

  doc.text("Items:", { underline: true });

  let total = 0;
  itemsArr.forEach((it, i) => {
    const qty = Number(it.qty || 0);
    const unit = Number(it.unitPrice || 0);
    const lineTotal = qty * unit;
    total += lineTotal;
    doc.text(
      `${i + 1}. ${it.description} — Qty: ${qty} — Unit: ${unit.toFixed(
        2
      )} — Total: ${lineTotal.toFixed(2)} — HS Code: ${it.hsCode}`
    );
  });

  doc.moveDown();
  doc.fontSize(14).text(`Grand Total: ${total.toFixed(2)}`, { align: "right" });
  doc.end();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log("Server running on port", PORT));
