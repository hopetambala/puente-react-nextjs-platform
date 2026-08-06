import { Parse } from 'parse';
import { useCallback, useRef, useState } from 'react';

/**
 * React 17-compatible chat hook for the data assistant.
 *
 * Streams the AI SDK UI message protocol (SSE `data: {...}` lines) from
 * POST /api/agent/chat and folds text deltas into a single assistant message.
 */
export default function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendMessage = useCallback(async (text, { onToolStatus } = {}) => {
    setError(null);
    setIsLoading(true);

    const history = [...messagesRef.current, { role: 'user', content: text }];
    setMessages(history);

    try {
      const user = Parse.User.current();
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-parse-session-token': user ? user.getSessionToken() : '',
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';

      const applyEvent = (event) => {
        if (event.type === 'text-delta' && event.delta) {
          assistantText += event.delta;
          setMessages([...history, { role: 'assistant', content: assistantText }]);
        } else if (event.type === 'tool-input-start' && onToolStatus) {
          onToolStatus(event.toolName);
        } else if (event.type === 'error') {
          setError(event.errorText || 'stream error');
        }
      };

      for (;;) {
        const { value, done } = await reader.read(); // eslint-disable-line no-await-in-loop
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach((line) => {
          const data = line.replace(/^data: /, '').trim();
          if (!data || data === '[DONE]') return;
          try {
            applyEvent(JSON.parse(data));
          } catch (e) {
            // Ignore malformed / partial stream lines.
          }
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages, sendMessage, isLoading, error,
  };
}
