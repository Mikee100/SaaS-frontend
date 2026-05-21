'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Send,
  User,
  Copy,
  Menu,
  Check,
  Download,
  BarChart3,
  Sparkles,
  TrendingUp,
  Package,
  Users,
  ChevronRight,
  PieChart,
  Plus,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useUser } from '@/components/UserContext';
import { useTenant } from '@/hooks/useTenant';
import { apiGet, apiPost } from '@/utils/api';
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
          <div key={index} className="mb-4 bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
            <h4 className="text-base font-semibold text-gray-900 mb-2">{title}</h4>
            {rest && <p className="text-[15px] text-gray-600 leading-relaxed">{rest}</p>}
          </div>
        );
      }
    }
    // Handle bullet points with better styling
    else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.substring(2).trim();
      const hasBold = content.includes('**');
      const parts = content.split(/(\*\*.*?\*\*)/g);

      currentSection.push(
        <div key={index} className="flex items-start gap-3 mb-2.5 pl-2">
          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500/60 flex-shrink-0" />
          <div className="flex-1 text-[15px] text-gray-700 leading-relaxed">
            {hasBold ? (
              parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
              })
            ) : content}
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
          <div key={index} className="flex items-start gap-3 mb-2.5 pl-1">
            <span className="text-indigo-600 font-semibold text-[15px] min-w-[20px] pt-0.5">{num}.</span>
            <div className="flex-1 text-[15px] text-gray-700 leading-relaxed">
              {hasBold ? (
                parts.map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                  }
                  return <span key={i}>{part}</span>;
                })
              ) : content}
            </div>
          </div>
        );
      }
    }
    // Handle section headers
    else if (trimmed.startsWith('##')) {
      if (currentSection.length > 0) {
        elements.push(<div key={`section-before-${index}`} className="mb-5">{currentSection}</div>);
        currentSection = [];
      }
      const isH3 = trimmed.startsWith('###');
      const text = isH3 ? trimmed.substring(3).trim() : trimmed.substring(2).trim();
      elements.push(
        <h3 key={index} className={`font-semibold text-gray-900 mt-6 mb-4 tracking-tight ${isH3 ? 'text-lg' : 'text-xl'}`}>
          {text}
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
        currentSection.push(<div key={`spacer-${index}`} className="h-3" />);
      }
    }
    // Handle regular paragraphs
    else {
      const hasBold = trimmed.includes('**');
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);

      currentSection.push(
        <p key={index} className="text-[15px] text-gray-700 leading-relaxed mb-3">
          {hasBold ? (
            parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
              }
              return <span key={i}>{part}</span>;
            })
          ) : trimmed}
        </p>
      );
    }
  });

  if (currentSection.length > 0) {
    elements.push(<div key="final-section" className="mb-2">{currentSection}</div>);
  }

  return elements;
};

const INITIAL_SUGGESTIONS = [
  { icon: TrendingUp, title: 'Sales Trends', prompt: 'Show me the sales trend this year' },
  { icon: BarChart3, title: 'Revenue Report', prompt: 'Generate a sales report for the last 30 days' },
  { icon: Package, title: 'Inventory Check', prompt: 'Which products are low on stock?' },
  { icon: Users, title: 'Top Customers', prompt: 'Show me my top 10 customers' },
  { icon: CreditCard, title: 'Creditors & Suppliers', prompt: 'Tell me about our suppliers and outstanding creditors' },
  { icon: Receipt, title: 'Business Expenses', prompt: 'Show me the business expenses breakdown' },
];

