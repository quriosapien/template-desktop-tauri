// @vitest-environment node
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { DEMO_PASSWORD, DEMO_USER, handlers } from '@/mocks/handlers';
import { createMockApiMiddleware, mockApiPlugin } from '@/mocks/mock-api.plugin';

type FakeRequestInit = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

function fakeRequest({ url, method = 'GET', headers = {}, body }: FakeRequestInit) {
  const request = Readable.from(body ? [Buffer.from(body)] : []) as unknown as IncomingMessage;
  return Object.assign(request, { url, method, headers: { host: 'localhost:5173', ...headers } });
}

function fakeResponse() {
  const headers = new Map<string, string>();
  let resolveBody: (body: string) => void = () => {};
  const body = new Promise<string>((resolve) => {
    resolveBody = resolve;
  });
  const response = {
    statusCode: 200,
    setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
    end: (chunk?: Buffer) => resolveBody(chunk?.toString() ?? ''),
  };
  return { response: response as unknown as ServerResponse, headers, body };
}

const middleware = createMockApiMiddleware(async () => handlers, '/api');

describe('mock API dev-server middleware', () => {
  it('answers mocked endpoints with the MSW handler response', async () => {
    const { response, headers, body } = fakeResponse();
    const next = vi.fn();

    middleware(
      fakeRequest({
        url: '/api/auth/login',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: DEMO_USER.email, password: DEMO_PASSWORD }),
      }),
      response,
      next,
    );

    const parsed = JSON.parse(await body);
    expect(response.statusCode).toBe(200);
    expect(headers.get('content-type')).toContain('application/json');
    expect(parsed.user).toEqual(DEMO_USER);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards request headers to the handlers', async () => {
    const { response, body } = fakeResponse();

    middleware(fakeRequest({ url: '/api/auth/me' }), response, vi.fn());

    await body;
    expect(response.statusCode).toBe(401);
  });

  it('passes non-API requests straight through', () => {
    const next = vi.fn();
    middleware(fakeRequest({ url: '/src/main.ts' }), fakeResponse().response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes unmatched API paths through, e.g. to a dev proxy', async () => {
    const next = vi.fn();
    middleware(fakeRequest({ url: '/api/unknown' }), fakeResponse().response, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith());
  });

  it('reports handler-loading failures to Vite instead of hanging', async () => {
    const failing = createMockApiMiddleware(async () => {
      throw new Error('syntax error in handlers.ts');
    }, '/api');
    const next = vi.fn();

    failing(fakeRequest({ url: '/api/auth/me' }), fakeResponse().response, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(Error)));
  });

  it('is a dev-server-only plugin', () => {
    expect(mockApiPlugin().apply).toBe('serve');
  });
});
