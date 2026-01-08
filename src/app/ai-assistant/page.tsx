'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  FaRobot, 
  FaPaperPlane, 
  FaSpinner, 
  FaUser, 
  FaCopy, 
  FaBars, 
  FaCheck,
  FaDownload,
  FaChartLine
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useUser } from '@/components/UserContext';
import { useTenant } from '@/hooks/useTenant';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Conversation {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  category?: string;
  suggestions?: string[];
  timestamp: Date;
  id: string;
  chartData?: any;
  reportData?: {
    filename: string;
    downloadUrl: string;
    reportType: string;
    format: string;
  };
}

const formatMessageContent = (content: string) => {
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let currentSection: React.ReactElement[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Handle numbered sections with bold titles (e.g., "1. **Title**:")
    if (trimmed.match(/^\d+\.\s*\*\*/)) {
      if (currentSection.length > 0) {
        elements.push(<div key={`section-${index}`} className="mb-4">{currentSection}</div>);
        currentSection = [];
      }
      const match = trimmed.match(/^\d+\.\s*\*\*(.+?)\*\*:?\s*(.*)/);
      if (match) {
        const title = match[1];
        const rest = match[2];
        currentSection.push(
          <div key={index} className="mb-3">
            <h4 className="text-base font-bold text-gray-900 mb-2">{title}</h4>
            {rest && <p className="text-sm text-gray-700 leading-relaxed">{rest}</p>}
          </div>
        );
      }
    }
    // Handle bullet points with better styling
    else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.substring(2).trim();
      // Check if it contains bold text or numbers
      const hasBold = content.includes('**');
      const parts = content.split(/(\*\*.*?\*\*)/g);
      
      currentSection.push(
        <div key={index} className="flex items-start space-x-3 mb-2 pl-1">
          <span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
          <div className="flex-1 text-sm text-gray-700 leading-relaxed">
            {hasBold ? (
              parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
              })
            ) : (
              content
            )}
          </div>
        </div>
      );
    }
    // Handle numbered lists
    else if (trimmed.match(/^\d+\./)) {
      const numMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
      if (numMatch) {
        const num = numMatch[1];
        const content = numMatch[2];
        const hasBold = content.includes('**');
        const parts = content.split(/(\*\*.*?\*\*)/g);
        
        currentSection.push(
          <div key={index} className="flex items-start space-x-3 mb-2">
            <span className="text-blue-600 font-bold text-sm flex-shrink-0 min-w-[24px]">{num}.</span>
            <div className="flex-1 text-sm text-gray-700 leading-relaxed">
              {hasBold ? (
                parts.map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                  }
                  return <span key={i}>{part}</span>;
                })
              ) : (
                content
              )}
            </div>
          </div>
        );
      }
    }
    // Handle section headers
    else if (trimmed.startsWith('##')) {
      if (currentSection.length > 0) {
        elements.push(<div key={`section-before-${index}`} className="mb-4">{currentSection}</div>);
        currentSection = [];
      }
      elements.push(
        <h3 key={index} className="text-lg font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200">
          {trimmed.substring(2).trim()}
        </h3>
      );
    }
    else if (trimmed.startsWith('###')) {
      if (currentSection.length > 0) {
        elements.push(<div key={`section-before-${index}`} className="mb-4">{currentSection}</div>);
        currentSection = [];
      }
      elements.push(
        <h4 key={index} className="text-base font-semibold text-gray-800 mt-4 mb-2">
          {trimmed.substring(3).trim()}
        </h4>
      );
    }
    // Handle "Actionable Insights" or similar sections
    else if (trimmed.includes('Actionable Insights') || trimmed.includes('Insights') || trimmed.includes('Summary')) {
      if (currentSection.length > 0) {
        elements.push(<div key={`section-before-${index}`} className="mb-4">{currentSection}</div>);
        currentSection = [];
      }
      elements.push(
        <div key={index} className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-base font-bold text-gray-900 mb-3">{trimmed}</h4>
        </div>
      );
    }
    // Handle empty lines
    else if (trimmed === '') {
      if (currentSection.length > 0 && index < lines.length - 1) {
        // Only add spacing if there's content after
        currentSection.push(<div key={`spacer-${index}`} className="h-2" />);
      }
    }
    // Handle regular paragraphs
    else {
      // Check for bold text in paragraphs
      const hasBold = trimmed.includes('**');
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      
      currentSection.push(
        <p key={index} className="text-sm text-gray-700 leading-relaxed mb-2">
          {hasBold ? (
            parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
              }
              return <span key={i}>{part}</span>;
            })
          ) : (
            trimmed
          )}
        </p>
      );
    }
  });

  // Add any remaining section
  if (currentSection.length > 0) {
    elements.push(<div key="final-section" className="mb-4">{currentSection}</div>);
  }

  return elements;
};

