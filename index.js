import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   CORS (safe + Vercel-friendly)
========================= */
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Postman/curl/no-origin
  // Allow ALL Vercel deployments (prod + preview)
  if (origin.endsWith(".vercel.app")) return true;
  // Local dev (optional)
  if (origin === "http://localhost:5173" || origin === "http://localhost:3000") return true;
  return false;
};

const corsOptions = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: false, // you're using Bearer token auth, not cookies
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

/* =========================
   SUPABASE (Service Role)
========================= */
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

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
   EXPORT READINESS CHECK (Codex upgrade)
========================= */
function normalizeCountry(country) {
  return (country || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ");
}

function categoryPack(category) {
  const packs = {
    textile: {
      riskLevel: "LOW",
      riskReason: "Textile exports are usually straightforward if composition and labeling are correct.",
      journeyStage: "DOCS",
      documents: [
        "Commercial Invoice",
        "Packing List",
        "Certificate of Origin",
        "Product Specification Sheet (materials, composition, use)",
        "Fabric Composition Certificate (if available)",
      ],
      documentReasons: [
        { doc: "Fabric Composition Certificate (if available)", reason: "Helps confirm fiber content (cotton vs blends) for correct HS classification." },
      ],
      warnings: ["Confirm fabric composition (e.g., 100% cotton vs blends) for correct HS code."],
      hsCandidates: [
        { code: "6109", description: "T-shirts, singlets and other vests (knitted or crocheted)", confidence: "HIGH" },
        { code: "6205", description: "Men’s or boys’ shirts (not knitted)", confidence: "MEDIUM" },
        { code: "6110", description: "Sweaters, pullovers and similar articles (knitted)", confidence: "LOW" },
      ],
    },

    food: {
      riskLevel: "MEDIUM",
      riskReason: "Food exports often require labeling, ingredient/allergen, shelf-life and destination compliance checks.",
      journeyStage: "FOOD_COMPLIANCE",
      documents: [
        "Commercial Invoice",
        "Packing List",
        "Certificate of Origin",
        "Product Specification Sheet (materials, composition, use)",
        "Ingredients / Product Specification Sheet",
        "Label Artwork / Label Text (if available)",
      ],
      documentReasons: [
        { doc: "Ingredients / Product Specification Sheet", reason: "Required for ingredient/allergen compliance and buyer due diligence." },
        { doc: "Label Artwork / Label Text (if available)", reason: "Helps validate labeling requirements for destination market." },
      ],
      warnings: ["Food exports may require labeling/allergen/shelf-life checks depending on destination rules."],
      hsCandidates: [
        { code: "2008", description: "Fruits, nuts and other edible parts of plants, otherwise prepared or preserved", confidence: "MEDIUM" },
        { code: "2106", description: "Food preparations not elsewhere specified", confidence: "LOW" },
        { code: "1905", description: "Bread, pastry, cakes, biscuits and other baked goods", confidence: "LOW" },
      ],
    },

    spices: {
      riskLevel: "MEDIUM",
      riskReason: "Spices require correct HS chapter, labeling/ingredient details and may trigger food compliance checks.",
      journeyStage: "FOOD_COMPLIANCE",
      documents: [
        "Commercial Invoice",
        "Packing List",
        "Certificate of Origin",
        "Product Specification Sheet (materials, composition, use)",
        "Ingredients / Product Specification Sheet",
        "Label Artwork / Label Text (if available)",
      ],
      documentReasons: [
        { doc: "Ingredients / Product Specification Sheet", reason: "Needed to confirm ingredient composition (single spice vs blend) for HS and compliance." },
        { doc: "Label Artwork / Label Text (if available)", reason: "Spices need compliant labeling (ingredients/allergens/net weight/importer details where required)." },
      ],
      warnings: ["Spices/blends may require labeling + allergen statements (if blended/processed)."],
      hsCandidates: [
        { code: "0904", description: "Pepper (capsicum/pimenta), dried or crushed", confidence: "MEDIUM" },
        { code: "0910", description: "Ginger, saffron, turmeric, thyme, bay leaves, curry and other spices", confidence: "HIGH" },
        { code: "0909", description: "Seeds of anise, badian, fennel, coriander, cumin, caraway, juniper", confidence: "MEDIUM" },
      ],
    },

    UNKNOWN: {
      riskLevel: "MEDIUM",
      riskReason: "Not enough details to classify. Need composition/material/use for correct HS and compliance.",
      journeyStage: "NEEDS_DETAILS",
      documents: [
        "Commercial Invoice",
        "Packing List",
        "Certificate of Origin",
        "Product Specification Sheet (materials, composition, use)",
      ],
      documentReasons: [
        { doc: "Product Specification Sheet (materials, composition, use)", reason: "Required to determine correct HS classification and compliance." },
      ],
      warnings: ["Add more product details (material, composition, use, processing) for accurate HS classification."],
      hsCandidates: [],
    },
  };

  return packs[category] || packs.UNKNOWN;
}

function inferCategory(product) {
  const p = String(product || "").toLowerCase();

  // Spices (most specific first)
  const spiceKeys = [
    "spice",
    "spices",
    "masala",
    "turmeric",
    "haldi",
    "chilli",
    "chili",
    "pepper",
    "cumin",
    "jeera",
    "coriander",
    "dhania",
  ];
  if (spiceKeys.some((k) => p.includes(k))) {
    return "spices";
  }

  // Textile / garments
  const textileKeys = [
    "t-shirt",
    "tshirt",
    "tee",
    "shirt",
    "hoodie",
    "sweater",
    "cotton",
    "garment",
    "clothing",
    "apparel",
  ];
  if (textileKeys.some((k) => p.includes(k))) {
    return "textile";
  }

  // Food (generic)
  const foodKeys = [
    "food",
    "snack",
    "makhana",
    "fox nut",
    "nuts",
    "dry fruit",
  ];
  if (foodKeys.some((k) => p.includes(k))) {
    return "food";
  }

  return "UNKNOWN";
}


  // Spices (most specific first)
  const spiceKeys = [
    "spice",
    "spices",
    "masala",
    "turmeric",
    "haldi",
    "chilli",
    "chili",
    "pepper",
    "cumin",
    "jeera",
    "coriander",
    "dhania",
  ];
  if (spiceKeys.some((k) => p.includes(k))) {
    return "spices";
  }

  // Textile / garments
  const textileKeys = [
    "t-shirt",
    "tshirt",
    "tee",
    "shirt",
    "hoodie",
    "sweater",
    "cotton",
    "garment",
    "clothing",
    "apparel",
  ];
  if (textileKeys.some((k) => p.includes(k))) {
    return "textile";
  }

  // Food (generic)
  const foodKeys = [
    "food",
    "snack",
    "makhana",
    "fox nut",
    "nuts",
    "dry fruit",
  ];
  if (foodKeys.some((k) => p.includes(k))) {
    return "food";
  }

  return "UNKNOWN";
}

  // Spices
