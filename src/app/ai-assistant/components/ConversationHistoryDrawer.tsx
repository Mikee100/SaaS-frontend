'use client';
import { Bot, Plus, X } from 'lucide-react';

export interface Conversation {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConversationHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export default function ConversationHistoryDrawer({
  open,
  onClose,
  conversations,
  currentConversationId,
  onSelect,
  onNewChat,
}: ConversationHistoryDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-200 ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col border-l transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--adeera-surface)', borderColor: 'var(--adeera-border)' }}
      >
        <div
          className="flex items-center justify-between border-b p-3"
          style={{ borderColor: 'var(--adeera-border)' }}
        >
          <h2 className="adeera-label">History</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-(--adeera-text-muted) transition-colors hover:bg-(--adeera-surface-muted)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--adeera-accent)' }}
          >
            <Plus className="h-3 w-3" /> New Chat
          </button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-xs text-(--adeera-text-muted)">No chats yet</p>
            </div>
          )}
          {conversations.map((conv) => {
            const isActive = currentConversationId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-xs transition-all"
                style={
                  isActive
                    ? {
                        background: 'var(--adeera-accent-soft)',
                        borderColor: 'var(--adeera-accent)',
                        color: 'var(--adeera-accent)',
                        fontWeight: 600,
                      }
                    : { borderColor: 'transparent', color: 'var(--adeera-text-muted)' }
                }
              >
                <Bot className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{conv.title || 'New Conversation'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
