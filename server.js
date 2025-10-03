// server.js
import express from "express";
import bodyParser from "body-parser";
import PDFDocument from "pdfkit";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(express.static("public"));

// ✅ Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Currency symbol setting (change as needed: "$", "£", "€", "₹")
const currencySymbol = "£";

// ✅ Helper: Generate HS code for a product
async function getHSCode(description) {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in international trade. Provide only the HS code for the given product.",
        },
        { role: "user", content: `Product: ${description}` },
      ],
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("HS Code error:", error);
    return "N/A";
  }
}

// ✅ Endpoint: Generate Invoice PDF
app.post("/generate-invoice", async (req, res) => {
  const { seller, buyer, items } = req.body;

  if (!seller || !buyer || !items || !Array.isArray(items)) {
    return res.status(400).send("Invalid request body.");
  }

  try {
    // Create a new PDF
    const doc = new PDFDocument();
    const filePath = `invoice_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add Logo (optional)
    try {
      doc.image("logo.png", 50, 45, { width: 80 });
    } catch (e) {
      console.warn("⚠️ Logo not found, skipping...");
    }

    // Title
    doc.fontSize(20).text("Commercial Invoice", { align: "center" });
    doc.moveDown();

    // Seller & Buyer info
    doc.fontSize(12).text(`Seller: ${seller}`);
    doc.text(`Buyer: ${buyer}`);
    doc.moveDown();

    // Table Header
    doc.fontSize(12).text("Items:", { underline: true });
    doc.moveDown();

    let grandTotal = 0;

    for (const item of items) {
      const { description, qty, unitPrice } = item;
      const total = qty * unitPrice;
      grandTotal += total;

      // Fetch HS Code
      const hsCode = await getHSCode(description);

      doc.text(
        `${description} — Qty: ${qty} — Unit: ${currencySymbol}${unitPrice.toFixed(
          2
        )} — Total: ${currencySymbol}${total.toFixed(2)} — HS Code: ${hsCode}`
      );
    }

    doc.moveDown();
    doc.fontSize(14).text(`Grand Total: ${currencySymbol}${grandTotal.toFixed(2)}`, {
      bold: true,
    });

    doc.end();

    stream.on("finish", () => {
      res.download(filePath, () => {
        fs.unlinkSync(filePath); // delete after sending
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating invoice.");
  }
});

// ✅ Serve the HTML form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});
