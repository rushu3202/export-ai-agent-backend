import express from "express";
import cors from "cors";

app.use(
  cors({
    origin: true, // ✅ allow all origins
    credentials: true,
  })
);

app.options("*", cors()); // ✅ preflight
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Supabase Admin (Service Role) ----
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- CORS ----
// Add your Vercel domain(s) in env if you want strict CORS.
// Example: CORS_ORIGINS="https://export-ai-agent-frontend-live.vercel.app,https://export-ai-agent-frontend-live-xxx.vercel.app"
// ---- CORS ----
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server / curl / Postman (no origin)
      if (!origin) return callback(null, true);

      // allow all if CORS_ORIGINS not set
      if (!allowedOrigins.length) return callback(null, true);

      // allow only listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ MUST handle preflight
app.options("*", cors());export-ai-agent-frontend-live-9kbp3m0pq-rushalees-projects.vercel.app, export-ai-agent-frontend-live.vercel.app
, export-ai-agent-frontend-live-git-main-rushalees-projects.vercel.app

// ----------------- Health -----------------
app.get("/", (req, res) => {
  res.json({ status: "Export Agent Backend is running ✅" });
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, service: "export-ai-agent-backend" });
});

// ----------------- Auth helper -----------------
async function requireUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return { error: "Missing Authorization token" };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { error: "Invalid or expired token" };

  return { user: data.user, token };
}

// ----------------- Export Journey (optional) -----------------
app.post("/api/export/start", (req, res) => {
  const { country, product } = req.body;

  if (!country || !product) {
    return res.status(400).json({ error: "country and product are required" });
  }

  const journey = {
    journeyId: uuidv4(),
    country,
    product,
    currentStep: "EXPORT_BASICS",
    createdAt: new Date().toISOString(),
    nextAction: "Check export eligibility",
  };

  res.json({ message: "Export journey started successfully", journey });
});

// ----------------- Export Readiness Check -----------------
app.post("/api/export-check", (req, res) => {
  const { product, country, experience } = req.body;

  if (!product || !country || !experience) {
    return res.status(400).json({
      error: "Product, country, and experience are required",
    });
  }

  const response = {
    product,
    country,
    allowed: true,
    documents: [],
    warnings: [],
    nextSteps: [],
    hs_code_suggestions: [],
    hs_note: "",
    journey_stage: "DOCS",
  };

  // ---- Risk scoring (simple v1) ----
  let riskScore = 0;
  if (experience === "beginner") riskScore += 30;

  const restrictedKeywords = ["battery", "chemical", "medicine", "pharma", "liquid"];
  const isPossiblyRestricted = restrictedKeywords.some((k) =>
    product.toLowerCase().includes(k)
  );
  if (isPossiblyRestricted) riskScore += 40;

  response.risk_level = riskScore >= 70 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";
  response.recommended_incoterm = experience === "beginner" ? "DAP" : "FOB";

  // ---- Base docs ----
  response.documents.push("Commercial Invoice", "Packing List", "Certificate of Origin");

  // ---- Country pack logic ----
  const dest = country
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ");

  const euAliases = ["eu", "european union"];
  const euCountries = [
    "germany","france","italy","spain","netherlands","belgium","ireland","poland",
    "sweden","denmark","finland","austria","portugal","czech republic","greece",
    "hungary","romania","bulgaria","croatia","slovakia","slovenia","lithuania",
    "latvia","estonia","luxembourg","malta","cyprus"
  ];

  const uaeAliases = ["uae", "united arab emirates", "dubai"];
  const indiaAliases = ["india", "bharat"];

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

  if (dest === "uk") {
    response.documents.push("EORI Number");
  }

  if (experience === "beginner") {
    response.warnings.push("Hire a freight forwarder", "Avoid CIF pricing initially");
  }

  response.nextSteps.push("Register with customs", "Confirm HS code", "Talk to logistics partner");

  // ---- HS Code assistant (rule-based v1) ----
  const p = product.trim().toLowerCase();
  const addHS = (code, description, confidence) => {
    response.hs_code_suggestions.push({ code, description, confidence });
  };

  // clothing
  if (p.includes("t-shirt") || p.includes("tshirt") || p.includes("tee")) {
    addHS("6109", "T-shirts, singlets and other vests (knitted or crocheted)", "HIGH");
  }
  if (p.includes("shirt") && !p.includes("t-shirt") && !p.includes("tshirt")) {
    addHS("6205", "Men’s or boys’ shirts (not knitted)", "MEDIUM");
  }

  // food
  if (p.includes("rice")) addHS("1006", "Rice", "HIGH");
  if (p.includes("spice") || p.includes("masala")) addHS("0910", "Spices (mixed/various)", "MEDIUM");

  // batteries
  if (p.includes("battery") || p.includes("lithium")) {
    addHS("8507", "Electric accumulators (batteries)", "MEDIUM");
    response.warnings.push("Battery shipments may require dangerous goods (DG) checks and special packaging.");
    response.journey_stage = "RESTRICTIONS";
  }

  // note
  response.hs_note =
    response.hs_code_suggestions.length === 0
      ? "No direct HS match found. Add more details (material, use, composition) for better suggestion."
      : "HS code suggestions are guidance only. Confirm final HS code with a customs broker or official tariff tool.";

  res.json(response);
});

// ----------------- Reports API (Supabase DB) -----------------

// Save a report (requires user token)
app.post("/api/reports", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { product, country, experience, result, lockedHs } = req.body;

  if (!product || !country || !experience || !result || !lockedHs?.code) {
    return res.status(400).json({ error: "Missing required report data" });
  }

  const row = {
  user_id: auth.user.id,
  email: auth.user.email,
  product,
  country,
  experience,
  hs_code: lockedHs.code,
  hs_description: lockedHs.description || "",
  risk_level: result.risk_level || "",
  incoterm: result.recommended_incoterm || "",
  journey_stage: result.journey_stage || "",
  result: result, // ✅ matches your table
};

  const { data, error } = await supabaseAdmin
    .from("export_reports")
    .insert(row)
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, reportId: data.id });
});

// DELETE a report
app.delete("/api/reports/:id", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("export_reports")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Report not found" });

  res.json({ ok: true, deletedId: data.id });
});

// List reports (latest first)
app.get("/api/reports", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { data, error } = await supabaseAdmin
    .from("export_reports")
    .select("id, product, country, experience, hs_code, risk_level, incoterm, journey_stage, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, reports: data || [] });
});

// Get one report by id
app.get("/api/reports/:id", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("export_reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Report not found" });

  res.json({ ok: true, report: data });
});

// ----------------- Start server -----------------
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
