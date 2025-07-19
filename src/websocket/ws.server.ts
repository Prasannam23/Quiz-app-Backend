import WebSocket, { Server } from 'ws';
import { IncomingMessage } from 'http';
import { Server as HTTPServer } from 'http';
import { redisSub } from '../config/redis';

const clients = new Map<string, WebSocket>();

export function createWebSocketServer(server: HTTPServer) {
  const wss = new Server({ server });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = req.url || '';
    const host = req.headers.host || 'localhost';
    const userId = new URL(url, `http://${host}`).searchParams.get('userId');

    if (!userId) {
      ws.close();
      return;
    }

    clients.set(userId, ws);

    ws.on('message', (message: string) => {
      console.log(`📩 Received from ${userId}: ${message}`);
    });

    ws.on('close', () => {
      clients.delete(userId);
      console.log(` Connection closed: ${userId}`);
    });
  });

 
  redisSub.subscribe('quiz-channel', (message, channel) => {
    console.log(`📨 Redis message on ${channel}: ${message}`);

    
    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  });

  console.log('WebSocket server initialized');
}
