import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Download, Mail, Phone, Building, X, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/LoadingSkeleton';
import ValidatedInput, { ValidatedSelect } from '../components/ValidatedInput';
import { validators, useFormValidation } from '../utils/validation';
import axios from 'axios';
import * as XLSX from 'xlsx';

const contactValidationRules = {
  name: [validators.required, validators.minLength(2)],
  email: [validators.email],
  phone: [validators.phone],
  type: [validators.required]
};

export default function Contacts() {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const {
    values: formData,
    errors: formErrors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset: resetValidation,
    setValues
  } = useFormValidation({
    type: 'buyer',
    name: '',
    company: '',
    email: '',
    phone: '',
    address: { street: '', city: '', country: '' }
  }, contactValidationRules);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to view contacts');
        return;
      }

      const token = session.access_token;
      const response = await axios.get('/api/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setContacts(response.data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAll()) {
      toast.warning('Please fix validation errors before submitting');
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const token = session.access_token;

      if (editingContact) {
        await axios.put(`/api/contacts/${editingContact.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/contacts', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowModal(false);
      setEditingContact(null);
      resetForm();
      fetchContacts();
      toast.success(editingContact ? 'Contact updated successfully!' : 'Contact added successfully!');
    } catch (error) {
      console.error('Error saving contact:', error);
      if (error.response?.data?.details) {
        error.response.data.details.forEach(msg => toast.error(msg));
      } else {
        toast.error(error.response?.data?.message || 'Failed to save contact. Please try again.');
      }
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;
      await axios.delete(`/api/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchContacts();
      toast.success('Contact deleted successfully');
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact. Please try again.');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setValues({
      type: contact.type,
      name: contact.name,
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || { street: '', city: '', country: '' }
    });
    setShowModal(true);
  };

  const resetForm = () => {
    resetValidation();
  };

  const exportToExcel = () => {
    const data = filteredContacts.map(contact => ({
      Type: contact.type,
      Name: contact.name,
      Company: contact.company || '',
      Email: contact.email || '',
      Phone: contact.phone || '',
      Street: contact.address?.street || '',
      City: contact.address?.city || '',
      Country: contact.address?.country || '',
      'Created Date': new Date(contact.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, `ExportAgent_Contacts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || contact.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contacts/CRM</h1>
          <p className="text-lg text-gray-600">Manage your buyers and suppliers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingContact(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Contact
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="buyer">Buyers</option>
            <option value="supplier">Suppliers</option>
          </select>
          <button
            onClick={exportToExcel}
            disabled={contacts.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Export Excel
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No contacts found</h3>
          <p className="text-gray-500">Start by adding your first buyer or supplier</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${contact.type === 'buyer' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <Users className={`w-6 h-6 ${contact.type === 'buyer' ? 'text-blue-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      contact.type === 'buyer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {contact.type}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {contact.company && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Building className="w-4 h-4" />
                  <span>{contact.company}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Phone className="w-4 h-4" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.address?.country && (
                <div className="text-sm text-gray-500 mt-3">
                  📍 {contact.address.city && `${contact.address.city}, `}{contact.address.country}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingContact(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <ValidatedSelect
                label="Type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                onBlur={handleBlur}
                error={formErrors.type}
                touched={touched.type}
                required
                options={[
                  { value: 'buyer', label: 'Buyer' },
                  { value: 'supplier', label: 'Supplier' }
                ]}
                placeholder="Select contact type"
              />

              <ValidatedInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={formErrors.name}
                touched={touched.name}
                required
                placeholder="Enter contact name"
              />

              <ValidatedInput
                label="Company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Enter company name (optional)"
              />

              <ValidatedInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={formErrors.email}
                touched={touched.email}
                placeholder="Enter email address"
              />

              <ValidatedInput
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                error={formErrors.phone}
                touched={touched.phone}
                placeholder="Enter phone number"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="City"
                  name="address.city"
                  value={formData.address?.city || ''}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
                <ValidatedInput
                  label="Country"
                  name="address.country"
                  value={formData.address?.country || ''}
                  onChange={handleChange}
                  placeholder="Enter country"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingContact(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Contact"
          message="Are you sure you want to delete this contact? This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
}
