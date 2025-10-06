import { useState } from 'react';
import { Package, Search, Truck, Ship, Plane, CheckCircle, Loader } from 'lucide-react';

export default function ShipmentTracker() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setLoading(true);
    setError('');
    setTrackingData(null);

    try {
      const response = await fetch('/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim() }),
      });

      if (!response.ok) throw new Error('Failed to track shipment');

      const data = await response.json();
      setTrackingData(data);
    } catch (err) {
      setError('Unable to track shipment. Please check your tracking number and try again.');
    } finally {
      setLoading(false);
    }
  };

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

      {loading && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Tracking your shipment...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {trackingData && !loading && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tracking: {trackingData.trackingNumber}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Estimated Delivery: {trackingData.estimatedDelivery}
            </p>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="font-semibold text-gray-900">Current Status</p>
            <p className="text-blue-800 mt-1">{trackingData.status}</p>
            <p className="text-sm text-gray-600 mt-1">Location: {trackingData.location}</p>
          </div>

          <h4 className="font-semibold text-gray-900 mb-4">Shipment History</h4>
          <div className="space-y-4">
            {trackingData.updates?.map((update, index) => (
              <div key={index} className="flex items-start border-l-2 border-blue-600 pl-4 py-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{update.event}</p>
                  <p className="text-sm text-gray-600 mt-1">{update.date}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ))}
          </div>

          {trackingData.message && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{trackingData.message}</p>
            </div>
          )}
        </div>
      )}

      {!trackingData && !loading && !error && (
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
