import { useState, useEffect } from 'react';
import { FileText, ClipboardList, MessageSquare, Package, TrendingUp, Sparkles, Globe, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import axios from 'axios';

export default function Home() {
  const [stats, setStats] = useState([
    { name: 'Invoices', value: '0', icon: FileText, color: 'from-blue-500 to-blue-600' },
    { name: 'Forms', value: '0', icon: ClipboardList, color: 'from-green-500 to-green-600' },
    { name: 'AI queries', value: '0', icon: MessageSquare, color: 'from-purple-500 to-purple-600' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      if (!user) {
        setError('Please log in to view your stats');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_status')
        .eq('user_id', user.id)
        .single();
      
      setUserProfile(profile);

      const response = await axios.get(`/api/user-stats?userId=${user.id}`);
      
      if (response.data) {
        setStats([
          { name: 'Invoices', value: response.data.invoices_count.toString(), icon: FileText, color: 'from-blue-500 to-blue-600' },
          { name: 'Forms', value: response.data.forms_count.toString(), icon: ClipboardList, color: 'from-green-500 to-green-600' },
          { name: 'AI queries', value: response.data.ai_queries_count.toString(), icon: MessageSquare, color: 'from-purple-500 to-purple-600' },
        ]);
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
      name: 'AI-Powered Invoice Generator',
      description: 'Generate professional export invoices with automatic HS code assignment',
      icon: FileText,
      href: '/invoice',
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'Export Forms Assistant',
      description: 'AI-guided form completion for shipping bills, packing lists, and more',
      icon: ClipboardList,
      href: '/export-forms',
      color: 'from-green-500 to-green-600',
    },
    {
      name: 'AI Chat Assistant',
      description: 'Get expert advice on export procedures, compliance, and documentation',
      icon: MessageSquare,
      href: '/chat',
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

  return (
    <div className="max-w-7xl mx-auto">
      {showWelcome && (
        <div className="mb-6 bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <p className="text-white font-medium">
                🎉 Welcome to ExportAgent — Generate your first export invoice today!
              </p>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="text-white hover:text-gray-200 transition-colors"
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
              <p className="text-sm text-gray-600 mt-1">Upgrade to unlock unlimited invoices and AI features</p>
            </div>
            <Link
              to="/profile"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {loading ? (
          <div className="col-span-3 text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading stats...</p>
          </div>
        ) : error ? (
          <div className="col-span-3 text-center py-12 bg-red-50 rounded-2xl">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.name}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4`}>
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Globe className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready to automate your exports?</h3>
              <p className="text-blue-100">
                Start by generating your first invoice or chatting with our AI assistant
              </p>
            </div>
          </div>
          <Link
            to="/invoice"
            className="bg-white text-primary px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all duration-200 hover:shadow-xl flex items-center gap-2"
          >
            Get Started
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
