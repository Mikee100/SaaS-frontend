'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  History,
  TrendingUp,
  BarChart3,
  Package,
  Users,
  CreditCard,
  Receipt,
  Wallet,
  UtensilsCrossed,
  Target,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { useTenant } from '@/hooks/useTenant';
import { apiGet, apiPost } from '@/utils/api';
import API_BASE_URL from '@/config/apiConfig';
import { streamChat } from './lib/streamChat';
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
import ChatMessage, { Message } from './components/ChatMessage';
import ConversationHistoryDrawer, { Conversation } from './components/ConversationHistoryDrawer';
import ChatComposer from './components/ChatComposer';

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

const INITIAL_SUGGESTIONS = [
  { icon: TrendingUp, title: 'Sales Trends', prompt: 'Show me the sales trend this year' },
  { icon: BarChart3, title: 'Revenue Report', prompt: 'Generate a sales report for the last 30 days' },
  { icon: Package, title: 'Inventory Check', prompt: 'Which products are low on stock?' },
  { icon: Users, title: 'Top Customers', prompt: 'Show me my top 10 customers' },
  { icon: CreditCard, title: 'Creditors & Suppliers', prompt: 'Tell me about our suppliers and outstanding creditors' },
  { icon: Receipt, title: 'Business Expenses', prompt: 'Show me the business expenses breakdown' },
  { icon: Wallet, title: 'Payroll', prompt: 'How much are we spending on payroll this month?' },
  { icon: UtensilsCrossed, title: 'Restaurant Ops', prompt: 'Which tables are occupied right now?' },
  { icon: Target, title: 'Sales Targets', prompt: 'Are we hitting this month’s sales target?' },
];

const TOOL_LOADING_LABELS: Record<string, string> = {
  generate_chart: 'Generating chart...',
  generate_report: 'Generating report...',
  update_inventory: 'Updating inventory...',
  initiate_backup: 'Running backup...',
  get_system_status: 'Checking system status...',
};

