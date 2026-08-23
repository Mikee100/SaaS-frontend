'use client';
import { Send } from 'lucide-react';

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function ChatComposer({ input, setInput, onSubmit, isLoading }: ChatComposerProps) {
  return (
    <div
      className="sticky bottom-0 mt-2 border-t px-0 py-2 backdrop-blur-sm"
      style={{ borderColor: 'var(--adeera-border)', background: 'color-mix(in srgb, var(--adeera-surface) 95%, transparent)' }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <form
          onSubmit={onSubmit}
          className="relative flex items-center rounded-md border p-1 transition-colors focus-within:border-(--adeera-accent)"
          style={{ borderColor: 'var(--adeera-border)', background: 'var(--adeera-surface)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your business..."
            className="flex-1 bg-transparent px-2 py-1.5 text-xs text-(--adeera-text) outline-none placeholder:text-(--adeera-text-muted)"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed"
            style={{
              background: !input.trim() || isLoading ? 'var(--adeera-text-muted)' : 'var(--adeera-accent)',
              opacity: !input.trim() || isLoading ? 0.5 : 1,
            }}
          >
            <span className="inline-flex items-center gap-1">
              <Send className="h-3.5 w-3.5" />
              Send
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
