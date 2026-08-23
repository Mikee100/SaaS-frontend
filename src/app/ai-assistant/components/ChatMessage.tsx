'use client';
import { Bot, User, Check, Copy, Download, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

export interface Message {
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

interface ChatMessageProps {
  message: Message;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  onDownloadReport: (reportData: NonNullable<Message['reportData']>) => void;
}

const markdownComponents = (isUser: boolean) => ({
  h2: ({ children }: any) => (
    <h3 className="mt-3 mb-1.5 text-sm font-semibold tracking-tight">{children}</h3>
  ),
  h3: ({ children }: any) => (
    <h4 className="mt-2 mb-1 text-sm font-semibold">{children}</h4>
  ),
  p: ({ children }: any) => (
    <p className="mb-1.5 text-xs leading-snug last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="mb-1.5 list-disc space-y-1 pl-4 text-xs leading-snug">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="mb-1.5 list-decimal space-y-1 pl-4 text-xs leading-snug">{children}</ol>
  ),
  li: ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline underline-offset-2 ${isUser ? 'text-white' : 'text-(--adeera-accent)'}`}
    >
      {children}
    </a>
  ),
  table: ({ children }: any) => (
    <div className="mb-1.5 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-(--adeera-border) px-1.5 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-(--adeera-border) px-1.5 py-1">{children}</td>
  ),
  code: ({ children }: any) => (
    <code className="rounded bg-(--adeera-surface-muted) px-1 py-0.5 text-[11px]">
      {children}
    </code>
  ),
});

export default function ChatMessage({
  message,
  copiedId,
  onCopy,
  onSuggestionClick,
  onDownloadReport,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[96%] items-start gap-2 lg:max-w-[84%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <div
          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-(--adeera-radius-md)"
          style={
            isUser
              ? { background: 'var(--adeera-accent)', color: '#fff' }
              : { background: 'var(--adeera-surface-muted)', color: 'var(--adeera-text-muted)' }
          }
        >
          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
        </div>

        <div className="min-w-0 flex flex-col gap-0.5">
          <div
            className="rounded-(--adeera-radius-lg) border px-2.5 py-2"
            style={
              isUser
                ? {
                    background: 'var(--adeera-accent)',
                    color: '#fff',
                    borderColor: 'var(--adeera-accent)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
                  }
                : {
                    background: 'var(--adeera-surface)',
                    color: 'var(--adeera-text)',
                    borderColor: 'var(--adeera-border)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                  }
            }
          >
            <div className="max-w-none break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(isUser)}>
                {message.content}
              </ReactMarkdown>
            </div>

            {message.chartData && message.role === 'assistant' && (
              <div className="adeera-card mt-2 p-2">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-(--adeera-text)">
                  <BarChart3 className="h-3.5 w-3.5 text-(--adeera-text-muted)" />
                  {message.chartData.title}
                </h4>
                <div className="h-56 w-full">
                  {message.chartData.type === 'line' && (
                    <Line data={message.chartData.data} options={{ ...message.chartData.options, responsive: true, maintainAspectRatio: false }} />
                  )}
                  {message.chartData.type === 'bar' && (
                    <Bar data={message.chartData.data} options={{ ...message.chartData.options, responsive: true, maintainAspectRatio: false }} />
                  )}
                  {message.chartData.type === 'pie' && (
                    <Pie data={message.chartData.data} options={{ ...message.chartData.options, responsive: true, maintainAspectRatio: false }} />
                  )}
                  {message.chartData.type === 'doughnut' && (
                    <Doughnut data={message.chartData.data} options={{ ...message.chartData.options, responsive: true, maintainAspectRatio: false }} />
                  )}
                </div>
              </div>
            )}

            {message.reportData && message.role === 'assistant' && (
              <div
                className="mt-2 flex items-center justify-between gap-2 rounded-(--adeera-radius-md) border p-2"
                style={{ borderColor: 'var(--adeera-border)', background: 'var(--adeera-surface-muted)' }}
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-(--adeera-text-muted)" />
                  <div>
                    <h4 className="text-xs font-semibold text-(--adeera-text)">
                      {message.reportData.reportType.charAt(0).toUpperCase() + message.reportData.reportType.slice(1)} Summary
                    </h4>
                    <p className="text-[10px] uppercase tracking-wide text-(--adeera-text-muted)">
                      {message.reportData.format}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDownloadReport(message.reportData!)}
                  className="rounded px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:opacity-90"
                  style={{ background: 'var(--adeera-accent)' }}
                >
                  Download
                </button>
              </div>
            )}

            {message.suggestions && message.suggestions.length > 0 && (
              <div
                className="mt-2 flex flex-wrap gap-1.5 border-t pt-2"
                style={{ borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'var(--adeera-border)' }}
              >
                {message.suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSuggestionClick(sug)}
                    className={`rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                      isUser
                        ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                        : 'border-(--adeera-border) bg-(--adeera-surface) text-(--adeera-text-muted) hover:border-(--adeera-accent) hover:text-(--adeera-accent)'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={`mt-0.5 flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <button
              onClick={() => onCopy(message.content, message.id)}
              className="flex items-center gap-1 text-[10px] font-medium text-(--adeera-text-muted) hover:text-(--adeera-accent)"
            >
              {copiedId === message.id ? (
                <>
                  <Check className="h-2.5 w-2.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-2.5 w-2.5" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
