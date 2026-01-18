import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS (supports Vercel prod + preview)
const allowedOrigin = (origin) => {
  if (!origin) return true; // Postman/curl/no-origin
  if (origin === "https://export-ai-agent-frontend-live.vercel.app") return true;
  if (origin.endsWith(".vercel.app")) return true; // allow ALL Vercel previews
  return false;
};

app.use(
  cors({
    origin: (origin, cb) => cb(null, allowedOrigin(origin)),
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ MUST handle preflight
app.options("*", cors());

app.use(express.json({ limit: "1mb" }));

// ... your routes ...
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
app.use(
  cors({
    origin: (origin, cb) => {
      // allow Postman/curl (no origin)
      if (!origin) return cb(null, true);

      // allow your Vercel domains
      if (allowedOrigins.includes(origin)) return cb(null, true);

      // IMPORTANT: for MVP, allow all other origins too (prevents you getting stuck)
      return cb(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// MUST handle preflight
app.options("*", cors());

app.use(express.json({ limit: "1mb" }));

/* =========================
   SUPABASE (Service Role)
========================= */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   HEALTH
========================= */
app.get("/", (req, res) => res.json({ status: "Export Agent Backend is running ✅" }));
app.get("/healthz", (req, res) => res.status(200).json({ ok: true }));
app.get("/api/health", (req, res) =>
  res.status(200).json({ ok: true, service: "export-ai-agent-backend" })
);

/* =========================
   AUTH HELPER
========================= */
async function requireUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return { error: "Missing Authorization token" };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { error: "Invalid or expired token" };

  return { user: data.user };
}

/* =========================
   EXPORT READINESS CHECK
========================= */
app.post("/api/export-check", (req, res) => {
  const { product, country, experience } = req.body;

  if (!product || !country || !experience) {
    return res.status(400).json({ error: "Product, country, and experience are required" });
  }

  const response = {
    product,
    country,
    experience,
    allowed: true,
    documents: [],
    warnings: [],
    nextSteps: [],
    hs_code_suggestions: [],
    hs_note: "",
    journey_stage: "DOCS",
    risk_level: "LOW",
    recommended_incoterm: experience === "beginner" ? "DAP" : "FOB",
    compliance_checklist: [],
country_rules: [],
official_links: [],
  };

  // Base docs always
  response.documents.push("Commercial Invoice", "Packing List", "Certificate of Origin");

  const dest = country.trim().toLowerCase().replace(/\./g, "").replace(/,/g, "").replace(/\s+/g, " ");

  if (dest === "uk") response.documents.push("EORI Number");

  if (experience === "beginner") {
    response.warnings.push("Hire a freight forwarder", "Avoid CIF pricing initially");
  }

  const p = product.trim().toLowerCase();
  const addHS = (code, description, confidence) => {
    response.hs_code_suggestions.push({ code, description, confidence });
  };

  // Clothing
  if (p.includes("t-shirt") || p.includes("tshirt") || p.includes("tee")) {
    addHS("6109", "T-shirts, singlets and other vests (knitted or crocheted)", "HIGH");
  } else if (p.includes("shirt")) {
    addHS("6205", "Men’s or boys’ shirts (not knitted)", "MEDIUM");
  }

  // Food / Agriculture (Makhana)
  if (p.includes("makhana") || p.includes("fox nut") || p.includes("phool makhana")) {
    addHS(
      "2008",
      "Fruits, nuts and other edible parts of plants, otherwise prepared or preserved",
      "MEDIUM"
    );
    response.documents.push("Ingredients / Product Specification Sheet");
    response.warnings.push(
      "Food items may require extra checks: labeling, ingredients, shelf-life, and food safety rules."
    );
    response.nextSteps.unshift("Confirm food compliance rules for the destination country");
    response.journey_stage = "FOOD_COMPLIANCE";
  }

  // If no match
  if (response.hs_code_suggestions.length === 0) {
    response.hs_note =
      "No direct HS match found. Add details (material, composition, use, processing) for better suggestion.";
    response.documents.push("Product Specification Sheet (materials, composition, use)");
    response.nextSteps.unshift("Add more product details for better HS classification");
  } else {
    response.hs_note =
      "HS code suggestions are guidance only. Confirm final HS code with a customs broker or official tariff tool.";
  }

  // Universal next steps
  response.nextSteps.push("Confirm HS code", "Talk to logistics partner", "Confirm importer/buyer details");

  res.json(response);
});

/* =========================
   REPORTS API (SUPABASE)
   Table: export_reports
   Must have column: result (jsonb)
========================= */

// SAVE report
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
    result, // jsonb column
    country_rules: [],
compliance_checklist: [],
official_links: [],
  };

  const { data, error } = await supabaseAdmin
    .from("export_reports")
    .insert(row)
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  // ------------------ Country Packs (UK-first) ------------------
response.country_rules = [];
response.compliance_checklist = [];
response.official_links = [];

// helper
const addRule = (title, detail) => response.country_rules.push({ title, detail });
const addCheck = (item) => response.compliance_checklist.push(item);
const addLink = (label, url) => response.official_links.push({ label, url });

// Normalize destination
const dest = country.trim().toLowerCase();

// Detect food-like products (basic)
const foodKeywords = ["makhana", "fox nut", "phool makhana", "spice", "masala", "snack", "food", "nuts", "dry fruit"];
const isFood = foodKeywords.some((k) => product.toLowerCase().includes(k));

// UK PACK
if (dest === "uk") {
  addRule("UK Import Basics", "Your UK buyer/importer usually needs an EORI number and must handle UK customs import entry.");
  addRule("VAT & Duties", "Duties/VAT depend on HS code + origin + product type. Confirm with official tariff tools.");
  addCheck("Confirm who is the Importer of Record (buyer or agent).");
  addCheck("Confirm HS code (final) using an official tariff tool or broker.");
  addCheck("Ensure Commercial Invoice + Packing List are complete and match quantities/values.");
  addCheck("Ensure shipment has clear product description (materials/ingredients).");

  addLink("UK Trade Tariff (check duties by HS code)", "https://www.trade-tariff.service.gov.uk/");
  addLink("UK Government: Importing guidance", "https://www.gov.uk/import-goods-into-uk");
  addLink("UK Food Standards Agency (food guidance)", "https://www.food.gov.uk/");
}

// UK FOOD PACK
if (dest === "uk" && isFood) {
  response.journey_stage = "UK_FOOD_COMPLIANCE";

  addRule("Food labeling", "UK food imports must comply with labeling rules (ingredients, allergens, net weight, best-before/expiry, importer details).");
  addRule("Ingredients & allergens", "Maintain a clear ingredient list + allergen statement. Keep product spec sheet ready.");
  addRule("Food safety checks", "Some foods may require extra checks depending on origin/product type (confirm with buyer/broker).");

  addCheck("Prepare Ingredients / Product Specification Sheet.");
  addCheck("Prepare product label info: ingredients, allergens, net weight, dates, importer details.");
  addCheck("Confirm if any phytosanitary/health certificates are needed (depends on product/category).");
  addCheck("Confirm packaging is food-safe and sealed properly.");

  addLink("UK Food labeling guidance (overview)", "https://www.gov.uk/food-labelling-and-packaging");
}
const pushRule = (title, detail) => response.country_rules.push({ title, detail });
const pushCheck = (item) => response.compliance_checklist.push(item);
const pushLink = (label, url) => response.official_links.push({ label, url });

const dest2 = country.trim().toLowerCase();

if (dest2 === "uk") {
  pushRule("Importer of Record", "Confirm who acts as Importer of Record in the UK (buyer, agent, or broker).");
  pushRule("Tariff & Duties", "Duties/VAT depend on HS code and origin. Confirm using the UK Trade Tariff.");
  pushRule("Invoice accuracy", "Invoice must match packing list and include HS, incoterm, values, origin, currency.");

  pushCheck("Confirm Importer of Record (buyer or broker).");
  pushCheck("Confirm final HS code using a tariff tool or broker.");
  pushCheck("Prepare Commercial Invoice (HS, incoterm, values, origin, currency).");
  pushCheck("Prepare Packing List (weights, cartons, dimensions).");
  pushCheck("Confirm EORI details (usually importer).");

  pushLink("UK Trade Tariff (duty lookup)", "https://www.trade-tariff.service.gov.uk/");
  pushLink("Import goods into the UK (GOV.UK)", "https://www.gov.uk/import-goods-into-uk");
}

  res.json({ ok: true, reportId: data.id });
});

// LIST reports
app.get("/api/reports", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { data, error } = await supabaseAdmin
    .from("export_reports")
    .select("id, product, country, experience, hs_code, hs_description, risk_level, incoterm, journey_stage, result, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, reports: data || [] });
});

// GET one report
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

// DELETE report
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

/* =========================
   START
========================= */
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
