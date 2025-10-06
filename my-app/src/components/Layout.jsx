import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, FileText, ClipboardList, MessageSquare, Package, Menu, X, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Invoice Generator', href: '/invoice', icon: FileText },
    { name: 'Export Forms', href: '/export-forms', icon: ClipboardList },
    { name: 'AI Chat Assistant', href: '/chat', icon: MessageSquare },
    { name: 'Shipment Tracker', href: '/shipment', icon: Package },
    { name: 'Profile & Billing', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden flex items-center justify-between bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Export AI Agent</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 w-64 h-screen
          transition-transform bg-blue-600 text-white shadow-xl
        `}>
          <div className="h-full flex flex-col">
            <div className="p-6 hidden lg:block">
              <h1 className="text-2xl font-bold">Export AI Agent</h1>
              <p className="text-blue-200 text-sm mt-1">Automate Your Exports</p>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-blue-500">
              {user && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-700 rounded-lg">
                    <User className="w-4 h-4" />
                    <span className="text-sm truncate flex-1">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
              <p className="text-blue-200 text-xs text-center">
                © 2025 Export AI Agent
              </p>
              <p className="text-blue-300 text-xs text-center mt-1">
                Built with ❤️ by Rushaleeben Patel
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

        <main className="flex-1 p-4 lg:p-8">
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
        </main>
      </div>
    </div>
  );
}