export default function AIChatPage() {
  const router = useRouter();
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
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const data = await apiGet<{ conversations: Conversation[] }>(
        '/ai/conversations',
        headers
      );
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const data = await apiGet<{ conversation?: any }>(
        `/ai/conversations/${conversationId}`,
        headers
      );
      if (data.conversation?.interactions) {
        const loadedMessages = data.conversation.interactions
          .map((interaction: any) => ({
            role: 'user' as const,
            content: interaction.userMessage,
            timestamp: new Date(interaction.createdAt),
            id: interaction.id,
          }))
          .concat(
            data.conversation.interactions.map((interaction: any) => ({
              role: 'assistant' as const,
              content: interaction.aiResponse,
              category: interaction.metadata?.category,
              timestamp: new Date(interaction.createdAt),
              id: interaction.id + '-ai',
            }))
          )
          .sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const data = await apiPost<{ conversation: Conversation }>(
        '/ai/conversations',
        {},
        headers
      );
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
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const createData = await apiPost<{ conversation: Conversation }>(
          '/ai/conversations',
          {},
          headers
        );
        conversationId = createData.conversation.id;
        setCurrentConversationId(conversationId);
        setConversations(prev => [createData.conversation, ...prev]);
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const data = await apiPost<{
        response: string;
        category: string;
        suggestions?: string[];
        chartData?: any;
        reportData?: any;
      }>(
        '/ai/chat',
        {
          message: currentInput,
          conversationId,
        },
        headers
      );
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

  if (!user) return null;

  const hasAIPermission = user.isSuperadmin || user.roles?.includes('owner') || user.roles?.includes('admin') || user.permissions?.includes('use_ai_assistant');

  if (!hasAIPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Bot className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 max-w-md mb-8">
          You don't have permission to use the AI Assistant. Please contact your administrator to request access.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-black transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-full bg-white transition-all duration-300">
      {/* Sidebar - Integrated & Simple */}
      {sidebarOpen && (
        <div className="w-[280px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">History</h2>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
              <Menu className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <button 
              onClick={createNewConversation}
              className="w-full flex items-center gap-2 justify-center px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6 custom-scrollbar space-y-1">
            {conversations.length === 0 && (
              <div className="text-center p-8">
                <p className="text-xs text-gray-400">No chats yet</p>
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 border ${
                  currentConversationId === conv.id 
                    ? 'bg-white border-gray-200 text-indigo-600 font-semibold shadow-sm' 
                    : 'border-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Bot className={`w-4 h-4 flex-shrink-0 ${currentConversationId === conv.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="truncate">{conv.title || 'New Conversation'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white relative min-w-0">
        
        {/* Simple Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="relative">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Adeera Assistant</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-medium text-gray-500">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Conversation Area */}
        <div className="px-4 sm:px-8 py-4">
          <div className="max-w-6xl mx-auto space-y-4">
            
            {/* Simple Empty State */}
            {messages.length <= 1 && (
              <div className="py-12 text-center max-w-2xl mx-auto">
                <div className="mb-8">
                  <div className="inline-block p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100">
                    <Bot className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">How can I help you today?</h2>
                  <p className="text-gray-500 text-sm">Analyze sales, generate reports, or get business advice.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INITIAL_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(sug.prompt)}
                      className="group p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-600 hover:bg-indigo-50/30 transition-all flex flex-col items-start gap-3 text-left"
                    >
                      <div className={`p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:text-indigo-600 group-hover:bg-indigo-100`}>
                        <sug.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">{sug.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sug.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-[95%] lg:max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-white mt-1 ${
                      message.role === 'user' ? 'bg-gray-900' : 'bg-indigo-600'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <div className={`px-4 py-3 rounded-xl border ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white text-gray-800 border-gray-200 shadow-sm'
                      }`}>
                        <div className={`prose prose-sm max-w-none break-words ${message.role === 'user' ? 'text-white' : 'text-gray-700'}`}>
                          {formatMessageContent(message.content)}
                        </div>
                        
                        {/* Simple Chart UI */}
                        {message.chartData && message.role === 'assistant' && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-indigo-600" />
                              {message.chartData.title}
                            </h4>
                            <div className="h-64 w-full">
                              {message.chartData.type === 'line' && <Line data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                              {message.chartData.type === 'bar' && <Bar data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                              {message.chartData.type === 'pie' && <Pie data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                              {message.chartData.type === 'doughnut' && <Doughnut data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                            </div>
                          </div>
                        )}

                        {/* Simple Download Button */}
                        {message.reportData && message.role === 'assistant' && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Download className="w-5 h-5 text-gray-600" />
                              <div>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {message.reportData.reportType.charAt(0).toUpperCase() + message.reportData.reportType.slice(1)} Summary
                                </h4>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">
                                  {message.reportData.format}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!message.reportData) return;
                                try {
                                  const token = localStorage.getItem('token');
                                  const response = await fetch(`/api/ai/reports/download/${message.reportData.filename}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
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
                                } catch (error) { console.error(error); }
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors"
                            >
                              Download
                            </button>
                          </div>
                        )}

                        {/* Simple Suggestions */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                            {message.suggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                onClick={() => setInput(sug)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                                  message.role === 'user'
                                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                    : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-600 hover:text-indigo-600'
                                }`}
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`mt-1 flex items-center gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="text-[10px] text-gray-400 hover:text-indigo-600 font-medium"
                        >
                          {copiedId === message.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Simple Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="bg-gray-100 px-4 py-2 rounded-xl text-xs font-medium text-gray-500 border border-gray-200">
                    Assistant is thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-6" />
          </div>

          {/* Simple Input Bar */}
          <div className="mt-6 mb-10 px-2 sm:px-4">
            <div className="max-w-5xl mx-auto w-full">
              <form 
                onSubmit={handleSubmit} 
                className="relative bg-white border border-gray-300 rounded-xl p-1.5 flex items-center shadow-sm focus-within:border-indigo-600 transition-all"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your business..."
                  className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                    !input.trim() || isLoading
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
