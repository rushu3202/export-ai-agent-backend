import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/profile');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-12 max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
        >
          <CheckCircle className="w-16 h-16 text-white" strokeWidth={3} />
        </motion.div>
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <Sparkles className="w-6 h-6 text-yellow-500" />
        </div>
        
        <p className="text-lg text-gray-700 mb-2">
          Welcome to <span className="font-bold text-primary">ExportAgent Pro</span>
        </p>
        
        <p className="text-sm text-gray-600 mb-8">
          Enjoy unlimited access to all premium features including unlimited invoices, 
          export forms, and advanced AI assistance.
        </p>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-green-800 font-medium">
            Redirecting to your dashboard in 3 seconds...
          </p>
        </div>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-gradient-to-r from-primary to-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}
