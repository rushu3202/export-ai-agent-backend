import { useState, useEffect } from 'react';
import { FileDown, Plus, Trash2, CheckCircle, Mail, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';
import axios from 'axios';

export default function InvoiceGenerator() {
  const [sellerName, setSellerName] = useState('ACME Exporters');
  const [buyerName, setBuyerName] = useState('Global Import Ltd');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState([
    { description: 'Laptop Model X', qty: 3, unitPrice: 850 },
    { description: 'Wireless Mouse', qty: 5, unitPrice: 25 },
  ]);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState('');

  useEffect(() => {
    checkEmailConfig();
    fetchContacts();
  }, []);

  const checkEmailConfig = async () => {
    try {
      const response = await axios.get('/api/config');
      setEmailEnabled(response.data.features.email);
    } catch (err) {
      console.error('Failed to check email config:', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await axios.get('/api/contacts', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      setContacts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  const handleContactSelect = (contactId) => {
    setSelectedContact(contactId);
    if (!contactId) {
      setBuyerName('Global Import Ltd');
      setBuyerEmail('');
      return;
    }

    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      const displayName = contact.company || contact.name;
      setBuyerName(displayName);
      setBuyerEmail(contact.email || '');
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', qty: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return (calculateSubtotal() + calculateTax()).toFixed(2);
  };

  const generateInvoice = async (sendEmail = false) => {
    if (sendEmail) {
      setSendingEmail(true);
    } else {
      setLoading(true);
    }
    setSuccessMessage('');
    setError('');
    
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      if (!session) {
        setError('Please log in to generate invoices');
        return;
      }

      const token = session.access_token;

      const response = await fetch('/generate-invoice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sellerName, 
          buyerName, 
          buyerEmail: sendEmail ? buyerEmail : null,
          currency, 
          items,
          taxRate,
          sendEmail
        }),
      });

      if (response.status === 402) {
        const data = await response.json();
        setError(data.message || 'Document generation limit reached. Please upgrade to Pro plan.');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate invoice');
      }

      if (!sendEmail) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        setSuccessMessage('Invoice generated and saved successfully!');
      } else {
        setSuccessMessage(`Invoice generated and sent to ${buyerEmail} successfully!`);
      }
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error generating invoice:', error);
      setError('Error generating invoice: ' + error.message);
    } finally {
      setLoading(false);
      setSendingEmail(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Invoice Generator</h1>
        <p className="mt-2 text-gray-600">
          Generate professional export invoices with automatic HS code assignment
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        {contacts.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <Users className="w-4 h-4 mr-2 text-blue-600" />
              Quick Fill from Contacts
            </label>
            <select
              value={selectedContact}
              onChange={(e) => handleContactSelect(e.target.value)}
              className="w-full px-4 py-2 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select a saved contact to auto-fill --</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.company || contact.name} {contact.email ? `(${contact.email})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seller Name *
            </label>
            <input
              type="text"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Your company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buyer Name *
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Buyer company name"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buyer Email (Optional - for email delivery)
          </label>
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="buyer@example.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="0">0% (No Tax)</option>
              <option value="5">5%</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="18">18% (GST India)</option>
              <option value="20">20% (VAT UK)</option>
              <option value="25">25%</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Items</h3>
            <button
              onClick={addItem}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Product description"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Qty"
                    min="1"
                  />
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Unit price"
                    min="0"
                    step="0.01"
                  />
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 mb-6 border border-gray-200">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-lg font-semibold text-gray-900">{currency} {calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tax ({taxRate}%):</span>
              <span className="text-lg font-semibold text-gray-900">{currency} {calculateTax().toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-300 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-gray-700">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">{currency} {calculateTotal()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => generateInvoice(false)}
            disabled={loading || items.length === 0}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
          >
            <FileDown className="w-5 h-5 mr-2" />
            {loading ? 'Generating...' : 'Download Invoice PDF'}
          </button>

          {emailEnabled && (
            <button
              onClick={() => generateInvoice(true)}
              disabled={sendingEmail || items.length === 0 || !buyerEmail}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
            >
              <Mail className="w-5 h-5 mr-2" />
              {sendingEmail ? 'Sending...' : 'Send via Email'}
            </button>
          )}
        </div>

        <p className="mt-4 text-sm text-gray-500 text-center">
          💡 HS codes will be automatically assigned using AI when generating the PDF
        </p>
      </div>
    </div>
  );
}
