import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader } from 'lucide-react';

export default function AIChatAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your Export AI Assistant. I can help you with:\n\n• Export procedures and documentation\n• HS code classification\n• Customs compliance\n• Shipping and logistics\n• International trade regulations\n\nWhat would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    'What is an HS code and how do I find it?',
    'What documents do I need for exporting to the EU?',
    'How do I fill out a commercial invoice?',
    'What are the customs clearance procedures?',
    'Tell me about Incoterms',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build conversation history for context
      const history = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          history: history
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-12rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Chat Assistant</h1>
        <p className="mt-2 text-gray-600">
          Ask me anything about export procedures, compliance, and documentation
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg h-[calc(100%-6rem)] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center mb-2">
                    <MessageSquare className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-600">Export AI</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about export procedures, compliance, documentation..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
