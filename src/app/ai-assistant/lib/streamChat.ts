export type ChatStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'toolCall'; name: string }
  | {
      type: 'final';
      category: string;
      suggestions: string[];
      chartData?: any;
      reportData?: any;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    }
  | { type: 'error'; message: string };

interface StreamChatParams {
  apiBaseUrl: string;
  message: string;
  conversationId?: string | null;
  token: string | null;
}

/** POSTs to /ai/chat/stream and yields parsed NDJSON events as they arrive. */
export async function* streamChat({
  apiBaseUrl,
  message,
  conversationId,
  token,
}: StreamChatParams): AsyncGenerator<ChatStreamEvent> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBaseUrl}/ai/chat/stream`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ message, conversationId: conversationId || undefined }),
  });

  if (!response.ok || !response.body) {
    yield { type: 'error', message: `Request failed (${response.status})` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseLine = (line: string): ChatStreamEvent | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as ChatStreamEvent;
    } catch {
      return null;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const event = parseLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
      if (event) yield event;
      newlineIndex = buffer.indexOf('\n');
    }
  }

  const trailing = parseLine(buffer);
  if (trailing) yield trailing;
}
