import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, FileText, ClipboardList, MessageSquare, Package, Menu, X, User, LogOut, Globe, Users, Search, History, Store, ListTree, TrendingUp, Settings as SettingsIcon, FileStack } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import Footer from './Footer';
import CrispChat from './CrispChat';
import Onboarding from './Onboarding';
import axios from 'axios';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await axios.get('/api/user-profile', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setUserProfile(response.data);
      
      if (response.data && !response.data.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    fetchUserProfile();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  
  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: Home },
    { name: 'B2B Marketplace', href: '/app/marketplace', icon: Store },
    { name: 'My Listings', href: '/app/marketplace/my-listings', icon: ListTree },
    { name: 'My Leads', href: '/app/marketplace/leads', icon: TrendingUp },
    { name: 'Invoice Generator', href: '/app/invoice', icon: FileText },
    { name: 'Invoice History', href: '/app/invoices', icon: History },
    { name: 'Contacts/CRM', href: '/app/contacts', icon: Users },
    { name: 'HS Code Finder', href: '/app/hs-finder', icon: Search },
    { name: 'Shipment Tracker', href: '/app/shipment', icon: Package },
    { name: 'Export Forms', href: '/app/export-forms', icon: ClipboardList },
    { name: 'Forms History', href: '/app/export-forms-history', icon: FileStack },
    { name: 'AI Chat Assistant', href: '/app/chat', icon: MessageSquare },
    { name: 'Settings', href: '/app/settings', icon: SettingsIcon },
    { name: 'Profile & Billing', href: '/app/profile', icon: User },
  ];

  const isFreeUser = !userProfile || userProfile.subscription_status !== 'pro';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden flex items-center justify-between bg-primary text-white p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <Globe className="w-6 h-6" />
          <h1 className="text-xl font-bold">ExportAgent</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-primary-800 rounded-lg transition-colors">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        <aside id="sidebar" className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 w-64 h-screen
          transition-transform bg-gradient-to-b from-primary to-primary-800 text-white shadow-2xl
        `}>
          <div className="h-full flex flex-col">
            <div className="p-6 hidden lg:block border-b border-primary-600">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-8 h-8" />
                <h1 className="text-2xl font-bold">ExportAgent</h1>
              </div>
              <p className="text-blue-200 text-sm">Smart AI Platform for Exporters</p>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              ))}
            </nav>

            {isFreeUser && (
              <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-secondary to-blue-400 rounded-2xl">
                <p className="text-sm font-semibold mb-2">Upgrade to Pro</p>
                <p className="text-xs text-blue-50 mb-3">Unlock unlimited invoices & AI features</p>
                <NavLink
                  to="/app/profile"
                  className="block text-center bg-white text-primary px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
                >
                  Upgrade Now
                </NavLink>
              </div>
            )}

            <div className="p-4 border-t border-primary-600">
              {user && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm truncate flex-1">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-xl transition-colors text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
              <p className="text-blue-200 text-xs text-center">
                © 2025 ExportAgent
              </p>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-4 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
          <Footer />
        </main>
      </div>
      {/* <CrispChat /> */}
      {showOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} user={user} />
      )}
    </div>
  );
}
