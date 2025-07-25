import { Server as HTTPServer } from 'http';
import WebSocket from 'ws';
import { WSMessage, JoinRoomPayload, AnswerPayload, StartQuizPayload } from '../types/types';
import {
  removeClient,
} from './ws.utils';
import jwt from "jsonwebtoken";
import { handleJoinRoom, handleStartQuiz, sendUsers } from './ws.handlers';

export const startWebSocketServer = (server: HTTPServer) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (socket, req) => {
    const params = new URLSearchParams(req?.url?.split('/')[1]);
    const token = params.get('token');
    if(!token) return wss.close();
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    if(!decoded) return wss.close();
    const socketId = crypto.randomUUID();

    console.log('New WebSocket connection:', socketId);

    socket.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'JOIN_ROOM': {
            handleJoinRoom(socket, message.payload as JoinRoomPayload, socketId);
            sendUsers(socket, (message.payload as JoinRoomPayload).quizId);
            break;
          }

          case 'START_QUIZ': {
            await handleStartQuiz(socket, message.payload as StartQuizPayload);
            break;
          }
  // leaderboad live 
  
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
