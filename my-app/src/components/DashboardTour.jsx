import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Sparkles, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabaseClient';

const DashboardTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetBounds, setTargetBounds] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const tourSteps = [
    {
      target: 'stats-section',
      title: '📊 Your Export Dashboard',
      description: 'Track your monthly metrics, top clients, and total export value at a glance. Updated in real-time!',
      aiTip: 'Pro tip: Export value automatically calculates from all your invoices. The more you use ExportAgent, the smarter your insights become!',
      position: 'bottom'
    },
    {
      target: 'ai-insights',
      title: '🤖 AI-Powered Insights',
      description: 'Get intelligent recommendations based on your export patterns and industry trends.',
      aiTip: 'Our AI analyzes your data to suggest the best HS codes, optimal pricing, and compliance tips specific to your business.',
      position: 'bottom',
      optional: true
    },
    {
      target: 'quick-actions',
      title: '⚡ Quick Actions',
      description: 'Generate invoices, find HS codes, or complete export forms with one click.',
      aiTip: 'These shortcuts save you hours! Most users create their first invoice in under 2 minutes using our AI assistant.',
      position: 'top'
    },
    {
      target: 'sidebar',
      title: '🧭 Navigation Menu',
      description: 'Access all features: Invoices, Export Forms, B2B Marketplace, HS Code Finder, and more.',
      aiTip: 'Start with the Invoice Generator to create your first document, then explore the marketplace to connect with global buyers!',
      position: 'right'
    }
  ];

  useEffect(() => {
    const step = tourSteps[currentStep];
    const maxRetries = 10;
    
    const tryGetElement = () => {
      const targetElement = document.getElementById(step.target);
      
      if (targetElement) {
        const bounds = targetElement.getBoundingClientRect();
        setTargetBounds({
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height
        });
        setRetryCount(0);
      } else if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 300);
      } else {
        if (step.optional) {
          handleNext();
        } else {
          setTargetBounds(null);
        }
      }
    };
    
    tryGetElement();
  }, [currentStep, retryCount]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setRetryCount(0);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setRetryCount(0);
    }
  };

  const handleComplete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await axios.post('/api/complete-dashboard-tour', {}, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      setIsVisible(false);
      onComplete();
    } catch (error) {
      console.error('Tour completion error:', error);
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const getTooltipStyle = (position, bounds) => {
    if (!bounds) return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    };
    
    const offset = 16;
    
    switch (position) {
      case 'bottom':
        return {
          top: bounds.top + bounds.height + offset,
          left: bounds.left + bounds.width / 2,
          transform: 'translateX(-50%)'
        };
      case 'top':
        return {
          bottom: window.innerHeight - bounds.top + offset,
          left: bounds.left + bounds.width / 2,
          transform: 'translateX(-50%)'
        };
      case 'right':
        return {
          top: bounds.top + bounds.height / 2,
          left: bounds.left + bounds.width + offset,
          transform: 'translateY(-50%)'
        };
      case 'left':
        return {
          top: bounds.top + bounds.height / 2,
          right: window.innerWidth - bounds.left + offset,
          transform: 'translateY(-50%)'
        };
      default:
        return {
          top: bounds.top + bounds.height + offset,
          left: bounds.left + bounds.width / 2,
          transform: 'translateX(-50%)'
        };
    }
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const elementNotFound = retryCount >= 10 && !targetBounds;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

      {/* Highlight Box */}
      {targetBounds && (
        <div 
          className="fixed z-50 pointer-events-none transition-all duration-500"
          style={{
            top: targetBounds.top - 8,
            left: targetBounds.left - 8,
            width: targetBounds.width + 16,
            height: targetBounds.height + 16,
          }}
        >
          <div className="w-full h-full rounded-2xl border-4 border-blue-500 shadow-2xl shadow-blue-500/50 animate-pulse" />
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="fixed z-50"
          style={getTooltipStyle(step.position, targetBounds)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md border-2 border-blue-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{step.title}</h3>
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                  <span>Step {currentStep + 1} of {tourSteps.length}</span>
                  <div className="flex gap-1">
                    {tourSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full ${idx === currentStep ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <p className="text-gray-700 mb-4">{step.description}</p>

            {/* Element Not Found Warning */}
            {elementNotFound && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This feature is loading. You can skip this step or wait for it to appear.
                </p>
              </div>
            )}

            {/* AI Tip */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-purple-900 mb-1">AI Assistant</div>
                  <p className="text-sm text-purple-800">{step.aiTip}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              {currentStep < tourSteps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Got it!
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default DashboardTour;
