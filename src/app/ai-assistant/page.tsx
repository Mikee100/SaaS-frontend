'use client';
import { useState, useEffect } from 'react';
import { FaRobot, FaPaperPlane, FaSpinner, FaLightbulb, FaChartLine, FaBuilding, FaStore, FaUser, FaCopy, FaPlus, FaTrash, FaEdit, FaBars, FaTimes, FaRegCommentDots } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/components/UserContext';

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
}

const formatMessageContent = (content: string) => {
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const { user } = useUser();

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    } else {
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'m your AI Assistant. How can I help you today?',
        timestamp: new Date(),
        id: Date.now().toString()
      }]);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // const data = await response.json();
        setMessages([]);
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
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const updateConversationTitle = async (conversationId: string, title: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });

      if (response.ok) {
        setConversations(prev => prev.map(c =>
          c.id === conversationId ? { ...c, title } : c
        ));
        setEditingTitle(null);
        setNewTitle('');
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string, category?: string, suggestions?: string[]) => {
    const newMessage: Message = {
      role,
      content,
      category,
      suggestions,
      timestamp: new Date(),
      id: Date.now().toString()
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
          conversationId: currentConversationId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      addMessage('assistant', data.response, data.category, data.suggestions);

      // Update conversation title if this is the first message
      if (currentConversationId && messages.length === 0) {
        await updateConversationTitle(currentConversationId, currentInput.substring(0, 50));
      }
    } catch (error) {
      console.error('Error:', error);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again later.');
    } finally {
      setIsLoading(false);
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
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewConversation}
                className="p-2"
              >
                <FaPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="p-2 lg:hidden"
              >
                <FaTimes className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FaRegCommentDots className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a new conversation to get help</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    currentConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => {
                    setCurrentConversationId(conversation.id);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {editingTitle === conversation.id ? (
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onBlur={() => updateConversationTitle(conversation.id, newTitle)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateConversationTitle(conversation.id, newTitle);
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.title || 'New Conversation'}
                        </h3>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitle(conversation.id);
                          setNewTitle(conversation.title || '');
                        }}
                        className="p-1 h-6 w-6"
                      >
                        <FaEdit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
                      >
                        <FaTrash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2"
                >
                  <FaBars className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
                  <p className="text-xs text-gray-500">
                    {currentConversationId ? 'Continue your conversation' : 'Ask me anything about your business data'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-1 overflow-x-auto">
                {quickActions.map((action, index) => (
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
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                message.role === 'user'
                                  ? 'bg-white/20 text-white'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {message.category}
                              </span>
                            )}
                            <span className={`text-xs ${
                              message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(message.content)}
                              className={`h-6 w-6 p-0 hover:bg-gray-100 ${
                                message.role === 'user' ? 'hover:bg-white/20' : ''
                              }`}
                            >
                              <FaCopy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-line">
                          {formatMessageContent(message.content)}
                        </div>
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className={`text-xs ${
                              message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                            }`}>Try asking:</p>
                            <div className="flex flex-wrap gap-2">
                              {message.suggestions.map((suggestion, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setInput(suggestion)}
                                  className={`text-xs h-7 ${
                                    message.role === 'user'
                                      ? 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                                      : ''
                                  }`}
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

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
