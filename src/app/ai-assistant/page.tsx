'use client';
import { useState } from 'react';
import { FaRobot, FaPaperPlane, FaSpinner, FaLightbulb, FaChartLine, FaBuilding, FaStore, FaBox, FaUsers, FaUser, FaInfoCircle, FaCopy, FaRedo } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/components/UserContext';

const formatMessageContent = (content: string) => {
  // Split by lines
  const lines = content.split('\n');
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      return (
        <div key={index} className="flex items-start space-x-2 ml-4">
          <span className="text-blue-500">•</span>
          <span>{trimmed.substring(2)}</span>
        </div>
      );
    } else if (trimmed.match(/^\d+\./)) {
      return (
        <div key={index} className="flex items-start space-x-2 ml-4">
          <span className="text-blue-500">{trimmed.split('.')[0]}.</span>
          <span>{trimmed.substring(trimmed.indexOf('.') + 1).trim()}</span>
        </div>
      );
    } else if (trimmed === '') {
      return <br key={index} />;
    } else {
      return <div key={index}>{line}</div>;
    }
  });
};

export default function AIChatPage() {
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant',
    content: string,
    category?: string,
    suggestions?: string[],
    timestamp: Date,
    id: string
  }>>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI Assistant. How can I help you today?',
      timestamp: new Date(),
      id: Date.now().toString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [regenerateId, setRegenerateId] = useState<string | null>(null);
  const { user } = useUser();

  const addMessage = (role: 'user' | 'assistant', content: string, category?: string, suggestions?: string[]) => {
    const newMessage = {
      role,
      content,
      category,
      suggestions,
      timestamp: new Date(),
      id: Date.now().toString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Optionally, show a toast or something
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const regenerateResponse = async (messageId: string) => {
    if (!user) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    setRegenerateId(messageId);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: user.id,
          tenantId: user.tenantId,
          branchId: user.branchId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate response');
      }

      const data = await response.json();

      // Update the message
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, content: data.response, category: data.category, suggestions: data.suggestions }
          : m
      ));
    } catch (error) {
      console.error('Error regenerating:', error);
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, content: 'Sorry, failed to regenerate. Please try again.' }
          : m
      ));
    } finally {
      setIsLoading(false);
      setRegenerateId(null);
    }
  };

  const quickActions = [
    {
      label: 'Best Products',
      query: 'What are the best performing products?',
      icon: <FaLightbulb className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
    },
    {
      label: 'Sales Trends',
      query: 'Show me sales trends',
      icon: <FaChartLine className="h-4 w-4" />,
      color: 'bg-green-100 text-green-600 hover:bg-green-200'
    },
    {
      label: 'Business Info',
      query: 'Tell me about my business',
      icon: <FaBuilding className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-600 hover:bg-purple-200'
    },
    {
      label: 'Branch Details',
      query: 'Show me branch information',
      icon: <FaStore className="h-4 w-4" />,
      color: 'bg-amber-100 text-amber-600 hover:bg-amber-200'
    },
    {
      label: 'Inventory Status',
      query: 'Check inventory status',
      icon: <FaBox className="h-4 w-4" />,
      color: 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
    },
    {
      label: 'Customer Insights',
      query: 'Show customer insights',
      icon: <FaUsers className="h-4 w-4" />,
      color: 'bg-rose-100 text-rose-600 hover:bg-rose-200'
    },
    {
      label: 'User Information',
      query: 'Show user information',
      icon: <FaUser className="h-4 w-4" />,
      color: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
    },
    {
      label: 'Operational Data',
      query: 'Show operational overview',
      icon: <FaInfoCircle className="h-4 w-4" />,
      color: 'bg-teal-100 text-teal-600 hover:bg-teal-200'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    addMessage('user', input);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: currentInput,
          userId: user.id,
          tenantId: user.tenantId,
          branchId: user.branchId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      addMessage('assistant', data.response, data.category, data.suggestions);
    } catch (error) {
      console.error('Error:', error);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has permission to access AI Assistant
  // Temporarily disabled permission check for Basic plan access
  // if (!hasPermission(user, 'use_ai_assistant')) {
  //   return (
  //     <div className="flex items-center justify-center h-screen bg-gray-50">
  //       <div className="text-center p-8 bg-white rounded-lg shadow-md">
  //         <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
  //         <p className="text-gray-600">
  //           You don't have permission to access the AI Assistant. Please contact your administrator.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header and Quick Actions */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
              <p className="text-xs text-gray-500">
                Ask me anything about your business data
              </p>
            </div>
            <div className="flex space-x-1 overflow-x-auto">
              {quickActions.slice(0, 4).map((action, index) => (
                <motion.button
                  key={index}
                  onClick={() => setInput(action.query)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-shrink-0 flex items-center space-x-1 px-2 py-1 rounded-md transition-all duration-200 ${action.color} hover:shadow-sm`}
                  disabled={isLoading}
                >
                  <div className="p-0.5 rounded-full bg-white/50">
                    {action.icon}
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </header>



      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-3xl shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-200'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    {message.role === 'assistant' ? (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FaRobot className="h-5 w-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <FaUser className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {message.category && (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {message.category}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <FaCopy className="h-3 w-3" />
                          </Button>
                          {message.role === 'assistant' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => regenerateResponse(message.id)}
                              disabled={isLoading && regenerateId === message.id}
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                            >
                              <FaRedo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-line">
                        {formatMessageContent(message.content)}
                      </div>
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-500">Try asking:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() => setInput(suggestion)}
                                className="text-xs h-7"
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FaRobot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <FaSpinner className="h-4 w-4 text-blue-600" />
                    </motion.div>
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your business..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6"
          >
            <FaPaperPlane className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
