import { NavLink, Outlet } from 'react-router-dom';
import { Home, FileText, ClipboardList, MessageSquare, Package, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Invoice Generator', href: '/invoice', icon: FileText },
    { name: 'Export Forms', href: '/export-forms', icon: ClipboardList },
    { name: 'AI Chat Assistant', href: '/chat', icon: MessageSquare },
    { name: 'Shipment Tracker', href: '/shipment', icon: Package },
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
              <p className="text-blue-200 text-xs">
                Powered by AI · v1.0
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
