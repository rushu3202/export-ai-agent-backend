import { useState } from 'react';
import { FileText, Download, Loader } from 'lucide-react';

export default function ExportForms() {
  const [selectedForm, setSelectedForm] = useState('');
  const [formData, setFormData] = useState({});
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const forms = [
    { value: 'shipping_bill', label: 'Shipping Bill', description: 'Required for customs clearance' },
    { value: 'bill_of_lading', label: 'Bill of Lading', description: 'Document for cargo shipment' },
    { value: 'packing_list', label: 'Packing List', description: 'Detailed list of packed goods' },
    { value: 'certificate_of_origin', label: 'Certificate of Origin', description: 'Certifies country of manufacture' },
  ];

  const formQuestions = {
    shipping_bill: [
      { id: 'exporter_name', label: 'Exporter Name', type: 'text' },
      { id: 'exporter_address', label: 'Exporter Address', type: 'textarea' },
      { id: 'consignee_name', label: 'Consignee Name', type: 'text' },
      { id: 'consignee_country', label: 'Destination Country', type: 'text' },
      { id: 'goods_description', label: 'Description of Goods', type: 'textarea' },
      { id: 'invoice_value', label: 'Invoice Value', type: 'number' },
      { id: 'port_of_loading', label: 'Port of Loading', type: 'text' },
      { id: 'port_of_discharge', label: 'Port of Discharge', type: 'text' },
    ],
    bill_of_lading: [
      { id: 'shipper_name', label: 'Shipper Name', type: 'text' },
      { id: 'consignee_name', label: 'Consignee Name', type: 'text' },
      { id: 'vessel_name', label: 'Vessel Name', type: 'text' },
      { id: 'voyage_number', label: 'Voyage Number', type: 'text' },
      { id: 'goods_description', label: 'Description of Goods', type: 'textarea' },
      { id: 'number_of_packages', label: 'Number of Packages', type: 'number' },
      { id: 'gross_weight', label: 'Gross Weight (kg)', type: 'number' },
    ],
    packing_list: [
      { id: 'shipper_name', label: 'Shipper Name', type: 'text' },
      { id: 'consignee_name', label: 'Consignee Name', type: 'text' },
      { id: 'invoice_number', label: 'Invoice Number', type: 'text' },
      { id: 'goods_description', label: 'Description of Goods', type: 'textarea' },
      { id: 'number_of_packages', label: 'Number of Packages', type: 'number' },
      { id: 'net_weight', label: 'Net Weight (kg)', type: 'number' },
      { id: 'gross_weight', label: 'Gross Weight (kg)', type: 'number' },
    ],
    certificate_of_origin: [
      { id: 'exporter_name', label: 'Exporter Name', type: 'text' },
      { id: 'consignee_name', label: 'Consignee Name', type: 'text' },
      { id: 'country_of_origin', label: 'Country of Origin', type: 'text' },
      { id: 'goods_description', label: 'Description of Goods', type: 'textarea' },
      { id: 'hs_code', label: 'HS Code', type: 'text' },
    ],
  };

  const handleFormSelect = (formValue) => {
    setSelectedForm(formValue);
    setFormData({});
    setCurrentStep(0);
    setAiResponse('');
  };

  const handleInputChange = (id, value) => {
    setFormData({ ...formData, [id]: value });
  };

  const getAIAssistance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fill-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: selectedForm,
          formData: formData,
          currentStep: currentStep,
        }),
      });

      if (!response.ok) throw new Error('AI assistance unavailable');

      const data = await response.json();
      setAiResponse(data.suggestion || 'Please fill in the form fields above.');
    } catch (error) {
      setAiResponse('AI assistance is currently unavailable. Please fill the form manually.');
    } finally {
      setLoading(false);
    }
  };

  const generateFormPDF = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: selectedForm,
          formData: formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate form');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedForm}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error generating form: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestions = selectedForm ? formQuestions[selectedForm] || [] : [];
  const isFormComplete = currentQuestions.length > 0 && currentQuestions.every(q => formData[q.id]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Export Forms Assistant</h1>
        <p className="mt-2 text-gray-600">
          AI-guided form filling for standard export documentation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Form Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {forms.map((form) => (
              <button
                key={form.value}
                onClick={() => handleFormSelect(form.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedForm === form.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start">
                  <FileText className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{form.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedForm && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fill Form Details</h3>
              <div className="space-y-4 mb-6">
                {currentQuestions.map((question, index) => (
                  <div key={question.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {question.label}
                    </label>
                    {question.type === 'textarea' ? (
                      <textarea
                        value={formData[question.id] || ''}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                      />
                    ) : (
                      <input
                        type={question.type}
                        value={formData[question.id] || ''}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={getAIAssistance}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {loading ? 'Loading...' : 'Get AI Assistance'}
                </button>
                <button
                  onClick={generateFormPDF}
                  disabled={!isFormComplete || loading}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Generate PDF
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Assistance</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : aiResponse ? (
            <div className="prose prose-sm text-gray-700">
              <p>{aiResponse}</p>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">
              Select a form and click "Get AI Assistance" to receive guidance on filling out the form correctly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
