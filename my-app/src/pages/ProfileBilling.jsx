import { useState, useEffect } from 'react';
import { User, CreditCard, Check, Zap, Crown, Mail, Calendar, FileText, ClipboardList, MessageSquare, ExternalLink, Shield } from 'lucide-react';
import { supabase } from '../supabaseClient';
import axios from 'axios';

export default function ProfileBilling() {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [userProfile, setUserProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ invoices_count: 0, forms_count: 0, ai_queries_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      if (!user) {
        setError('Please log in to view your profile');
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      const [profileResponse, statsResponse] = await Promise.all([
        axios.get(`/api/user-profile?userId=${user.id}`).catch(() => ({ data: null })),
        axios.get(`/api/user-stats?userId=${user.id}`).catch(() => ({ data: { invoices_count: 0, forms_count: 0, ai_queries_count: 0 } }))
      ]);
      
      if (profileResponse.data) {
        setUserProfile(profileResponse.data);
        setCurrentPlan(profileResponse.data.subscription_status || 'free');
      }

      if (statsResponse.data) {
        setUserStats(statsResponse.data);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      setProcessingCheckout(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      if (!user) {
        alert('Please log in to upgrade');
        return;
      }

      const response = await axios.post('/api/create-checkout-session', {
        userId: user.id,
        userEmail: user.email
      });

      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      if (!userProfile || !userProfile.stripe_customer_id) {
        alert('No billing information found. Please upgrade first.');
        return;
      }

      const response = await axios.get(`/api/billing-portal?customerId=${userProfile.stripe_customer_id}`);

      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Error opening billing portal:', err);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  const usageStats = {
    invoicesGenerated: userStats.invoices_count || 0,
    invoiceLimit: currentPlan === 'free' ? 3 : '∞',
    formsCompleted: userStats.forms_count || 0,
    aiQueries: userStats.ai_queries_count || 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Profile & Billing</h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage your account, subscription, and billing information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900">Account</h3>
              <p className="text-sm text-gray-600">Profile details</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p className="font-medium text-gray-900 truncate">{currentUser?.email || 'Not available'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Member since</p>
                <p className="font-medium text-gray-900">
                  {currentUser?.created_at 
                    ? new Date(currentUser.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center mb-6">
            <div className={`w-14 h-14 bg-gradient-to-br ${currentPlan === 'pro' ? 'from-purple-500 to-purple-600' : 'from-gray-500 to-gray-600'} rounded-2xl flex items-center justify-center`}>
              {currentPlan === 'pro' ? <Crown className="w-7 h-7 text-white" /> : <Zap className="w-7 h-7 text-white" />}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900">Current Plan</h3>
              <p className={`text-sm font-semibold ${currentPlan === 'pro' ? 'text-purple-600' : 'text-gray-600'}`}>
                {currentPlan === 'free' ? 'Free' : 'Pro'}
              </p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <FileText className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Invoices</p>
                <p className="font-bold text-gray-900">{usageStats.invoicesGenerated} / {usageStats.invoiceLimit}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <ClipboardList className="w-4 h-4 text-green-600" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Forms completed</p>
                <p className="font-bold text-gray-900">{usageStats.formsCompleted}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900">Billing</h3>
              <p className="text-sm text-gray-600">Payment method</p>
            </div>
          </div>
          <div className="mb-4">
            {currentPlan === 'free' ? (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">No payment method required</p>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">Active Subscription</p>
                </div>
              </div>
            )}
          </div>
          {currentPlan === 'pro' && userProfile?.stripe_customer_id && (
            <button
              onClick={handleManageBilling}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-bold flex items-center justify-center gap-2"
            >
              Manage Billing
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {currentPlan === 'free' && (
            <button
              onClick={handleUpgradeToPro}
              disabled={processingCheckout}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-bold disabled:opacity-50"
            >
              {processingCheckout ? 'Processing...' : 'Upgrade to Pro'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center border border-blue-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Need a custom enterprise solution?</h3>
        <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
          Contact us for volume pricing, custom integrations, and dedicated support for your business
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="mailto:support@exportagent.com"
            className="px-6 py-3 bg-white text-primary rounded-xl font-bold hover:bg-blue-50 transition-colors border-2 border-primary"
          >
            Contact Sales
          </a>
          <a
            href="/chat"
            className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-200"
          >
            Chat with AI
          </a>
        </div>
      </div>
    </div>
  );
}
