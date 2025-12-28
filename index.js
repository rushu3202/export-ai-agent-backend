import express from "express";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
// ---- In-memory Reports Store (v1) ----
const REPORTS = []; // (later replace with DB)

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.json({ status: "Export Agent Backend is running ✅" });
});

app.post("/api/export/start", (req, res) => {
  const { country, product } = req.body;

  if (!country || !product) {
    return res.status(400).json({
      error: "country and product are required",
    });
  }

  const journey = {
    journeyId: uuidv4(),
    country,
    product,
    currentStep: "EXPORT_BASICS",
    createdAt: new Date(),
    nextAction: "Check export eligibility",
  };

  console.log("🚀 New export journey started:", journey);

  res.json({
    message: "Export journey started successfully",
    journey,
  });
});

// Export readiness check (REAL LOGIC START)
app.post("/api/export-check", (req, res) => {
  const { product, country, experience } = req.body;

  if (!product || !country || !experience) {
    return res.status(400).json({
      error: "Product, country, and experience are required",
    });
  }

  let response = {
    product,
    country,
    allowed: true,
    documents: [],
    warnings: [],
    nextSteps: [],
  };

    // ---- Journey intelligence (v2) ----
  let riskScore = 0;

  if (experience === "beginner") riskScore += 30;

  const restrictedKeywords = ["battery", "chemical", "medicine", "pharma", "liquid"];
  const isPossiblyRestricted = restrictedKeywords.some((k) =>
    product.toLowerCase().includes(k)
  );
  if (isPossiblyRestricted) riskScore += 40;

  const risk_level =
    riskScore >= 70 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";

  const recommended_incoterm =
    experience === "beginner" ? "DAP" : "FOB";

  response.risk_level = risk_level;
  response.recommended_incoterm = recommended_incoterm;

  // guide the journey
  response.journey_stage = "DOCS";
  response.missing_info = [];

  // BASIC EXPORT LOGIC (can expand later)
  response.documents.push(
    "Commercial Invoice",
    "Packing List",
    "Certificate of Origin"
  );

  // EU region aliases
const euAliases = ["eu", "european union"];

  // ---- Country Pack Logic (v3) ----
const dest = country
  .trim()
  .toLowerCase()
  .replace(/\./g, "")
  .replace(/,/g, "")
  .replace(/\s+/g, " ");

const euCountries = [
  "germany","france","italy","spain","netherlands","belgium","ireland","poland",
  "sweden","denmark","finland","austria","portugal","czech republic","greece",
  "hungary","romania","bulgaria","croatia","slovakia","slovenia","lithuania",
  "latvia","estonia","luxembourg","malta","cyprus"
];

const uaeAliases = ["uae","united arab emirates","dubai"];
const indiaAliases = ["india","bharat"];

if (euCountries.includes(dest) || euAliases.includes(dest)) {
  response.documents.push("EU Import VAT / IOSS (if applicable)");
  response.warnings.push("EU shipments may require importer VAT/EORI on arrival");
  response.nextSteps.unshift("Confirm EU importer details (VAT/EORI) with your buyer");
  response.journey_stage = "EU_COMPLIANCE";
}

if (uaeAliases.includes(dest)) {
  response.documents.push("Certificate of Origin (Chamber attestation may be required)");
  response.warnings.push("Some UAE shipments require attested Certificate of Origin");
  response.nextSteps.unshift("Check if your buyer needs CoO attestation (Chamber)");
  response.journey_stage = "MIDDLE_EAST_COMPLIANCE";
}

if (indiaAliases.includes(dest)) {
  response.documents.push("IEC (Importer Exporter Code) — for importer side");
  response.warnings.push("India customs clearance often needs importer IEC & detailed invoice data");
  response.nextSteps.unshift("Ask buyer/importer for IEC and customs broker details");
  response.journey_stage = "INDIA_COMPLIANCE";
}

  if (country.toLowerCase() === "uk") {
    response.documents.push("EORI Number");
  }

  if (experience === "beginner") {
    response.warnings.push(
      "Hire a freight forwarder",
      "Avoid CIF pricing initially"
    );
  }

  response.nextSteps.push(
    "Register with customs",
    "Confirm HS code",
    "Talk to logistics partner"
  );

  // ---- HS Code Assistant (v1: rule-based) ----
const p = product.trim().toLowerCase();

const hsSuggestions = [];

const addHS = (code, description, confidence) => {
  hsSuggestions.push({ code, description, confidence });
};

// clothing examples
if (p.includes("t-shirt") || p.includes("tshirt") || p.includes("tee")) {
  addHS("6109", "T-shirts, singlets and other vests (knitted or crocheted)", "HIGH");
}
if (p.includes("shirt") && !p.includes("t-shirt") && !p.includes("tshirt")) {
  addHS("6205", "Men’s or boys’ shirts (not knitted)", "MEDIUM");
}

// food examples
if (p.includes("rice")) addHS("1006", "Rice", "HIGH");
if (p.includes("spice") || p.includes("masala")) addHS("0910", "Spices (mixed/various)", "MEDIUM");

// electronics / sensitive hints
if (p.includes("battery") || p.includes("lithium")) {
  addHS("8507", "Electric accumulators (batteries)", "MEDIUM");
  response.warnings.push("Battery shipments may require dangerous goods (DG) checks and special packaging.");
  response.journey_stage = response.journey_stage || "RESTRICTIONS";
}

// Default message if nothing matched
if (hsSuggestions.length === 0) {
  response.hs_note =
    "No direct HS match found. Add more details (material, use, composition) for better suggestion.";
} else {
  response.hs_note =
    "HS code suggestions are guidance only. Confirm final HS code with a customs broker or official tariff tool.";
}

response.hs_code_suggestions = hsSuggestions;
  res.json(response);
});
// ------------------- Reports API (v1) -------------------

// Save a report
app.post("/api/reports", (req, res) => {
  const { product, country, experience, result, lockedHs } = req.body;

  if (!product || !country || !experience || !result || !lockedHs) {
    return res.status(400).json({
      error: "product, country, experience, result, and lockedHs are required",
    });
  }

  const report = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    product,
    country,
    experience,
    risk_level: result.risk_level,
    recommended_incoterm: result.recommended_incoterm,
    journey_stage: result.journey_stage,
    lockedHs,
    documents: result.documents || [],
    warnings: result.warnings || [],
    nextSteps: result.nextSteps || [],
  };

  REPORTS.unshift(report); // newest first

  res.json({
    message: "Report saved ✅",
    reportId: report.id,
    report,
  });
});

// List reports (latest first)
app.get("/api/reports", (req, res) => {
  res.json({
    count: REPORTS.length,
    reports: REPORTS.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      product: r.product,
      country: r.country,
      risk_level: r.risk_level,
      hs: r.lockedHs?.code,
    })),
  });
});

// Get a single report by ID
app.get("/api/reports/:id", (req, res) => {
  const report = REPORTS.find((r) => r.id === req.params.id);

  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  res.json(report);
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
