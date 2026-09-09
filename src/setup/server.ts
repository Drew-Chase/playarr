import TcpSocket from 'react-native-tcp-socket';
import type Socket from 'react-native-tcp-socket/lib/types/Socket';
import { Buffer } from 'buffer/';
import { setupPageHtml } from './page';

export interface PinSnapshot {
  clientId: string;
  pinId: number | null;
  code: string | null;
}

export interface SetupResult {
  success: boolean;
  error?: string;
  serverName?: string;
}

export interface SetupStatus {
  status: 'pending' | 'success' | 'error';
  error?: string;
  serverName?: string;
}

interface Request {
  method: string;
  path: string;
  body: string;
}

const MAX_BODY = 64 * 1024;

function parseRequest(buffer: Buffer): Request | null {
  const sep = buffer.indexOf('\r\n\r\n');
  if (sep < 0) return null;
  const head = buffer.slice(0, sep).toString('utf8');
  const lines = head.split('\r\n');
  const [method, target] = lines[0].split(' ');
  if (!method || !target) return null;
  let contentLength = 0;
  for (const line of lines.slice(1)) {
    const m = /^content-length:\s*(\d+)$/i.exec(line);
    if (m) contentLength = parseInt(m[1], 10);
  }
  const bodyStart = sep + 4;
  if (buffer.length < bodyStart + contentLength) return null;
  const path = target.split('?')[0];
  const body = buffer.slice(bodyStart, bodyStart + contentLength).toString('utf8');
  return { method, path, body };
}

function respond(socket: Socket, status: number, reason: string, type: string, body: string) {
  const len = Buffer.from(body, 'utf8').length;
  const head =
    `HTTP/1.1 ${status} ${reason}\r\n` +
    `Content-Type: ${type}\r\n` +
    `Content-Length: ${len}\r\n` +
    `Connection: close\r\n` +
    `Cache-Control: no-store\r\n\r\n`;
  socket.write(head + body);
  socket.end();
}

function json(socket: Socket, status: number, obj: unknown) {
  respond(socket, status, status === 200 ? 'OK' : status === 400 ? 'Bad Request' : 'Not Found', 'application/json', JSON.stringify(obj));
}

export function startSetupServer(opts: {
  port?: number;
  getPin: () => PinSnapshot;
  onSetup: (serverUrl: string, rawToken: string) => Promise<SetupStatus>;
  getStatus: () => SetupStatus;
}): () => void {
  const port = opts.port ?? 65267;

  const server = TcpSocket.createServer((socket) => {
    let buf = Buffer.alloc(0);
    let handled = false;

    const processBuffer = () => {
      if (handled) return;
      const req = parseRequest(buf);
      if (!req) return;
      handled = true;

      if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) {
        respond(socket, 200, 'OK', 'text/html; charset=utf-8', setupPageHtml());
        return;
      }
      if (req.method === 'GET' && req.path === '/api/pin') {
        json(socket, 200, opts.getPin());
        return;
      }
      if (req.method === 'GET' && req.path === '/api/setup/status') {
        json(socket, 200, opts.getStatus());
        return;
      }
      if (req.method === 'POST' && req.path === '/api/setup') {
        let serverUrl = '';
        let rawToken = '';
        try {
          const parsed = JSON.parse(req.body);
          serverUrl = String(parsed.serverUrl || '').trim();
          rawToken = String(parsed.authToken || '').trim();
        } catch {}
        if (!serverUrl || !/^https?:\/\//.test(serverUrl)) {
          json(socket, 400, { success: false, error: 'Please enter a valid server URL (must start with http:// or https://).' });
          return;
        }
        if (!rawToken) {
          json(socket, 400, { success: false, error: 'Please link your Plex account first.' });
          return;
        }
        opts.onSetup(serverUrl, rawToken).catch(() => {});
        json(socket, 200, { status: 'pending' });
        return;
      }
      respond(socket, 404, 'Not Found', 'text/plain', 'Not found');
    };

    socket.on('data', (data: string | Uint8Array) => {
      buf = Buffer.concat([buf, typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data)]);
      if (buf.length > MAX_BODY + 16 * 1024) {
        socket.end();
        return;
      }
      processBuffer();
    });
    socket.on('error', () => {});
  });

  let closed = false;
  let attempts = 0;
  const bind = () => {
    if (closed) return;
    try {
      server.listen({ port, host: '0.0.0.0' });
    } catch {}
  };
  server.on('error', (e: unknown) => {
    console.warn('[setup-server] error:', JSON.stringify(e) || String(e));
    if (attempts < 30) {
      attempts += 1;
      setTimeout(bind, 600);
    }
  });
  server.on('listening', () => {
    console.log('[setup-server] listening on', port);
  });
  bind();
  return () => {
    closed = true;
    try {
      server.close();
    } catch {}
  };
}
