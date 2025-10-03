// server.js
const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // serve the form

// Endpoint: generate invoice PDF
app.post('/generate-invoice', (req, res) => {
  const { sellerName, buyerName, items } = req.body;
  const itemsArr = typeof items === 'string' ? JSON.parse(items) : (items || []);

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
  doc.pipe(res);

  doc.fontSize(20).text('Commercial Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Seller: ${sellerName || ''}`);
  doc.text(`Buyer: ${buyerName || ''}`);
  doc.moveDown();

  doc.text('Items:', { underline: true });
  let total = 0;
  itemsArr.forEach((it, i) => {
    const qty = Number(it.qty || 0);
    const unit = Number(it.unitPrice || 0);
    const lineTotal = qty * unit;
    total += lineTotal;
    doc.text(`${i + 1}. ${it.description} — Qty: ${qty} — Unit: ${unit.toFixed(2)} — Total: ${lineTotal.toFixed(2)}`);
  });

  doc.moveDown();
  doc.fontSize(14).text(`Grand Total: ${total.toFixed(2)}`, { align: 'right' });

  doc.end();
});

// Serve simple form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
