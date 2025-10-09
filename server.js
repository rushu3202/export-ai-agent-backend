import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
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

// Nodemailer transporter - only configured if credentials are available
const isEmailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
const mailTransporter = isEmailConfigured 
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    })
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

// Authentication Middleware
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error:', error.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Usage Tier Checking Helper
async function checkTierAndIncrement(userId, action) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const plan = profile?.subscription_status || 'free';

    const { data: usage, error: usageError } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', userId)
      .eq('month_yyyy', currentMonth)
      .single();

    let currentUsage = usage || {
      user_id: userId,
      month_yyyy: currentMonth,
      docs_created: 0,
      hs_searches: 0,
      ai_queries: 0
    };

    const limits = {
      free: { docs_created: 3, hs_searches: 5, ai_queries: 200 },
      pro: { docs_created: Infinity, hs_searches: Infinity, ai_queries: Infinity },
      business: { docs_created: Infinity, hs_searches: Infinity, ai_queries: Infinity }
    };

    const planLimits = limits[plan] || limits.free;

    if (action === 'docs' && currentUsage.docs_created >= planLimits.docs_created) {
      return { allowed: false, feature: 'docs', plan };
    }
    if (action === 'hs_searches' && currentUsage.hs_searches >= planLimits.hs_searches) {
      return { allowed: false, feature: 'hs_searches', plan };
    }
    if (action === 'ai_queries' && currentUsage.ai_queries >= planLimits.ai_queries) {
      return { allowed: false, feature: 'ai_queries', plan };
    }

    const updates = { ...currentUsage };
    if (action === 'docs') updates.docs_created += 1;
    if (action === 'hs_searches') updates.hs_searches += 1;
    if (action === 'ai_queries') updates.ai_queries += 1;

    await supabase
      .from('usage_counters')
      .upsert(updates, { onConflict: 'user_id,month_yyyy' });

    console.log(`[Usage] ${userId} - ${action}: ${plan} plan, incremented successfully`);
    return { allowed: true, plan };
  } catch (error) {
    console.error('[Usage Check] Error:', error.message);
    return { allowed: true, plan: 'unknown' };
  }
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

