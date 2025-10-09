import { useState, useEffect } from 'react';
import { FileText, ClipboardList, MessageSquare, Package, TrendingUp, Sparkles, Globe, ArrowUpRight, Users, Search, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Home() {
  const [stats, setStats] = useState([
    { name: 'Invoices', value: '0', icon: FileText, color: 'from-blue-500 to-blue-600', href: '/invoices' },
    { name: 'Contacts', value: '0', icon: Users, color: 'from-green-500 to-green-600', href: '/contacts' },
    { name: 'HS Searches', value: '0', icon: Search, color: 'from-purple-500 to-purple-600', href: '/hs-finder' },
    { name: 'Shipments', value: '0', icon: Package, color: 'from-orange-500 to-orange-600', href: '/shipment' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [usage, setUsage] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetchUserStats();
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await axios.get('/api/insights', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setInsights(response.data);
    } catch (err) {
      console.error('Error fetching insights:', err);
    }
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      if (!session) {
        setError('Please log in to view your stats');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single();
      
      setUserProfile(profile);

      const token = session.access_token;

      // Fetch counts from various tables
      const [invoicesRes, contactsRes, hsSearchesRes, shipmentsRes, usageRes] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('hs_searches').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
        axios.get('/api/usage', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null }))
      ]);

      setStats([
        { name: 'Invoices', value: (invoicesRes.count || 0).toString(), icon: FileText, color: 'from-blue-500 to-blue-600', href: '/invoices' },
        { name: 'Contacts', value: (contactsRes.count || 0).toString(), icon: Users, color: 'from-green-500 to-green-600', href: '/contacts' },
        { name: 'HS Searches', value: (hsSearchesRes.count || 0).toString(), icon: Search, color: 'from-purple-500 to-purple-600', href: '/hs-finder' },
        { name: 'Shipments', value: (shipmentsRes.count || 0).toString(), icon: Package, color: 'from-orange-500 to-orange-600', href: '/shipment' },
      ]);

      if (usageRes.data) {
        setUsage(usageRes.data);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      name: 'Invoice Generator',
      description: 'Generate professional export invoices with automatic HS code assignment',
      icon: FileText,
      href: '/invoice',
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'Contacts/CRM',
      description: 'Manage your buyers and suppliers with ease',
      icon: Users,
      href: '/contacts',
      color: 'from-green-500 to-green-600',
    },
    {
      name: 'HS Code Finder',
      description: 'AI-powered HS code lookup for export products',
      icon: Search,
      href: '/hs-finder',
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'Shipment Tracker',
      description: 'Track international shipments with real-time status updates',
      icon: Package,
      href: '/shipment',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const isFreeUser = !userProfile || userProfile.subscription_status !== 'pro';

  const usageData = usage ? [
    { name: 'Documents', value: usage.docs_created, color: '#3B82F6' },
    { name: 'HS Searches', value: usage.hs_searches, color: '#8B5CF6' },
    { name: 'AI Queries', value: usage.ai_queries, color: '#10B981' },
  ] : [];

  const limits = isFreeUser 
    ? { docs: 3, hs_searches: 5, ai_queries: 200 }
    : { docs: Infinity, hs_searches: Infinity, ai_queries: Infinity };

  return (
    <div className="max-w-7xl mx-auto">
      {showWelcome && (
        <div className="mb-6 bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <p className="text-white font-medium">
                🎉 Welcome to ExportAgent — Automate your export documentation today!
              </p>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="text-white hover:text-gray-200 transition-colors px-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isFreeUser && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-800 font-medium">You're on the Free Plan</p>
              <p className="text-sm text-gray-600 mt-1">Upgrade to unlock unlimited features and AI assistance</p>
            </div>
            <Link
              to="/pricing"
              className="px-6 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-lg text-gray-600">
          Track your export documentation and automation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {loading ? (
          <div className="col-span-4 text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading stats...</p>
          </div>
        ) : error ? (
          <div className="col-span-4 text-center py-12 bg-red-50 rounded-2xl">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          stats.map((stat) => (
            <Link
              key={stat.name}
              to={stat.href}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.name}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2 group-hover:text-primary transition-colors">{stat.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {usage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Usage</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Usage Limits {isFreeUser && '(Free Plan)'}</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Documents</span>
                  <span className="font-semibold">{usage.docs_created} / {limits.docs === Infinity ? '∞' : limits.docs}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${limits.docs === Infinity ? 0 : (usage.docs_created / limits.docs) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">HS Searches</span>
                  <span className="font-semibold">{usage.hs_searches} / {limits.hs_searches === Infinity ? '∞' : limits.hs_searches}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${limits.hs_searches === Infinity ? 0 : (usage.hs_searches / limits.hs_searches) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">AI Queries</span>
                  <span className="font-semibold">{usage.ai_queries} / {limits.ai_queries === Infinity ? '∞' : limits.ai_queries}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${limits.ai_queries === Infinity ? 0 : (usage.ai_queries / limits.ai_queries) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {insights && (
        <div className="mb-10 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">AI Insights - This Month</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
              <p className="text-3xl font-bold text-indigo-600">{insights.totalInvoices}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Most Used Currency</p>
              <p className="text-3xl font-bold text-green-600">{insights.mostUsedCurrency}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Total Export Value</p>
              <p className="text-2xl font-bold text-blue-600">{insights.mostUsedCurrency} {insights.totalValue}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Top Clients</p>
              {insights.topClients.length > 0 ? (
                <div className="space-y-1">
                  {insights.topClients.map((client, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 truncate">{client.name}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{client.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.name}
              to={feature.href}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 group border border-gray-100"
            >
              <div className="flex items-start gap-4">
                <div className={`bg-gradient-to-br ${feature.color} rounded-xl p-3 text-white group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {feature.name}
                    </h3>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Globe className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready to automate your exports?</h3>
              <p className="text-blue-100">
                Start by generating your first invoice or finding HS codes
              </p>
            </div>
          </div>
          <Link
            to="/invoice"
            className="bg-white text-primary px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all duration-200 hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
          >
            Get Started
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
