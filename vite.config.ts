import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const watchlistFilePath = resolve(projectRoot, 'data/watchlist.json');

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-watchlist-json',
      configureServer(server) {
        server.middlewares.use('/api/watchlist', async (request, response) => {
          try {
            if (request.method === 'GET') {
              const fileContent = await readFile(watchlistFilePath, 'utf-8');
              sendJson(response, 200, JSON.parse(fileContent));
              return;
            }

            if (request.method === 'PUT') {
              const body = await readRequestBody(request);
              const parsedBody = JSON.parse(body) as { symbols?: unknown };
              const symbols = Array.isArray(parsedBody.symbols)
                ? parsedBody.symbols.filter((symbol): symbol is string => typeof symbol === 'string')
                : [];

              await mkdir(dirname(watchlistFilePath), { recursive: true });
              await writeFile(watchlistFilePath, `${JSON.stringify({ symbols }, null, 2)}\n`);
              sendJson(response, 200, { symbols });
              return;
            }

            sendJson(response, 405, { message: 'Metodo nao permitido.' });
          } catch {
            sendJson(response, 500, { message: 'Nao foi possivel acessar data/watchlist.json.' });
          }
        });
      },
    },
  ],
});
