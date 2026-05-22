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
  TrendingUp,
  Package,
  Users,
  Plus,
  CreditCard,
  Receipt,
} from 'lucide-react';
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
        elements.push(<div key={`section-${index}`} className="mb-2">{currentSection}</div>);
        currentSection = [];
      }
      const match = trimmed.match(/^\d+\.\s*\*\*(.+?)\*\*:?\s*(.*)/);
      if (match) {
        const title = match[1];
        const rest = match[2];
        currentSection.push(
          <div key={index} className="mb-2 rounded-md border border-gray-200 bg-gray-50 p-2.5">
            <h4 className="mb-1 text-sm font-semibold text-gray-900">{title}</h4>
            {rest && <p className="text-xs text-gray-700 leading-snug">{rest}</p>}
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
        <div key={index} className="mb-1.5 flex items-start gap-2 pl-1">
          <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
          <div className="flex-1 text-xs text-gray-700 leading-snug">
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
          <div key={index} className="mb-1.5 flex items-start gap-2 pl-1">
            <span className="min-w-[18px] pt-0.5 text-xs font-semibold text-gray-700">{num}.</span>
            <div className="flex-1 text-xs text-gray-700 leading-snug">
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
        elements.push(<div key={`section-before-${index}`} className="mb-2.5">{currentSection}</div>);
        currentSection = [];
      }
      const isH3 = trimmed.startsWith('###');
      const text = isH3 ? trimmed.substring(3).trim() : trimmed.substring(2).trim();
      elements.push(
        <h3 key={index} className={`mt-3 mb-2 font-semibold tracking-tight text-gray-900 ${isH3 ? 'text-sm' : 'text-base'}`}>
          {text}
        </h3>
      );
    }
    else if (trimmed.startsWith('###')) {
      if (currentSection.length > 0) {
        elements.push(<div key={`section-before-${index}`} className="mb-2">{currentSection}</div>);
        currentSection = [];
      }
      elements.push(
        <h4 key={index} className="mt-2 mb-1 text-sm font-semibold text-gray-800">
          {trimmed.substring(3).trim()}
        </h4>
      );
    }
    // Handle "Actionable Insights" or similar sections
    else if (trimmed.includes('Actionable Insights') || trimmed.includes('Insights') || trimmed.includes('Summary')) {
      if (currentSection.length > 0) {
        elements.push(<div key={`section-before-${index}`} className="mb-2">{currentSection}</div>);
        currentSection = [];
      }
      elements.push(
        <div key={index} className="mt-3 border-t border-gray-200 pt-2">
          <h4 className="mb-1 text-sm font-semibold text-gray-900">{trimmed}</h4>
        </div>
      );
    }
    // Handle empty lines
    else if (trimmed === '') {
      if (currentSection.length > 0 && index < lines.length - 1) {
        currentSection.push(<div key={`spacer-${index}`} className="h-1.5" />);
      }
    }
    // Handle regular paragraphs
    else {
      const hasBold = trimmed.includes('**');
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);

      currentSection.push(
        <p key={index} className="mb-1.5 text-xs leading-snug text-gray-700">
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
    elements.push(<div key="final-section" className="mb-1">{currentSection}</div>);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <Bot className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="mb-1 text-lg font-semibold text-gray-900">Access Denied</h1>
        <p className="mb-4 max-w-md text-sm text-gray-600">
          You don't have permission to use the AI Assistant. Please contact your administrator to request access.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="rounded px-4 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-black transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-white lg:flex-row">
      {/* Sidebar - Integrated & Simple */}
      {sidebarOpen && (
        <div className="flex w-[250px] flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">History</h2>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
              <Menu className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <button 
              onClick={createNewConversation}
              className="flex w-full items-center justify-center gap-2 rounded px-3 py-2 text-xs font-medium text-white transition-all bg-gray-900 hover:bg-black"
            >
              <Plus className="h-3 w-3" /> New Chat
            </button>
          </div>
          <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-3">
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
                className={`flex w-full items-center gap-2 border px-3 py-2 text-left text-xs transition-all rounded ${
                  currentConversationId === conv.id 
                    ? 'bg-white border-gray-200 text-gray-900 font-semibold' 
                    : 'border-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Bot className={`h-3 w-3 flex-shrink-0 ${currentConversationId === conv.id ? 'text-gray-900' : 'text-gray-400'}`} />
                <span className="truncate">{conv.title || 'New Conversation'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-white">
        
        {/* Simple Header */}
        <header className="sticky top-0 z-20 flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight text-gray-900">Adeera Assistant</h1>
              <span className="text-[10px] text-gray-500">Online</span>
            </div>
          </div>
        </header>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto px-2 py-2 sm:px-3">
          <div className="mx-auto max-w-5xl space-y-3">
            
            {/* Simple Empty State */}
            {messages.length <= 1 && (
              <div className="mx-auto max-w-4xl py-5">
                <div className="mb-4 text-left">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                    <Bot className="h-4 w-4 text-gray-700" />
                    <span className="text-xs font-medium text-gray-700">Quick prompts</span>
                  </div>
                  <h2 className="mb-1 text-base font-semibold text-gray-900">What do you want to check?</h2>
                  <p className="text-xs text-gray-600">Sales, inventory, customers, suppliers, and expenses.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {INITIAL_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(sug.prompt)}
                      className="group flex items-start gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-left transition-colors hover:border-gray-400 hover:bg-gray-50"
                    >
                      <div className="rounded bg-gray-100 p-1.5 text-gray-600 group-hover:bg-gray-200 group-hover:text-gray-700">
                        <sug.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-semibold text-gray-900">{sug.title}</h4>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-600">{sug.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pb-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[96%] items-start gap-2 lg:max-w-[84%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-white ${
                      message.role === 'user' ? 'bg-gray-900' : 'bg-gray-700'
                    }`}>
                      {message.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>

                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div className={`rounded-md border px-2.5 py-2 ${
                        message.role === 'user'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-800 border-gray-200'
                      }`}>
                        <div className={`prose prose-sm max-w-none break-words ${message.role === 'user' ? 'text-white' : 'text-gray-700'}`}>
                          {formatMessageContent(message.content)}
                        </div>
                        
                        {/* Simple Chart UI */}
                        {message.chartData && message.role === 'assistant' && (
                          <div className="mt-2 rounded-md border border-gray-200 bg-white p-2">
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                              <BarChart3 className="h-3.5 w-3.5 text-gray-600" />
                              {message.chartData.title}
                            </h4>
                            <div className="h-56 w-full">
                              {message.chartData.type === 'line' && <Line data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                              {message.chartData.type === 'bar' && <Bar data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                              {message.chartData.type === 'pie' && <Pie data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                              {message.chartData.type === 'doughnut' && <Doughnut data={message.chartData.data} options={{...message.chartData.options, responsive: true, maintainAspectRatio: false}} />}
                            </div>
                          </div>
                        )}

                        {/* Simple Download Button */}
                        {message.reportData && message.role === 'assistant' && (
                          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                            <div className="flex items-center gap-2">
                              <Download className="h-4 w-4 text-gray-600" />
                              <div>
                                <h4 className="text-xs font-semibold text-gray-900">
                                  {message.reportData.reportType.charAt(0).toUpperCase() + message.reportData.reportType.slice(1)} Summary
                                </h4>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
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
                              className="rounded bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-black"
                            >
                              Download
                            </button>
                          </div>
                        )}

                        {/* Simple Suggestions */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2">
                            {message.suggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                onClick={() => setInput(sug)}
                                className={`rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                                  message.role === 'user'
                                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:text-gray-900'
                                }`}
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`mt-0.5 flex items-center gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="text-[10px] font-medium text-gray-400 hover:text-gray-700"
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
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100">
                    <Bot className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-500">
                    Assistant is thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Compact Input Bar */}
          <div className="sticky bottom-0 mt-2 border-t border-gray-200 bg-white/95 px-0 py-2 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-5xl">
              <form 
                onSubmit={handleSubmit} 
                className="relative flex items-center rounded-md border border-gray-300 bg-white p-1 focus-within:border-gray-500"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your business..."
                  className="flex-1 bg-transparent px-2 py-1.5 text-xs text-gray-900 outline-none placeholder:text-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    !input.trim() || isLoading
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gray-900 text-white hover:bg-black'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </span>
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
