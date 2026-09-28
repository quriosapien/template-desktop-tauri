import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestHandler } from 'msw';
import type { Connect, Plugin } from 'vite';

type LoadHandlers = () => Promise<RequestHandler[]>;

/**
 * Serves the MSW handlers (`handlers.ts`) from the Vite dev server instead of
 * from a service worker. WKWebView — Tauri's webview on macOS — refuses
 * service-worker registration, so a worker can't intercept fetches there;
 * answering `/api/*` on the server works in every webview. Unit tests keep
 * using msw/node (`server.ts`) with the very same handlers.
 *
 * Imported by vite.config.ts (Node), never by the UI — so it must not use the
 * `@/` alias itself; the handlers are loaded through Vite, which resolves it.
 */
export function mockApiPlugin(options: { prefix?: string } = {}): Plugin {
  const prefix = options.prefix ?? '/api';

  return {
    name: 'mock-api',
    apply: 'serve',
    configureServer(server) {
      // ssrLoadModule resolves `@/` imports and picks up handler edits live.
      const loadHandlers: LoadHandlers = async () => {
        const module = await server.ssrLoadModule('/src/mocks/handlers.ts');
        return (module as { handlers: RequestHandler[] }).handlers;
      };
      server.middlewares.use(createMockApiMiddleware(loadHandlers, prefix));
    },
  };
}

/** Connect middleware: answers matched API requests, passes everything else on. */
export function createMockApiMiddleware(
  loadHandlers: LoadHandlers,
  prefix: string,
): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url ?? '';
    if (url !== prefix && !url.startsWith(`${prefix}/`)) {
      next();
      return;
    }

    (async () => {
      // Lazy: vite.config.ts imports this plugin even when mocking is off, and
      // loading msw in Node trips Node 26's experimental-localStorage warning.
      const { getResponse } = await import('msw');
      const response = await getResponse(await loadHandlers(), await toFetchRequest(req));
      if (!response) {
        // No handler matched: fall through (e.g. to the DEV_PROXY target).
        next();
        return;
      }
      await sendResponse(res, response);
    })().catch(next);
  };
}

async function toFetchRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  const method = req.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(url, { method, headers, body: hasBody ? await readBody(req) : undefined });
}

async function readBody(req: IncomingMessage): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    res.setHeader(name, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}