// Spices
if (
  p.includes("spice") ||
  p.includes("spices") ||
  p.includes("masala") ||
  p.includes("turmeric") ||
  p.includes("chilli") ||
  p.includes("pepper") ||
  p.includes("cumin") ||
  p.includes("coriander")
) {
  response.product_category = "food";
  response.risk_level = "MEDIUM";
  response.journey_stage = dest === "uk" ? "UK_FOOD_COMPLIANCE" : "FOOD_COMPLIANCE";

  setRiskReason(
    "Food products often require labeling, ingredient/allergen checks, and may need additional certificates depending on destination."
  );

  addHS("0904", "Pepper (capsicum/pimenta), dried or crushed", "MEDIUM");
  addHSReason("0904", "Matched because the product includes pepper/chilli-type spices.");

  addHS("0910", "Ginger, saffron, turmeric, thyme, bay leaves, curry and other spices", "HIGH");
  addHSReason("0910", "Matched because the product includes turmeric/curry/mixed spices.");

  addHS("0909", "Seeds of anise, badian, fennel, coriander, cumin, caraway, juniper", "MEDIUM");
  addHSReason("0909", "Matched because the product includes coriander/cumin-type seeds.");

  response.documents.push("Ingredients / Product Specification Sheet");
  addDocReason(
    "Ingredients / Product Specification Sheet",
    "Needed for labeling compliance, allergens, and destination food import checks."
  );

  response.documents.push("Label Artwork / Label Text (if available)");
  addDocReason(
    "Label Artwork / Label Text (if available)",
    "Helps confirm the label meets destination requirements (ingredients, allergens, net weight, dates, importer details)."
  );

  response.warnings.push(
    "Food items may require labeling/allergen/shelf-life checks depending on destination rules."
  );
}

  // textiles / apparel
  const textileKeys = ["t-shirt", "tshirt", "tee", "shirt", "cotton", "hoodie", "sweater", "garment", "textile", "fabric"];
  if (textileKeys.some((k) => p.includes(k))) return "textile";

  // machinery / parts
  const machineKeys = ["machine", "machinery", "cnc", "gear", "bearing", "spare", "part", "valve", "pump", "motor", "compressor"];
  if (machineKeys.some((k) => p.includes(k))) return "machinery";

  // chemicals
  const chemKeys = ["solvent", "chemical", "cleaner", "acid", "alkali", "detergent", "paint", "adhesive", "resin", "flammable", "hazard"];
  if (chemKeys.some((k) => p.includes(k))) return "chemicals";

  // electronics
  const elecKeys = ["bluetooth", "speaker", "headphone", "earphone", "charger", "battery", "electronics", "pcb", "circuit", "wireless", "radio"];
  if (elecKeys.some((k) => p.includes(k))) return "electronics";

  // furniture / wood
  const furnKeys = ["table", "chair", "sofa", "furniture", "wood", "timber", "cabinet", "bed", "dining"];
  if (furnKeys.some((k) => p.includes(k))) return "furniture";

  // cosmetics
  const cosKeys = ["cosmetic", "cream", "lotion", "skincare", "skin care", "makeup", "shampoo", "soap", "beauty"];
  if (cosKeys.some((k) => p.includes(k))) return "cosmetics";

  // medical
  const medKeys = ["mask", "surgical", "medical", "ppe", "glove", "bandage", "thermometer", "diagnostic"];
  if (medKeys.some((k) => p.includes(k))) return "medical";

  return "UNKNOWN";
}

