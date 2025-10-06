import { FileText, ClipboardList, MessageSquare, Package, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const features = [
    {
      name: 'Invoice Generator',
      description: 'Generate professional export invoices with HS codes automatically',
      icon: FileText,
      href: '/invoice',
      color: 'bg-blue-500',
    },
    {
      name: 'Export Forms Assistant',
      description: 'AI-guided form filling for shipping bills, packing lists, and more',
      icon: ClipboardList,
      href: '/export-forms',
      color: 'bg-green-500',
    },
    {
      name: 'AI Chat Assistant',
      description: 'Ask questions about export procedures, compliance, and documentation',
      icon: MessageSquare,
      href: '/chat',
      color: 'bg-purple-500',
    },
    {
      name: 'Shipment Tracker',
      description: 'Track your shipments and get real-time updates',
      icon: Package,
      href: '/shipment',
      color: 'bg-orange-500',
    },
  ];

  const stats = [
    { name: 'Invoices Generated', value: '0', icon: FileText },
    { name: 'Forms Completed', value: '0', icon: ClipboardList },
    { name: 'AI Queries', value: '0', icon: MessageSquare },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Export AI Agent</h1>
        <p className="mt-2 text-gray-600">
          Your intelligent assistant for automating export documentation and compliance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.name}
              to={feature.href}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 group"
            >
              <div className="flex items-start">
                <div className={`${feature.color} rounded-lg p-3 text-white`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    {feature.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready to automate your exports?</h3>
            <p className="text-blue-100">
              Start by generating your first invoice or chatting with our AI assistant
            </p>
          </div>
          <Link
            to="/invoice"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
