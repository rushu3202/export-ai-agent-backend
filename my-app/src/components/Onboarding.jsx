import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Briefcase, FileText, Gift, ArrowRight, Check, Globe, Package, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabaseClient';

const Onboarding = ({ onComplete, user }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    industry: '',
    business_type: '',
    primary_goal: '',
    contact_email: user?.email || ''
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await axios.post('/api/complete-onboarding', formData, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Welcome to ExportAgent! 🎉</h2>
            <div className="text-white/80 text-sm font-medium">Step {step} of 4</div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              className="bg-white h-2 rounded-full"
              initial={{ width: '25%' }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome & Business Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h3>
                  <p className="text-gray-600">This helps us personalize your experience</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What type of business are you?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'manufacturer', label: 'Manufacturer', icon: Package },
                        { value: 'trader', label: 'Trader/Distributor', icon: TrendingUp },
                        { value: 'service', label: 'Service Provider', icon: Briefcase },
                        { value: 'other', label: 'Other', icon: Globe }
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => updateField('business_type', type.value)}
                          className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            formData.business_type === type.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <type.icon className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Company Details */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Information</h3>
                  <p className="text-gray-600">We'll use this for your invoices and documents</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => updateField('company_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Address
                    </label>
                    <textarea
                      value={formData.company_address}
                      onChange={(e) => updateField('company_address', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street, City, Country, Postal Code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select industry</option>
                      <option value="textiles">Textiles & Apparel</option>
                      <option value="electronics">Electronics & Technology</option>
                      <option value="agriculture">Agriculture & Food</option>
                      <option value="machinery">Machinery & Equipment</option>
                      <option value="chemicals">Chemicals & Pharmaceuticals</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Primary Goal */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">What's your primary goal?</h3>
                  <p className="text-gray-600">We'll customize your dashboard accordingly</p>
                </div>

                <div className="space-y-3">
                  {[
                    { value: 'invoices', label: 'Generate professional invoices', desc: 'Create export invoices with AI-powered features' },
                    { value: 'documents', label: 'Complete export documentation', desc: 'Automate shipping bills, BOL, packing lists' },
                    { value: 'hscodes', label: 'Find HS codes quickly', desc: 'AI-powered harmonized system code finder' },
                    { value: 'marketplace', label: 'Connect with global buyers', desc: 'Access B2B marketplace and grow sales' }
                  ].map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => updateField('primary_goal', goal.value)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        formData.primary_goal === goal.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.primary_goal === goal.value ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                        }`}>
                          {formData.primary_goal === goal.value && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{goal.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{goal.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Get Started */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">You're all set! 🎉</h3>
                  <p className="text-gray-600">Here's what you can do next</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Create Your First Invoice</h4>
                      <p className="text-sm text-gray-600">Generate a professional export invoice with AI assistance</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await handleComplete();
                      window.location.href = '/app/invoice';
                    }}
                    className="w-full bg-blue-600 text-white rounded-xl px-4 py-3 font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Start Creating <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Upgrade to Pro</h4>
                      <p className="text-sm text-gray-600">Unlock unlimited invoices, AI features & more</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await handleComplete();
                      window.location.href = '/app/profile';
                    }}
                    className="w-full bg-white text-purple-600 border-2 border-purple-600 rounded-xl px-4 py-3 font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                  >
                    View Plans <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="border-t border-gray-200 px-8 py-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && !formData.business_type}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={async () => {
                await handleComplete();
              }}
              className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
