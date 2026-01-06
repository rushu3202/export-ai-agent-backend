import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   CORS (FULL + SAFE)
========================= */

// Put your Vercel domains here (add more if needed)
const allowedOrigins = [
  "https://export-ai-agent-frontend-live.vercel.app",
  "https://export-ai-agent-frontend-live-git-main-rushalees-projects.vercel.app",
  "https://export-ai-agent-frontend-live-9kbp3m0pq-rushalees-projects.vercel.app",
];

// CORS middleware
app.use(
  cors({
    origin: (origin, cb) => {
      // allow calls from Postman/curl or same-origin
      if (!origin) return cb(null, true);

      // allow listed vercel domains
      if (allowedOrigins.includes(origin)) return cb(null, true);

      // MVP: allow all (prevents you getting stuck again)
      return cb(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
app.get("/api/health", (req, res) => res.status(200).json({ ok: true, service: "export-ai-agent-backend" }));

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
  };

  // Base docs always
  response.documents.push("Commercial Invoice", "Packing List", "Certificate of Origin");

  const dest = country.trim().toLowerCase();

  if (dest === "uk") response.documents.push("EORI Number");

  // Beginner warnings
  if (experience === "beginner") {
    response.warnings.push("Hire a freight forwarder", "Avoid CIF pricing initially");
  }

  // Product rules
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

  // Food / Agriculture (makhana)
  if (p.includes("makhana") || p.includes("fox nut") || p.includes("phool makhana")) {
    addHS("2008", "Fruits, nuts and other edible parts of plants, otherwise prepared or preserved", "MEDIUM");
    response.warnings.push("Food items may require additional checks: ingredient list, labeling, phytosanitary or food safety rules.");
    response.documents.push("Ingredients / Product Specification Sheet");
    response.nextSteps.unshift("Confirm food compliance rules for the destination country");
  }

  // If nothing matched
  if (response.hs_code_suggestions.length === 0) {
    response.hs_note =
      "No direct HS match found. Add more details (material, composition, use, processing) for better suggestion.";
    // Add “always show something” fallback guidance
    response.documents.push("Product Specification Sheet (materials, composition, use)");
    response.nextSteps.unshift("Provide more product detail for HS classification");
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
   Columns used:
   user_id, email, product, country, experience,
   hs_code, hs_description, risk_level, incoterm,
   journey_stage, result (jsonb), created_at
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
    result, // jsonb
  };

  const { data, error } = await supabaseAdmin
    .from("export_reports")
    .insert(row)
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, reportId: data.id });
});

// LIST reports
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