function uniqHs(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    if (!x?.code) continue;
    if (seen.has(x.code)) continue;
    seen.add(x.code);
    out.push(x);
  }
  return out;
}

function ensureThreeHs(suggestions, category) {
  const base = uniqHs(suggestions);

  // global generic fallbacks (only used to reach 3)
  const generic = [
    { code: "8479", description: "Machines and mechanical appliances (generic)", confidence: "LOW" },
    { code: "3926", description: "Other articles of plastics (generic)", confidence: "LOW" },
    { code: "7326", description: "Other articles of iron or steel (generic)", confidence: "LOW" },
  ];

  // If truly unknown category, include an explicit UNKNOWN code
  if (category === "UNKNOWN") {
    base.push({ code: "UNKNOWN", description: "Needs classification — provide composition/use/processing", confidence: "LOW" });
  }

  const merged = uniqHs([...base, ...generic]);

  // guarantee length 3
  while (merged.length < 3) {
    merged.push({ code: "7326", description: "Other articles of iron or steel (generic)", confidence: "LOW" });
  }

  return merged.slice(0, 3);
}

function categoryPack(category) {
  // Base always present to avoid “empty UI”
  const base = {
    risk_level: "MEDIUM",
    journey_stage: "DOCS",
    documents: [
      "Commercial Invoice",
      "Packing List",
      "Certificate of Origin",
      "Product Specification Sheet (materials, composition, use)",
    ],
    warnings: [],
    nextSteps: [],
    hsCandidates: [], // used to build suggestions
  };

  switch (category) {
    case "textile":
      return {
        ...base,
        risk_level: "LOW",
        journey_stage: "DOCS",
        documents: [...base.documents, "Fabric Composition Certificate (if available)"],
        warnings: ["Confirm fabric composition (e.g., 100% cotton vs blends) for correct HS code."],
        hsCandidates: [
          { code: "6109", description: "T-shirts, singlets and other vests (knitted or crocheted)", confidence: "HIGH" },
          { code: "6205", description: "Men’s or boys’ shirts (not knitted)", confidence: "MEDIUM" },
          { code: "6110", description: "Sweaters, pullovers and similar articles (knitted)", confidence: "LOW" },
        ],
      };

    case "machinery":
      return {
        ...base,
        risk_level: "MEDIUM",
        journey_stage: "TECH_DOCS",
        documents: [...base.documents, "Technical Datasheet / Manual", "End-use / Function Description"],
        warnings: ["Machines/parts often need clear technical specs and end-use to classify correctly."],
        hsCandidates: [
          { code: "8466", description: "Parts and accessories for machine-tools", confidence: "MEDIUM" },
          { code: "8483", description: "Transmission shafts, gears and gearing; parts", confidence: "LOW" },
          { code: "8479", description: "Machines and mechanical appliances (other)", confidence: "LOW" },
        ],
      };

    case "food":
      return {
        ...base,
        risk_level: "MEDIUM",
        journey_stage: "FOOD_COMPLIANCE",
        documents: [...base.documents, "Ingredients / Product Specification Sheet", "Label Artwork / Label Text (if available)"],
        warnings: ["Food exports may require labeling/allergen/shelf-life checks depending on destination rules."],
        hsCandidates: [
          { code: "2008", description: "Fruits, nuts and other edible parts of plants, otherwise prepared or preserved", confidence: "MEDIUM" },
          { code: "2106", description: "Food preparations not elsewhere specified", confidence: "LOW" },
          { code: "1905", description: "Bread, pastry, cakes, biscuits and other baked goods", confidence: "LOW" },
        ],
      };

    case "chemicals":
      return {
        ...base,
        risk_level: "HIGH",
        journey_stage: "HAZMAT",
        documents: [...base.documents, "Safety Data Sheet (SDS/MSDS)", "Hazard Classification / UN number (if applicable)"],
        warnings: ["Chemicals may be regulated as dangerous goods; SDS and transport compliance are critical."],
        hsCandidates: [
          { code: "3814", description: "Organic composite solvents and thinners; prepared paint/varnish removers", confidence: "LOW" },
          { code: "3402", description: "Organic surface-active agents; washing preparations", confidence: "LOW" },
          { code: "2905", description: "Acyclic alcohols and their derivatives", confidence: "LOW" },
        ],
      };

    case "electronics":
      return {
        ...base,
        risk_level: "MEDIUM",
        journey_stage: "REGULATORY",
        documents: [...base.documents, "Technical Specs Sheet", "Battery Transport Declaration (if applicable)"],
        warnings: ["Electronics may require destination approvals (e.g., radio/Bluetooth conformity, battery transport rules)."],
        hsCandidates: [
          { code: "8518", description: "Microphones and loudspeakers; audio-frequency amplifiers; parts", confidence: "MEDIUM" },
          { code: "8517", description: "Telephone/radio communication apparatus; parts", confidence: "LOW" },
          { code: "8504", description: "Electrical transformers, converters, power supplies", confidence: "LOW" },
        ],
      };

    case "furniture":
      return {
        ...base,
        risk_level: "LOW",
        journey_stage: "DOCS",
        documents: [...base.documents, "Material Composition Declaration (wood type/finish)", "Packaging/ISPM-15 statement (if wood packaging)"],
        warnings: ["Wood/packaging may need ISPM-15 compliance depending on destination and packaging type."],
        hsCandidates: [
          { code: "9403", description: "Other furniture and parts thereof", confidence: "MEDIUM" },
          { code: "9401", description: "Seats and parts thereof", confidence: "LOW" },
          { code: "4419", description: "Tableware and kitchenware, of wood", confidence: "LOW" },
        ],
      };

    case "cosmetics":
      return {
        ...base,
        risk_level: "MEDIUM",
        journey_stage: "LABEL_REVIEW",
        documents: [...base.documents, "Ingredients (INCI) List", "Labeling & Claims Documentation"],
        warnings: ["Cosmetics often require strict labeling/claims compliance; verify destination cosmetic rules."],
        hsCandidates: [
          { code: "3304", description: "Beauty or make-up preparations and preparations for skin care", confidence: "MEDIUM" },
          { code: "3401", description: "Soap; organic surface-active products and preparations", confidence: "LOW" },
          { code: "3305", description: "Preparations for use on the hair", confidence: "LOW" },
        ],
      };

    case "medical":
      return {
        ...base,
        risk_level: "HIGH",
        journey_stage: "MEDICAL_COMPLIANCE",
        documents: [...base.documents, "Quality Certificates (ISO, CE/UKCA, etc.)", "Product Technical File (if applicable)"],
        warnings: ["Medical/PPE may require conformity markings and additional documentation depending on destination."],
        hsCandidates: [
          { code: "6307", description: "Other made up textile articles (includes many masks)", confidence: "MEDIUM" },
          { code: "9018", description: "Instruments and appliances used in medical/surgical sciences", confidence: "LOW" },
          { code: "9020", description: "Breathing appliances and gas masks (excluding protective masks without mechanical parts)", confidence: "LOW" },
        ],
      };

    default:
      return {
        ...base,
        risk_level: "MEDIUM",
        journey_stage: "DETAILS_NEEDED",
        documents: [...base.documents, "Detailed Product Description (use, composition, processing)"],
        warnings: ["More product details needed to classify correctly (composition, use, processing, materials)."],
        hsCandidates: [],
      };
  }
}

