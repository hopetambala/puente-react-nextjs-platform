import { act, renderHook, waitFor } from '@testing-library/react';

import useAssistantChat from 'app/epics/DataAssistant/useAssistantChat';

jest.mock('parse', () => ({
  Parse: {
    User: {
      current: jest.fn(() => ({ getSessionToken: () => 'tok-123' })),
    },
  },
}));

const { TextDecoder, TextEncoder } = require('util');

if (!global.TextDecoder) global.TextDecoder = TextDecoder;
const encoder = new TextEncoder();

/** Builds a fake fetch Response whose body streams the given SSE lines. */
const sseResponse = (events) => {
  const chunks = events.map((e) => encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length ? { value: chunks[(i += 1) - 1], done: false } : { value: undefined, done: true },
      }),
    },
  };
};

describe('useAssistantChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('starts with no messages and not loading', () => {
    const { result } = renderHook(() => useAssistantChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('sends the user message with the Parse session token header', async () => {
    global.fetch.mockResolvedValue(sseResponse([{ type: 'text-delta', delta: 'Hola' }]));
    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('¿Cuántas familias?');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/agent/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-parse-session-token': 'tok-123',
        }),
      }),
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: '¿Cuántas familias?' }]);
  });

  it('accumulates streamed text deltas into one assistant message', async () => {
    global.fetch.mockResolvedValue(
      sseResponse([
        { type: 'text-delta', delta: 'Hay ' },
        { type: 'text-delta', delta: '42 familias.' },
      ]),
    );
    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('¿Cuántas familias?');
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([
        { role: 'user', content: '¿Cuántas familias?' },
        { role: 'assistant', content: 'Hay 42 familias.' },
      ]);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes the running tool name while a tool executes', async () => {
    global.fetch.mockResolvedValue(
      sseResponse([
        { type: 'tool-input-start', toolName: 'countRecords' },
        { type: 'text-delta', delta: 'Hay 42.' },
      ]),
    );
    const statuses = [];
    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('cuenta', { onToolStatus: (s) => statuses.push(s) });
    });

    expect(statuses).toContain('countRecords');
  });

  it('sets an error state when the request fails', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'no' }) });
    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('hola');
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isLoading).toBe(false);
  });

  it('sets an error state when the stream emits an error chunk', async () => {
    global.fetch.mockResolvedValue(
      sseResponse([
        { type: 'text-delta', delta: 'Buscando' },
        { type: 'error', errorText: 'model exploded' },
      ]),
    );
    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('cuenta');
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isLoading).toBe(false);
  });
});