export default function AIChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { data: tenant } = useTenant();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    } else {
      const businessName = tenant?.name || 'your business';
      const greeting = `Hello! 👋 Welcome to ${businessName}'s AI Assistant. I'm here to help you understand your business better. I can answer questions about your sales performance, product analytics, inventory levels, customer insights, and much more. What would you like to know about ${businessName}?`;
      
      setMessages([{
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
        id: Date.now().toString()
      }]);
    }
  }, [currentConversationId, tenant]);

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.conversation?.interactions) {
          const loadedMessages = data.conversation.interactions.map((interaction: any) => ({
            role: 'user' as const,
            content: interaction.userMessage,
            timestamp: new Date(interaction.createdAt),
            id: interaction.id
          })).concat(
            data.conversation.interactions.map((interaction: any) => ({
              role: 'assistant' as const,
              content: interaction.aiResponse,
              category: interaction.metadata?.category,
              timestamp: new Date(interaction.createdAt),
              id: interaction.id + '-ai'
            }))
          ).sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(loadedMessages);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(prev => [data.conversation, ...prev]);
        setCurrentConversationId(data.conversation.id);
        setSidebarOpen(false);
        const businessName = tenant?.name || 'your business';
        const greeting = `Hello! 👋 Welcome to ${businessName}'s AI Assistant. I'm here to help you understand your business better. I can answer questions about your sales performance, product analytics, inventory levels, customer insights, and much more. What would you like to know about ${businessName}?`;
        setMessages([{
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
          id: Date.now().toString()
        }]);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const addMessage = (
    role: 'user' | 'assistant',
    content: string,
    category?: string,
    suggestions?: string[],
    chartData?: any,
    reportData?: any
  ) => {
    const newMessage: Message = {
      role,
      content,
      category,
      suggestions,
      timestamp: new Date(),
      id: Date.now().toString(),
      chartData,
      reportData,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    addMessage('user', input);
    const currentInput = input;
    const wasFirstMessage = messages.length === 0;
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      let conversationId = currentConversationId;

      if (!conversationId) {
        const createResponse = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });
        if (createResponse.ok) {
          const createData = await createResponse.json();
          conversationId = createData.conversation.id;
          setCurrentConversationId(conversationId);
          setConversations(prev => [createData.conversation, ...prev]);
        }
      }

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
          branchId: user.branchId,
          conversationId: conversationId
        })
      });

      if (!response.ok) throw new Error('Failed to get response from AI');

      const data = await response.json();
      addMessage(
        'assistant',
        data.response,
        data.category,
        data.suggestions,
        data.chartData,
        data.reportData
      );
    } catch (error) {
      console.error('Error:', error);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Minimal Sidebar - Hidden by default, show on mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed inset-y-0 left-0 z-50 w-70 bg-white border-r border-gray-200 lg:hidden"
          >
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Conversations</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-1">
                <FaBars className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)] p-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    setSidebarOpen(false);
                  }}
                  className={`p-2 mb-1 rounded text-xs cursor-pointer ${
                    currentConversationId === conv.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {conv.title || 'New Conversation'}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area - Maximized */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Header */}
        <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded"
            >
              <FaBars className="h-4 w-4 text-gray-600" />
            </button>
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <FaRobot className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="text-sm font-semibold text-gray-900">AI Assistant</h1>
          </div>
        </header>

        {/* Chat Container - Maximized */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-4xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Small Avatar */}
                  <div className={`flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-blue-500'
                      : 'bg-purple-500'
                  }`}>
                    {message.role === 'assistant' ? (
                      <FaRobot className="h-3 w-3 text-white" />
                    ) : (
                      <FaUser className="h-3 w-3 text-white" />
                    )}
                  </div>

                  {/* Message Bubble - Enhanced */}
                  <div className={`flex-1 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs ${
                          message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className={`p-1.5 rounded hover:bg-opacity-20 transition-colors ${
                            message.role === 'user' ? 'text-white/70 hover:bg-white/20' : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {copiedId === message.id ? (
                            <FaCheck className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <FaCopy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <div className={`prose prose-sm max-w-none ${
                        message.role === 'user' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {formatMessageContent(message.content)}
                      </div>
                      
                      {/* Chart Display */}
                      {message.chartData && message.role === 'assistant' && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FaChartLine className="h-4 w-4" />
                            {message.chartData.title}
                          </h4>
                          <div className="h-64">
                            {message.chartData.type === 'line' && (
                              <Line
                                data={message.chartData.data}
                                options={{
                                  ...message.chartData.options,
                                  responsive: true,
                                  maintainAspectRatio: false,
                                }}
                              />
                            )}
                            {message.chartData.type === 'bar' && (
                              <Bar
                                data={message.chartData.data}
                                options={{
                                  ...message.chartData.options,
                                  responsive: true,
                                  maintainAspectRatio: false,
                                }}
                              />
                            )}
                            {message.chartData.type === 'pie' && (
                              <Pie
                                data={message.chartData.data}
                                options={{
                                  ...message.chartData.options,
                                  responsive: true,
                                  maintainAspectRatio: false,
                                }}
                              />
                            )}
                            {message.chartData.type === 'doughnut' && (
                              <Doughnut
                                data={message.chartData.data}
                                options={{
                                  ...message.chartData.options,
                                  responsive: true,
                                  maintainAspectRatio: false,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Report Download */}
                      {message.reportData && message.role === 'assistant' && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                                Report Ready for Download
                              </h4>
                              <p className="text-xs text-blue-700">
                                {message.reportData.reportType.charAt(0).toUpperCase() + message.reportData.reportType.slice(1)} Report • {message.reportData.format.toUpperCase()}
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                if (!message.reportData) return;
                                try {
                                  const token = localStorage.getItem('token');
                                  const response = await fetch(
                                    `/api/ai/reports/download/${message.reportData.filename}`,
                                    {
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                      },
                                    }
                                  );
                                  if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = message.reportData.filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  }
                                } catch (error) {
                                  console.error('Error downloading report:', error);
                                }
                              }}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <FaDownload className="h-3.5 w-3.5" />
                              Download
                            </button>
                          </div>
                        </div>
                      )}

                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200/30">
                          <div className="flex flex-wrap gap-1.5">
                            {message.suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => setInput(suggestion)}
                                className={`px-2 py-1 text-xs rounded ${
                                  message.role === 'user'
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Compact Loading */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-purple-500 flex items-center justify-center">
                  <FaRobot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <FaSpinner className="h-3.5 w-3.5 text-blue-600" />
                    </motion.div>
                    <span className="text-xs text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compact Input Area */}
        <div className="border-t border-gray-200 bg-white px-3 py-2">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your business..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !input.trim() || isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <FaPaperPlane className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