app.post("/api/export-check", (req, res) => {
  const { product, country, experience } = req.body;

  if (!product || !country || !experience) {
    return res
      .status(400)
      .json({ error: "Product, country, and experience are required" });
  }

  const dest = normalizeCountry(country);
  const category = inferCategory(product);
  const pack = categoryPack(category);

  const response = {
    product,
    country,
    experience,
    allowed: true,

    // core outputs
    product_category: category || "UNKNOWN",
    risk_level: pack?.riskLevel || "LOW",
    risk_reason: pack?.riskReason || "",

    journey_stage: pack?.journeyStage || "DOCS",
    recommended_incoterm: String(experience).toLowerCase() === "beginner" ? "DAP" : "FOB",

    // explainability layers
    hs_code_suggestions: [],
    hs_explanations: [],
    hs_note: "",

    documents: [],
    document_reasons: [],

    warnings: [],
    nextSteps: [],

    // country packs (always exist)
    compliance_checklist: [],
    country_rules: [],
    official_links: [],
  };

  // Beginner warnings
  if (String(experience).toLowerCase() === "beginner") {
    response.warnings.push("Hire a freight forwarder", "Avoid CIF pricing initially");
  }

  // Build HS suggestions: category candidates + special cases
  const p = product.toLowerCase();
  let hs = [];

  // Strong special-case: t-shirts
  if (p.includes("t-shirt") || p.includes("tshirt") || p.includes("tee")) {
    hs.push({ code: "6109", description: "T-shirts, singlets and other vests (knitted or crocheted)", confidence: "HIGH" });
  }

  // Add category candidates (ordered)
  hs = hs.concat(pack.hsCandidates || []);

  // Ensure always 3 suggestions (UNKNOWN only for unknown category)
  response.hs_code_suggestions = ensureThreeHs(hs, category);
    // Apply pack defaults
  response.product_category = category || "UNKNOWN";
  response.risk_level = pack?.riskLevel || "LOW";
  response.risk_reason = pack?.riskReason || "";
  response.journey_stage = pack?.journeyStage || "DOCS";

  // Documents + reasons + warnings
  response.documents = Array.from(new Set([...(pack?.documents || [])]));
  response.document_reasons = pack?.documentReasons || [];
  response.warnings.push(...(pack?.warnings || []));

  // HS explanations (simple explainability)
  response.hs_explanations = (response.hs_code_suggestions || []).map((x) => ({
    code: x.code,
    why: category === "spices"
      ? "Matched spice-related keywords; confirm if single spice vs blended preparation."
      : category === "food"
      ? "Matched food-related keywords; confirm processing method and ingredients."
      : category === "textile"
      ? "Matched apparel/textile keywords; confirm fabric composition and knit/non-knit."
      : "Need more product details for confident HS classification.",
  }));

  // HS note
  if (category === "UNKNOWN") {
    response.hs_note =
      "No direct HS match found. Add details (material, composition, use, processing) for better suggestion.";
    response.nextSteps.push("Add more product details for better HS classification");
  } else {
    response.hs_note =
      "HS code suggestions are guidance only. Confirm final HS code with a customs broker or official tariff tool.";
  }

  // Universal next steps (always)
  response.nextSteps.push(
    "Confirm HS code",
    "Talk to logistics partner",
    "Confirm importer/buyer details"
  );

  // Default “always show something” (non-UK)
  response.country_rules.push(
    { title: "Importer of Record", detail: "Confirm who is the Importer of Record for the shipment." },
    { title: "Tariff & Duties", detail: "Duties/VAT depend on HS code and origin. Confirm using official tariff tools." },
    { title: "Invoice accuracy", detail: "Invoice must match packing list and include HS, incoterm, values, origin, and currency." }
  );
  response.compliance_checklist.push(
    "Confirm Importer of Record (buyer or broker).",
    "Confirm final HS code using a tariff tool or broker.",
    "Prepare Commercial Invoice (HS, incoterm, values, origin, currency).",
    "Prepare Packing List (weights, cartons, dimensions)."
  );
  response.official_links.push(
    { label: "WCO HS information", url: "https://www.wcoomd.org/en/topics/nomenclature.aspx" },
    { label: "UN/CEFACT trade facilitation", url: "https://unece.org/trade/cefact" }
  );

  // Extra category-specific warnings/docs tweaks (simple but useful)
  if (category === "electronics") {
    response.warnings.push("If the product uses Bluetooth/radio, check destination conformity approvals.");
  }
  if (category === "chemicals") {
    response.warnings.push("If hazardous, confirm dangerous goods (DG) transport rules with your forwarder.");
  }
  if (category === "medical") {
    response.warnings.push("Confirm conformity markings/certificates required in the destination market.");
  }

  // UK rules pack (preserved)
  if (dest === "uk") {
    response.documents = response.documents.includes("EORI Number")
      ? response.documents
      : [...response.documents, "EORI Number"];

    // overwrite packs to keep UK-first clean
    response.country_rules = [];
    response.compliance_checklist = [];
    response.official_links = [];

    response.country_rules.push(
      {
        title: "Importer of Record",
        detail: "Confirm who is the Importer of Record in the UK (buyer, agent, or broker).",
      },
      {
        title: "Tariff & Duties",
        detail: "Duties/VAT depend on HS code and origin. Confirm with the UK Trade Tariff.",
      },
      {
        title: "Invoice accuracy",
        detail: "Invoice must match packing list and include HS, incoterm, values, origin, and currency.",
      }
    );

    response.compliance_checklist.push(
      "Confirm Importer of Record (buyer or broker).",
      "Confirm final HS code using the UK Trade Tariff or a broker.",
      "Prepare Commercial Invoice (HS, incoterm, values, origin, currency).",
      "Prepare Packing List (weights, cartons, dimensions).",
      "Confirm EORI details (usually importer)."
    );

    response.official_links.push(
      { label: "UK Trade Tariff (duty lookup)", url: "https://www.trade-tariff.service.gov.uk/" },
      { label: "Import goods into the UK (GOV.UK)", url: "https://www.gov.uk/import-goods-into-uk" }
    );

    // UK Food compliance
    if (category === "food") {
      response.journey_stage = "UK_FOOD_COMPLIANCE";
      if (!response.documents.includes("Ingredients / Product Specification Sheet")) {
        response.documents.push("Ingredients / Product Specification Sheet");
      }

      response.country_rules.push(
        {
          title: "Food labeling",
          detail:
            "UK food imports must comply with labeling rules (ingredients, allergens, net weight, expiry/best-before, importer details).",
        },
        {
          title: "Ingredients & allergens",
          detail: "Maintain a clear ingredient list and allergen statement. Keep a product spec sheet ready.",
        }
      );

      response.compliance_checklist.push(
        "Prepare Ingredients / Product Specification Sheet.",
        "Prepare label info: ingredients, allergens, net weight, dates, importer details.",
        "Confirm if any food certificates are needed (depends on product/category)."
      );

      response.official_links.push(
        { label: "UK food labeling guidance", url: "https://www.gov.uk/food-labelling-and-packaging" },
        { label: "Food Standards Agency (UK)", url: "https://www.food.gov.uk/" }
      );
    }

    // UK Medical hint
    if (category === "medical") {
      response.country_rules.push({
        title: "UK Conformity (UKCA/CE)",
        detail: "Medical/PPE may require UKCA/CE conformity documentation depending on product type and use.",
      });
    }
  }

  // Ensure warnings never empty (UI confidence)
  if (!response.warnings.length) {
    response.warnings.push("Regulations vary by destination—verify local import rules before shipment.");
  }

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
    result, // ✅ keep everything inside result jsonb (avoid schema cache errors)
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
    .select(
      "id, product, country, experience, hs_code, hs_description, risk_level, incoterm, journey_stage, result, created_at"
    )
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
