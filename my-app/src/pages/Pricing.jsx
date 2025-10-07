import { Check, X, ArrowRight, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('subscription_status')
        .eq('user_id', user.id)
        .single();
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      const response = await axios.post('/api/create-checkout-session', {
        userId: user.id,
        userEmail: user.email,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isPro = userProfile?.subscription_status === 'pro';

  const plans = [
    {
      name: 'Free',
      price: '£0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Up to 3 invoices/month',
        'Basic export forms',
        'Email support',
        'Standard features',
      ],
      notIncluded: [
        'Unlimited invoices',
        'AI-powered HS codes',
        'Priority support',
        'Advanced features',
      ],
      buttonText: 'Current Plan',
      buttonDisabled: true,
      current: !isPro,
    },
    {
      name: 'Pro',
      price: '£9.99',
      period: 'per month',
      description: 'Everything you need to scale',
      features: [
        'Unlimited invoices',
        'All export forms',
        'AI-powered HS code detection',
        'Duty & freight estimation',
        'Priority support',
        'Advanced analytics',
        'API access',
        'Custom branding',
      ],
      notIncluded: [],
      buttonText: isPro ? 'Current Plan' : 'Upgrade Now',
      buttonDisabled: isPro,
      current: isPro,
      recommended: true,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600">
          Choose the plan that's right for your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white rounded-2xl shadow-xl p-8 border-2 transition-all duration-300 ${
              plan.recommended
                ? 'border-primary scale-105'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  RECOMMENDED
                </span>
              </div>
            )}

            {plan.current && (
              <div className="absolute -top-4 right-6">
                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                  ACTIVE
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600">/ {plan.period}</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="bg-green-100 rounded-full p-1 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
              {plan.notIncluded.map((feature) => (
                <li key={feature} className="flex items-start gap-3 opacity-50">
                  <div className="bg-gray-100 rounded-full p-1 mt-0.5">
                    <X className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-gray-500">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={plan.name === 'Pro' && !plan.buttonDisabled ? handleUpgrade : undefined}
              disabled={plan.buttonDisabled || loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                plan.buttonDisabled
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : plan.recommended
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-xl hover:scale-105'
                  : 'bg-gray-800 text-white hover:bg-gray-900'
              }`}
            >
              {loading && plan.name === 'Pro' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  {plan.buttonText}
                  {!plan.buttonDisabled && <ArrowRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">
          ✨ Start your 7-day free trial • Cancel anytime
        </p>
        <p className="text-xs text-gray-500">
          All plans include secure payment processing and data encryption
        </p>
      </div>

      <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Need help choosing?</h3>
        <p className="text-gray-700 mb-4">
          Not sure which plan is right for you? Contact our team for personalized recommendations.
        </p>
        <div className="flex gap-4">
          <a
            href="mailto:support@exportagent.com"
            className="px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-blue-50 transition-colors border border-primary"
          >
            Contact Sales
          </a>
          <a
            href="/chat"
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Chat with AI Assistant
          </a>
        </div>
      </div>
    </div>
  );
}