app.get('/api/config', (req, res) => {
  res.json({
    features: {
      email: isEmailConfigured,
      ai: !!openai,
      payments: !!process.env.STRIPE_SECRET_KEY
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
    console.error('[Checkout] Error type:', error.type);
    console.error('[Checkout] Error code:', error.code);
    res.status(500).json({ error: error.message, type: error.type, code: error.code });
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

app.post('/generate-invoice', authenticateUser, async (req, res) => {
  try {
    const tierCheck = await checkTierAndIncrement(req.user.id, 'docs');
    
    if (!tierCheck.allowed) {
      console.log(`[Invoice] Quota exceeded for user ${req.user.id}`);
      return res.status(402).json({ 
        error: 'quota_exceeded', 
        feature: 'docs',
        plan: tierCheck.plan,
        message: 'Document generation limit reached. Please upgrade to Pro plan.'
      });
    }

    const payload = req.body || {};
    let { sellerName, buyerName, buyerEmail, items, currency, taxRate = 0, sendEmail = false } = payload;

    currency = (currency || "USD").toString().toUpperCase();
    const symbol = currencySymbols[currency] || currency + " ";
    taxRate = Number(taxRate) || 0;

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

    const invoiceNo = generateInvoiceNumber();
    const invoiceDate = new Date().toLocaleDateString("en-GB");
    
    // Calculate totals
    let subtotal = 0;
    for (const it of items) {
      const qty = Number(it.qty || 0);
      const unit = Number(it.unitPrice || 0);
      subtotal += qty * unit;
    }
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    
    if (sendEmail) {
      // Collect PDF in memory for email
      doc.on('data', (chunk) => chunks.push(chunk));
    } else {
      // Stream PDF to response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoiceNo}.pdf`);
      doc.pipe(res);
    }

    const logoPath = path.join(__dirname, "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 30, { width: 110 });
      } catch (err) {
        console.warn("Logo render failed:", err?.message || err);
      }
    }
    doc.fontSize(20).text("COMMERCIAL INVOICE", { align: "center" });

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
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = Number(it.qty || 0);
      const unit = Number(it.unitPrice || 0);
      const lineTotal = qty * unit;

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
    
    // Add subtotal, tax, and total
    position += 15;
    doc.fontSize(11).font("Helvetica");
    doc.text(`Subtotal: ${symbol}${subtotal.toFixed(2)}`, 350, position, { align: "right" });
    position += 20;
    if (taxRate > 0) {
      doc.text(`Tax (${taxRate}%): ${symbol}${taxAmount.toFixed(2)}`, 350, position, { align: "right" });
      position += 20;
    }
    doc.fontSize(12).font("Helvetica-Bold").text(`Grand Total: ${symbol}${grandTotal.toFixed(2)}`, 350, position, { align: "right" });

    doc.moveDown(6);
    const sigY = doc.y + 20;
    doc.fontSize(11).font("Helvetica").text("Authorized Signature:", 50, sigY + 20);
    doc.moveTo(180, sigY + 40).lineTo(350, sigY + 40).stroke();

    doc.rect(400, sigY + 10, 120, 80).stroke();
    doc.fontSize(10).text("Company Stamp", 410, sigY + 50);

    doc.moveDown(6);
    doc.fontSize(8).fillColor("gray");
    const companyFooter = [
      "EXPORTAGENT LTD",
      "Registered in England and Wales",
      `Company No: ${process.env.COMPANY_NUMBER || 'TBC'}`,
      `Registered Address: ${process.env.REGISTERED_ADDRESS || 'TBC'}`,
      process.env.VAT_NUMBER ? `VAT: ${process.env.VAT_NUMBER}` : ''
    ].filter(Boolean).join(' | ');
    
    doc.text(companyFooter, { align: "center" });

    // Save invoice to documents table
    try {
      await supabase
        .from('documents')
        .insert({
          user_id: req.user.id,
          type: 'invoice',
          title: `Invoice ${invoiceNo}`,
          data: {
            seller_name: sellerName,
            buyer_name: buyerName,
            items,
            currency,
            tax_rate: taxRate,
            subtotal: subtotal,
            tax_amount: taxAmount,
            total_amount: grandTotal,
            invoice_number: invoiceNo,
            invoice_date: invoiceDate
          },
          file_url: null
        });
      console.log(`[PDF Generator] Saved invoice ${invoiceNo} to documents for user ${req.user.id}`);
    } catch (dbError) {
      console.error('[PDF Generator] Failed to save to documents:', dbError.message);
    }

    // Send email if requested
    if (sendEmail) {
      // Validate email configuration
      if (!isEmailConfigured || !mailTransporter) {
        return res.status(400).json({ 
          error: 'Email not configured', 
          message: 'Email delivery is not available. Please contact support or download the PDF instead.' 
        });
      }

      // Validate buyer email
      if (!buyerEmail || !buyerEmail.includes('@')) {
        return res.status(400).json({ 
          error: 'Invalid email', 
          message: 'Please provide a valid buyer email address to send the invoice.' 
        });
      }

      // Register end handler BEFORE calling doc.end()
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: buyerEmail,
            subject: `Invoice ${invoiceNo} from ${sellerName}`,
            html: `
              <h2>Commercial Invoice</h2>
              <p>Dear ${buyerName},</p>
              <p>Please find attached your invoice ${invoiceNo} dated ${invoiceDate}.</p>
              <p><strong>Total Amount: ${symbol}${grandTotal.toFixed(2)}</strong></p>
              <p>Thank you for your business!</p>
              <br>
              <p>Best regards,<br>${sellerName}</p>
              <hr>
              <p style="font-size: 12px; color: gray;">This invoice was generated by ExportAgent - Professional Export Documentation Platform</p>
            `,
            attachments: [
              {
                filename: `invoice-${invoiceNo}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
              }
            ]
          };

          await mailTransporter.sendMail(mailOptions);
          console.log(`[Email] Sent invoice ${invoiceNo} to ${buyerEmail}`);
          res.json({ success: true, message: `Invoice sent to ${buyerEmail}`, invoiceNo });
        } catch (emailError) {
          console.error('[Email] Failed to send invoice:', emailError.message);
          res.status(500).json({ 
            error: 'Failed to send email', 
            message: 'Failed to send invoice via email. Please try downloading the PDF instead.',
            details: emailError.message 
          });
        }
      });
    }

    // Call doc.end() to finalize PDF (must be after registering 'end' handler for email)
    doc.end();
  } catch (err) {
    console.error("Generate invoice error:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

app.post('/chat', authenticateUser, async (req, res) => {
  try {
    const tierCheck = await checkTierAndIncrement(req.user.id, 'ai_queries');
    
    if (!tierCheck.allowed) {
      console.log(`[Chat] AI quota exceeded for user ${req.user.id}`);
      return res.status(402).json({ 
        error: 'quota_exceeded', 
        feature: 'ai_queries',
        plan: tierCheck.plan,
        message: 'AI query limit reached. Please upgrade to Pro plan.'
      });
    }

    const { message, history = [] } = req.body;

    if (!openai) {
      return res.json({
        response: "I'm here to help with export procedures! (Note: AI is currently unavailable, but I can provide general guidance on HS codes, customs compliance, shipping documentation, and international trade regulations.)"
      });
    }

    const messages = [
      {
        role: 'system',
        content: `You are a Smart Export AI Assistant - an expert in international trade, export documentation, and compliance.

Your capabilities:
• Provide STEP-BY-STEP guidance for export procedures
• Offer COUNTRY-SPECIFIC requirements and regulations
• Explain HS codes, Incoterms, duties, taxes, and VAT/GST
• Guide users through document preparation (invoices, packing lists, certificates of origin, bills of lading)
• Advise on customs compliance and shipping logistics
• Answer FAQs about international trade

Response style:
• Use clear, structured answers with numbered steps when appropriate
• Include specific examples and practical advice
• Highlight important warnings or requirements in **bold**
• Be concise but comprehensive
• When asked about country-specific info, provide detailed regulations for that country
• If you need more information to give accurate advice, ask clarifying questions

Always be helpful, professional, and accurate. Your goal is to make export procedures easy to understand and follow.`
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
      max_tokens: 800
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

// PHASE 1 API ENDPOINTS

// Contacts endpoints
app.get('/api/contacts', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    console.log(`[Contacts] Fetched ${data.length} contacts for user ${req.user.id}`);
    res.json(data);
  } catch (error) {
    console.error('[Contacts GET] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts', authenticateUser, async (req, res) => {
  try {
    const { type, name, company, email, phone, address } = req.body;
    
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: req.user.id,
        type,
        name,
        company,
        email,
        phone,
        address: address || {}
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`[Contacts] Created contact ${data.id} for user ${req.user.id}`);
    res.json(data);
  } catch (error) {
    console.error('[Contacts POST] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contacts/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, company, email, phone, address } = req.body;
    
    const { data, error } = await supabase
      .from('contacts')
      .update({
        type,
        name,
        company,
        email,
        phone,
        address,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    console.log(`[Contacts] Updated contact ${id} for user ${req.user.id}`);
    res.json(data);
  } catch (error) {
    console.error('[Contacts PUT] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contacts/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    console.log(`[Contacts] Deleted contact ${id} for user ${req.user.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[Contacts DELETE] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Documents endpoints
app.post('/api/documents/generate', authenticateUser, async (req, res) => {
  try {
    const tierCheck = await checkTierAndIncrement(req.user.id, 'docs');
    
    if (!tierCheck.allowed) {
      console.log(`[Documents] Quota exceeded for user ${req.user.id} - ${tierCheck.feature}`);
      return res.status(402).json({ 
        error: 'quota_exceeded', 
        feature: tierCheck.feature,
        plan: tierCheck.plan,
        message: 'Document generation limit reached. Please upgrade to Pro plan.'
      });
    }

    const { type, title, data } = req.body;
    
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        user_id: req.user.id,
        type,
        title,
        data: data || {},
        file_url: null
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`[Documents] Created ${type} document ${document.id} for user ${req.user.id}`);
    res.json(document);
  } catch (error) {
    console.error('[Documents POST] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    console.log(`[Documents] Fetched document ${id} for user ${req.user.id}`);
    res.json(data);
  } catch (error) {
    console.error('[Documents GET] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// HS Code search endpoint
app.post('/api/hs-search', authenticateUser, async (req, res) => {
  try {
    const tierCheck = await checkTierAndIncrement(req.user.id, 'hs_searches');
    
    if (!tierCheck.allowed) {
      console.log(`[HS Search] Quota exceeded for user ${req.user.id}`);
      return res.status(402).json({ 
        error: 'quota_exceeded', 
        feature: 'hs_searches',
        plan: tierCheck.plan,
        message: 'HS code search limit reached. Please upgrade to Pro plan.'
      });
    }

    const { query, country } = req.body;

    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured' });
    }

    const prompt = `Provide the 6-digit HS (Harmonized System) code for: "${query}". 
    Destination country: ${country || 'General'}
    
    Respond with ONLY the HS code (6 digits) and confidence level (0-100).
    Format: HSCODE|CONFIDENCE
    Example: 620342|95`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0.3
    });

    const response = completion.choices[0].message.content.trim();
    const [hsCode, confidenceStr] = response.split('|');
    const confidence = parseFloat(confidenceStr) / 100 || 0.8;

    const { data, error } = await supabase
      .from('hs_searches')
      .insert({
        user_id: req.user.id,
        query,
        hs_code: hsCode?.trim() || '000000',
        confidence,
        country: country || null
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`[HS Search] Created search ${data.id} for user ${req.user.id}: ${query} -> ${hsCode}`);
    res.json(data);
  } catch (error) {
    console.error('[HS Search] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// AI Suggest Description endpoint
app.post('/api/ai-suggest-description', authenticateUser, async (req, res) => {
  try {
    const tierCheck = await checkTierAndIncrement(req.user.id, 'ai_queries');
    
    if (!tierCheck.allowed) {
      console.log(`[AI Suggest] Quota exceeded for user ${req.user.id}`);
      return res.status(402).json({ 
        error: 'quota_exceeded', 
        feature: 'ai_queries',
        plan: tierCheck.plan,
        message: 'AI query limit reached. Please upgrade to Pro plan.'
      });
    }

    const { keywords } = req.body;

    if (!keywords || keywords.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide product keywords' });
    }

    if (!openai) {
      return res.status(503).json({ error: 'AI service not available' });
    }

    const prompt = `You are a professional product description writer for export invoices. 
    
Given these keywords or rough description: "${keywords}"

Generate a clear, professional, and concise product description suitable for a commercial export invoice. The description should:
- Be 3-8 words maximum
- Be specific and professional
- Include key product attributes (material, type, model if applicable)
- Be suitable for customs documentation
- Use proper capitalization

Respond with ONLY the product description, nothing else.

Examples:
Keywords: "laptop dell" → "Dell Latitude Business Laptop Computer"
Keywords: "cotton shirt" → "100% Cotton Men's Dress Shirt"
Keywords: "phone charger" → "USB-C Fast Charging Adapter"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0.7
    });

    const description = completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    console.log(`[AI Suggest] Generated description for user ${req.user.id}: "${keywords}" -> "${description}"`);
    res.json({ description });
  } catch (error) {
    console.error('[AI Suggest] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Shipments endpoints
app.post('/api/shipments', authenticateUser, async (req, res) => {
  try {
    const { reference, metadata } = req.body;
    
    const { data, error } = await supabase
      .from('shipments')
      .insert({
        user_id: req.user.id,
        reference,
        status: 'created',
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`[Shipments] Created shipment ${data.id} for user ${req.user.id}`);
    res.json(data);
  } catch (error) {
    console.error('[Shipments POST] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/shipments/:id/status', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['created', 'shipped', 'customs', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const { data, error } = await supabase
      .from('shipments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    console.log(`[Shipments] Updated shipment ${id} status to ${status} for user ${req.user.id}`);
    res.json(data);
  } catch (error) {
    console.error('[Shipments PUT] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// AI Insights endpoint
app.get('/api/insights', authenticateUser, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthStart = new Date(currentMonth + '-01').toISOString();
    
    // Fetch invoices from this month
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('type', 'invoice')
      .gte('created_at', monthStart);
    
    const invoices = documents || [];
    
    // Calculate insights
    const totalInvoices = invoices.length;
    
    // Top 3 clients by invoice count
    const clientCounts = {};
    invoices.forEach(inv => {
      const client = inv.data?.buyer_name || 'Unknown';
      clientCounts[client] = (clientCounts[client] || 0) + 1;
    });
    const topClients = Object.entries(clientCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    
    // Most used currency
    const currencyCounts = {};
    invoices.forEach(inv => {
      const curr = inv.data?.currency || 'USD';
      currencyCounts[curr] = (currencyCounts[curr] || 0) + 1;
    });
    const mostUsedCurrency = Object.entries(currencyCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'USD';
    
    // Total export value
    const totalValue = invoices.reduce((sum, inv) => {
      return sum + (inv.data?.total_amount || 0);
    }, 0);
    
    res.json({
      totalInvoices,
      topClients,
      mostUsedCurrency,
      totalValue: totalValue.toFixed(2),
      currencyBreakdown: Object.entries(currencyCounts).map(([currency, count]) => ({
        currency,
        count
      }))
    });
  } catch (error) {
    console.error('[Insights] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Usage endpoint
app.get('/api/usage', authenticateUser, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const { data, error } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('month_yyyy', currentMonth)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const usage = data || {
      user_id: req.user.id,
      month_yyyy: currentMonth,
      docs_created: 0,
      hs_searches: 0,
      ai_queries: 0
    };

    console.log(`[Usage] Fetched usage for user ${req.user.id}: ${JSON.stringify(usage)}`);
    res.json(usage);
  } catch (error) {
    console.error('[Usage GET] Error:', error.message);
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
