import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
function extractInfo(text) {
  const lower = text.toLowerCase();

  const countries = ["uk", "usa", "germany", "uae", "canada"];
  const foundCountry = countries.find(c => lower.includes(c));

  return {
    country: foundCountry || null,
    product: text
  };
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   ENV VALIDATION
========================= */
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase env variables");
  process.exit(1);
}

/* =========================
   SERVICES INIT
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2023-10-16",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   CORS
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || origin.endsWith(".vercel.app") || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
};
app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use(cors(corsOptions));

/* =========================
   STRIPE WEBHOOK (RAW BODY)
========================= */
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_email;

      await supabase
        .from("user_profiles")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("email", email);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(err.message);
    res.status(400).send("Webhook error");
  }
});

/* =========================
   JSON PARSER (AFTER WEBHOOK)
========================= */
app.use(express.json());

/* =========================
   HEALTH
========================= */
app.get("/", (req, res) => {
  res.json({ status: "✅ Export AI Agent Backend Running" });
});

/* =========================
   AUTH HELPER
========================= */
async function requireUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return { error: "No token" };

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return { error: "Invalid token" };

  return { user: data.user };
}
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !messages.length) {
      return res.status(400).json({ error: "Messages required" });
    }

    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    console.log("Incoming:", lastMessage);

    let data;

    if (lastMessage.includes("makhana")) {
      data = {
        demand: "High demand in UK health food market",
        profit: "40–60% margins",
        risks: [
          "Food compliance required",
          "Shelf life management",
          "Import regulations"
        ],
        steps: [
          "Get FSSAI certification",
          "Use export packaging",
          "Find UK distributor",
          "Start with small shipment"
        ],
        recommendation: "Strong niche opportunity in health market"
      };
    } else {
      data = {
        demand: "Depends on product and country",
        profit: "20–40%",
        risks: ["Market competition"],
        steps: ["Research market", "Find buyers"],
        recommendation: "Provide more details"
      };
    }

    res.json(data);

  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
/* =========================
   AI: FIND BUYERS
========================= */
app.post("/api/ai-buyers", async (req, res) => {
  const { product, country } = req.body;

  if (!product || !country) {
    return res.status(400).json({ error: "Missing data" });
  }
  console.log("Incoming request:", req.body); 

  try {
    const prompt = `
Find 5 real companies in ${country} that import ${product}.
Return JSON:
[{ name, type, reason, message }]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let buyers = [];

    try {
      buyers = JSON.parse(response.choices[0].message.content);
    } catch {
      buyers = [];
    }
    console.log("AI RAW RESPONSE:", aiText);

    res.json({ buyers });
  } catch (err) {
    res.status(500).json({ error: "AI failed" });
  }
});

/* =========================
   EXPORT CHECK (CORE FEATURE)
========================= */
app.post("/api/export-check", (req, res) => {
  const { product, country } = req.body;
  function generateExportAnalysis(product, country, experience = "beginner") {
  const category = inferCategory(product);
  const pack = categoryPack(category);

  return {
    product,
    country,
    category,
    risk: pack.risk_level,
    documents: pack.documents,
    warnings: pack.warnings,
    hs: pack.hsCandidates,
  };
}

  if (!product || !country) {
    return res.status(400).json({ error: "Missing fields" });
  }

  let result;

  const p = product.toLowerCase();

  if (p.includes("makhana")) {
    result = {
      demand: "High demand in UK health food market",
      profit: "40-60%",
      recommendation: "Strong niche opportunity",
    };
  } else if (p.includes("t-shirt")) {
    result = {
      demand: "Stable demand",
      profit: "30-50%",
      recommendation: "Highly competitive",
    };
  } else {
    result = {
      demand: "Moderate demand",
      profit: "20-40%",
      recommendation: "Test before scaling",
    };
  }

  res.json(result);
});

/* =========================
   SAVE REPORT
========================= */
app.post("/api/reports", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { product, country, result } = req.body;

  const { data, error } = await supabase
    .from("export_reports")
    .insert({
      user_id: auth.user.id,
      product,
      country,
      result,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ report: data });
});

/* =========================
   GET REPORTS
========================= */
app.get("/api/reports", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { data } = await supabase
    .from("export_reports")
    .select("*")
    .eq("user_id", auth.user.id);

  res.json({ reports: data });
});

/* =========================
   USER STATUS
========================= */
app.get("/api/user-status", async (req, res) => {
  const auth = await requireUser(req);
  if (auth.error) return res.status(401).json({ error: auth.error });

  const { data } = await supabase
    .from("user_profiles")
    .select("is_paid")
    .eq("id", auth.user.id)
    .single();

  res.json({ isPaid: data?.is_paid || false });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});