export default function AIChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Assistant is thinking...');
  const [historyOpen, setHistoryOpen] = useState(false);
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
      setMessages([greetingMessage(tenant?.name)]);
    }
  }, [currentConversationId, tenant]);

  const greetingMessage = (businessName?: string): Message => {
    const name = businessName || 'your business';
    return {
      role: 'assistant',
      content: `Hello! 👋 Welcome to ${name}'s AI Assistant. I'm here to help you understand your business better. I can answer questions about your sales performance, product analytics, inventory levels, customer insights, payroll, restaurant operations, sales targets, and much more. What would you like to know about ${name}?`,
      timestamp: new Date(),
      id: Date.now().toString(),
    };
  };

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
      setHistoryOpen(false);
      setMessages([greetingMessage(tenant?.name)]);
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
    const wasNewConversation = !currentConversationId;
    setInput('');
    setIsLoading(true);
    setLoadingLabel('Assistant is thinking...');

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: '', timestamp: new Date(), id: assistantId },
    ]);

    const updateAssistantMessage = (updates: Partial<Message>) => {
      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, ...updates } : m))
      );
    };

    try {
      const token = localStorage.getItem('token');
      for await (const event of streamChat({
        apiBaseUrl: API_BASE_URL,
        message: currentInput,
        conversationId: currentConversationId,
        token,
      })) {
        if (event.type === 'text') {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: m.content + event.delta } : m
            )
          );
        } else if (event.type === 'toolCall') {
          setLoadingLabel(TOOL_LOADING_LABELS[event.name] || 'Working on it...');
        } else if (event.type === 'final') {
          updateAssistantMessage({
            category: event.category,
            suggestions: event.suggestions,
            chartData: event.chartData,
            reportData: event.reportData,
          });
          if (event.conversationId) {
            setCurrentConversationId(event.conversationId);
          }
          if (wasNewConversation) {
            loadConversations();
          }
        } else if (event.type === 'error') {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId && !m.content
                ? { ...m, content: event.message }
                : m
            )
          );
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId && !m.content
            ? { ...m, content: 'Sorry, I encountered an error. Please try again later.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadReport = async (reportData: NonNullable<Message['reportData']>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai/reports/download/${reportData.filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = reportData.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) return null;

  const hasAIPermission = user.isSuperadmin || user.roles?.includes('owner') || user.roles?.includes('admin') || user.permissions?.includes('use_ai_assistant');

  if (!hasAIPermission) {
    return (
      <div className="adeera-page flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div
          className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--adeera-danger-soft)' }}
        >
          <Bot className="h-7 w-7 text-(--adeera-danger)" />
        </div>
        <h1 className="mb-1 text-lg font-semibold text-(--adeera-text)">Access Denied</h1>
        <p className="mb-4 max-w-md text-sm text-(--adeera-text-muted)">
          You don't have permission to use the AI Assistant. Please contact your administrator to request access.
        </p>
        <button
          onClick={() => router.push('/')}
          className="rounded px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--adeera-accent)' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="adeera-page flex min-h-screen flex-col">
      <ConversationHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelect={(id) => {
          setCurrentConversationId(id);
          setHistoryOpen(false);
        }}
        onNewChat={createNewConversation}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex flex-shrink-0 items-center justify-between border-b px-3 py-2.5 sm:px-4"
          style={{ borderColor: 'var(--adeera-border)', background: 'var(--adeera-surface)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'var(--adeera-accent)' }}
            >
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight text-(--adeera-text)">AI Assistant</h1>
              <span className="text-[10px] text-(--adeera-text-muted)">Online</span>
            </div>
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-(--adeera-text-muted) transition-colors hover:bg-(--adeera-surface-muted) hover:text-(--adeera-text)"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>
        </header>

        {/* Conversation Area */}
        <div className="flex flex-1 flex-col px-2 py-2 sm:px-3">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-3">
            {messages.length <= 1 && (
              <div className="mx-auto max-w-4xl py-5">
                <div className="mb-4 text-left">
                  <div
                    className="mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-1"
                    style={{ borderColor: 'var(--adeera-border)', background: 'var(--adeera-surface-muted)' }}
                  >
                    <Bot className="h-4 w-4 text-(--adeera-text-muted)" />
                    <span className="text-xs font-medium text-(--adeera-text-muted)">Quick prompts</span>
                  </div>
                  <h2 className="mb-1 text-base font-semibold text-(--adeera-text)">What do you want to check?</h2>
                  <p className="text-xs text-(--adeera-text-muted)">
                    Sales, inventory, customers, suppliers, expenses, payroll, and more.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {INITIAL_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(sug.prompt)}
                      className="adeera-card adeera-card-interactive group flex items-start gap-2 px-2.5 py-2 text-left"
                    >
                      <div
                        className="rounded p-1.5"
                        style={{ background: 'var(--adeera-accent-soft)', color: 'var(--adeera-accent)' }}
                      >
                        <sug.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-semibold text-(--adeera-text)">{sug.title}</h4>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-(--adeera-text-muted)">{sug.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pb-2">
              {messages
                .filter((message) => message.content || message.chartData || message.reportData)
                .map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                    onSuggestionClick={setInput}
                    onDownloadReport={handleDownloadReport}
                  />
                ))}
            </div>

            {isLoading && !messages[messages.length - 1]?.content && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{ background: 'var(--adeera-surface-muted)' }}
                  >
                    <Bot className="h-3.5 w-3.5 text-(--adeera-text-muted)" />
                  </div>
                  <div
                    className="rounded-md border px-2.5 py-1.5 text-[11px] font-medium text-(--adeera-text-muted)"
                    style={{ borderColor: 'var(--adeera-border)', background: 'var(--adeera-surface-muted)' }}
                  >
                    {loadingLabel}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </div>

        <div className="px-2 sm:px-3">
          <ChatComposer input={input} setInput={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
