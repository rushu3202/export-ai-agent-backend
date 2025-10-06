import { useState } from 'react';
import { Package, Search, Truck, Ship, Plane, CheckCircle } from 'lucide-react';

export default function ShipmentTracker() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleTrack = (e) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      setShowResults(true);
    }
  };

  const demoStatus = [
    { status: 'Order Placed', completed: true, icon: CheckCircle, date: '2024-01-15' },
    { status: 'Picked Up', completed: true, icon: Package, date: '2024-01-16' },
    { status: 'In Transit', completed: true, icon: Truck, date: '2024-01-18' },
    { status: 'At Port', completed: false, icon: Ship, date: 'Est. 2024-01-25' },
    { status: 'Out for Delivery', completed: false, icon: Truck, date: 'Est. 2024-01-30' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shipment Tracker</h1>
        <p className="mt-2 text-gray-600">
          Track your international shipments in real-time
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <form onSubmit={handleTrack} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number (e.g., SHIP123456)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center"
          >
            <Search className="w-5 h-5 mr-2" />
            Track Shipment
          </button>
        </form>
      </div>

      {showResults && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tracking: {trackingNumber}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Estimated Delivery: January 30, 2024
            </p>
          </div>

          <div className="space-y-6">
            {demoStatus.map((item, index) => (
              <div key={index} className="flex items-start">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  item.completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <item.icon className={`w-6 h-6 ${item.completed ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className={`font-semibold ${item.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                    {item.status}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{item.date}</p>
                </div>
                <div>
                  {item.completed && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Shipment Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Origin</p>
                <p className="font-medium">Mumbai, India</p>
              </div>
              <div>
                <p className="text-gray-600">Destination</p>
                <p className="font-medium">New York, USA</p>
              </div>
              <div>
                <p className="text-gray-600">Carrier</p>
                <p className="font-medium">Global Shipping Inc.</p>
              </div>
              <div>
                <p className="text-gray-600">Service Type</p>
                <p className="font-medium">Ocean Freight</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500 text-center">
            Note: This is a demo. Real-time tracking will be available soon.
          </p>
        </div>
      )}

      {!showResults && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
          <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Enter a tracking number to get started</h3>
          <p className="text-gray-600">
            We'll show you real-time updates on your shipment's journey
          </p>
        </div>
      )}
    </div>
  );
}
