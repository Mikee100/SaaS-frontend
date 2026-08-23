import { Bot, Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="adeera-page min-h-screen p-3">
      <div className="adeera-card mx-auto mt-20 max-w-md p-3 text-left">
        <div
          className="mb-2 inline-flex items-center justify-center rounded-md p-2"
          style={{ background: 'var(--adeera-accent-soft)' }}
        >
          <Bot className="h-4 w-4 text-(--adeera-accent)" />
        </div>
        <h2 className="mb-1 text-sm font-semibold text-(--adeera-text)">Loading AI Assistant</h2>
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-(--adeera-text-muted)" />
          <p className="text-xs text-(--adeera-text-muted)">Preparing your workspace data...</p>
        </div>
      </div>
    </div>
  );
}
