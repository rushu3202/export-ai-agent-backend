import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const getFrontendUrl = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  if (process.env.REPLIT_DEPLOYMENT === '1') {
    return 'https://export-agent-invoice-rspats2739.replit.app';
  }
  
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (replitDomain) {
    const domain = replitDomain.split(',')[0];
    return `https://${domain}`;
  }
  return 'http://localhost:5000';
};

const FRONTEND_URL = getFrontendUrl();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const currencySymbols = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  JPY: "¥",
};

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

app.use(cors({
  origin: [
    'https://export-agent-invoice-rspats2739.replit.app',
    'https://0d33b273-78dc-4d46-81b1-a5d306c354e4-00-2wyc61srg18ak.janeway.replit.dev',
    /\.replit\.dev$/,
    /\.replit\.app$/
  ],
  credentials: true
}));

app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    
    await supabase
      .from('user_profiles')
      .update({
        stripe_customer_id: session.customer,
        subscription_status: 'pro',
        subscription_id: session.subscription
      })
      .eq('id', userId);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    
    await supabase
      .from('user_profiles')
      .update({ subscription_status: 'free' })
      .eq('subscription_id', subscription.id);
  }

  res.json({ received: true });
});

app.use(bodyParser.json());

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.use('/public', express.static(path.join(__dirname, 'public')));

