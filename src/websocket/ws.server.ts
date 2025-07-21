import { Server as HTTPServer } from 'http';
import WebSocket from 'ws';
import { WSMessage, ClientInfo, JoinRoomPayload, AnswerPayload, StartQuizPayload } from './types';
import {
  addClient,
  removeClient,
  broadcastToRoom,
  getClientBySocketId,
  clients
} from './ws.utils';

export const startWebSocketServer = (server: HTTPServer) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (socket) => {
    const socketId = crypto.randomUUID();

    console.log(' New WebSocket connection:', socketId);

    socket.on('message', (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'JOIN_ROOM': {
            const payload = message.payload as JoinRoomPayload;
            const client: ClientInfo = {
              socketId,
              userId: payload.userId,
              roomId: payload.roomId,
              isHost: payload.isHost,
              socket,
            };
            addClient(client);

            console.log(`👤 User ${payload.userId} joined room ${payload.roomId}`);
            break;
          }

          case 'START_QUIZ': {
            const payload = message.payload as StartQuizPayload;
            console.log(' Starting quiz in room:', payload.roomId);

            broadcastToRoom(payload.roomId, {
              type: 'QUESTION',
              payload: payload.quizData[0], 
            });
            break;
          }

          case 'ANSWER': {
            const payload = message.payload as AnswerPayload;
            console.log(` Answer from ${payload.userId}: ${payload.answer}`);
            
            break;
          }

          default:
            console.warn(' Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Failed to handle message:', err);
      }
    });
    
    socket.on('close', () => {
      console.log(' WebSocket disconnected:', socketId);
      removeClient(socketId);
    });
  });

  console.log(' WebSocket server running...');
};