const distFolder = path.join(__dirname, 'dist');
if (fs.existsSync(distFolder)) {
  app.use(express.static(distFolder));
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      supabase: !!process.env.SUPABASE_URL,
      openai: !!process.env.OPENAI_API_KEY
    }
  });
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userEmail, userId } = req.body;
    console.log(`[Checkout] Creating session for user: ${userId}, email: ${userEmail}`);
    console.log(`[Checkout] Frontend URL: ${FRONTEND_URL}`);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Export AI Agent Pro',
              description: 'Unlimited invoices, all export forms, advanced AI assistance',
            },
            unit_amount: 999,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/cancel`,
      metadata: {
        userId: userId
      }
    });

    console.log(`[Checkout] Session created: ${session.id}`);
    res.json({ url: session.url });
  } catch (error) {
    console.error('[Checkout] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/billing-portal', async (req, res) => {
  try {
    const { customerId } = req.query;
    console.log(`[Billing Portal] Creating session for customer: ${customerId}`);
    console.log(`[Billing Portal] Return URL: ${FRONTEND_URL}/profile`);
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${FRONTEND_URL}/profile`,
    });

    console.log(`[Billing Portal] Session created successfully`);
    res.json({ url: session.url });
  } catch (error) {
    console.error('[Billing Portal] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save-invoice', async (req, res) => {
  try {
    const { userId, sellerName, buyerName, currency, totalAmount, items } = req.body;
    console.log(`[Save Invoice] Saving invoice for user: ${userId}`);
    
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        seller_name: sellerName,
        buyer_name: buyerName,
        currency,
        total_amount: totalAmount,
        items
      })
      .select();

    if (error) {
      console.error('[Save Invoice] Supabase error:', error);
      throw error;
    }
    
    console.log(`[Save Invoice] Invoice saved successfully`);
    res.json({ success: true, invoice: data[0] });
  } catch (error) {
    console.error('[Save Invoice] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-stats', async (req, res) => {
  try {
    const { userId } = req.query;
    console.log(`[User Stats] Fetching stats for user: ${userId}`);
    
    const [invoices, forms, queries] = await Promise.all([
      supabase.from('invoices').select('*', { count: 'exact' }).eq('user_id', userId),
      supabase.from('export_forms').select('*', { count: 'exact' }).eq('user_id', userId),
      supabase.from('chat_history').select('*', { count: 'exact' }).eq('user_id', userId)
    ]);

    if (invoices.error) console.error('[User Stats] Invoices error:', invoices.error);
    if (forms.error) console.error('[User Stats] Forms error:', forms.error);
    if (queries.error) console.error('[User Stats] Queries error:', queries.error);

    const stats = {
      invoices_count: invoices.count || 0,
      forms_count: forms.count || 0,
      ai_queries_count: queries.count || 0
    };
    
    console.log(`[User Stats] Returning:`, stats);
    res.json(stats);
  } catch (error) {
    console.error('[User Stats] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-profile', async (req, res) => {
  try {
    const { userId } = req.query;
    console.log(`[User Profile] Fetching profile for user: ${userId}`);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[User Profile] Supabase error:', error);
      throw error;
    }
    
    console.log(`[User Profile] Found profile:`, data ? 'Yes' : 'No');
    res.json(data);
  } catch (error) {
    console.error('[User Profile] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

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
    const match = text.match(/\d{6}/);
    return match ? match[0] : text.slice(0, 6).padEnd(6, "0");
  } catch (err) {
    console.error("OpenAI HS code error:", err?.message || err);
    return "000000";
  }
}

app.post('/generate-invoice', async (req, res) => {
  try {
    const payload = req.body || {};
    let { sellerName, buyerName, items, currency } = payload;

    currency = (currency || "USD").toString().toUpperCase();
    const symbol = currencySymbols[currency] || currency + " ";

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    items = Array.isArray(items) ? items : [];

    sellerName = sellerName || "Seller";
    buyerName = buyerName || "Buyer";

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it) continue;
      if (!it.description) it.description = "Item " + (i + 1);
      if (!it.hsCode || it.hsCode === "N/A") {
        it.hsCode = await getHSCode(it.description);
      }
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${generateInvoiceNumber()}.pdf`
    );

    doc.pipe(res);

    const logoPath = path.join(__dirname, "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 30, { width: 110 });
      } catch (err) {
        console.warn("Logo render failed:", err?.message || err);
      }
    }
    doc.fontSize(20).text("COMMERCIAL INVOICE", { align: "center" });

    const invoiceNo = generateInvoiceNumber();
    const invoiceDate = new Date().toLocaleDateString("en-GB");
    doc.fontSize(10).text(`Invoice No: ${invoiceNo}`, 420, 50, { align: "left" });
    doc.text(`Date: ${invoiceDate}`, 420, 65, { align: "left" });

    doc.moveDown(3);

    doc.fontSize(11).fillColor("black");
    const leftX = 50;
    const midX = 300;
    doc.text("Seller:", leftX, doc.y);
    doc.font("Helvetica-Bold").text(sellerName);
    doc.font("Helvetica").moveDown(0.5);
    doc.text("Buyer:", midX, doc.y - 28);
    doc.font("Helvetica-Bold").text(buyerName);
    doc.moveDown();

    const tableTop = doc.y + 10;
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("No", 50, tableTop);
    doc.text("Description", 90, tableTop);
    doc.text("Qty", 330, tableTop, { width: 40, align: "right" });
    doc.text("Unit", 380, tableTop, { width: 70, align: "right" });
    doc.text("Line Total", 455, tableTop, { width: 80, align: "right" });
    doc.text("HS Code", 540, tableTop, { width: 70, align: "right" });

    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

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
      if (position > 720) {
        doc.addPage();
        position = 50;
      }
    }

    doc.moveTo(350, position + 5).lineTo(560, position + 5).stroke();
    doc.fontSize(12).font("Helvetica-Bold").text(`Grand Total: ${symbol}${grandTotal.toFixed(2)}`, 350, position + 15, { align: "right" });

    doc.moveDown(6);
    const sigY = doc.y + 20;
    doc.fontSize(11).font("Helvetica").text("Authorized Signature:", 50, sigY + 20);
    doc.moveTo(180, sigY + 40).lineTo(350, sigY + 40).stroke();

    doc.rect(400, sigY + 10, 120, 80).stroke();
    doc.fontSize(10).text("Company Stamp", 410, sigY + 50);

    doc.moveDown(6);
    doc.fontSize(9).fillColor("gray").text("Generated by Export AI Agent", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Generate invoice error:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!openai) {
      return res.json({
        response: "I'm here to help with export procedures! (Note: AI is currently unavailable, but I can provide general guidance on HS codes, customs compliance, shipping documentation, and international trade regulations.)"
      });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert export documentation advisor. Help users with export procedures, HS code classification, customs compliance, shipping logistics, and international trade regulations. Be concise and practical.'
      },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/export-forms', async (req, res) => {
  try {
    const { action, formType, formData } = req.body;

    if (action === 'suggest' && openai) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an export documentation expert. Help users fill out ${formType} forms with accurate information based on their input.`
          },
          {
            role: 'user',
            content: `I'm filling out a ${formType}. Here's my current data: ${JSON.stringify(formData)}. What should I include or improve?`
          }
        ],
        temperature: 0.5
      });

      return res.json({ suggestion: completion.choices[0].message.content });
    }

    res.json({ suggestion: 'Please provide complete information for all required fields.' });
  } catch (error) {
    console.error('Export forms error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/track', async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.body;

    const mockStatus = {
      trackingNumber,
      carrier: carrier || 'DHL Express',
      status: 'In Transit',
      location: 'Dubai, UAE',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      updates: [
        { date: new Date().toLocaleDateString(), status: 'Package in transit', location: 'Dubai, UAE' },
        { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString(), status: 'Customs cleared', location: 'Mumbai, India' },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(), status: 'Picked up', location: 'Mumbai, India' }
      ]
    };

    res.json(mockStatus);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔐 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? 'Configured' : 'Missing'}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
});
