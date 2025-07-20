// src/websocket/ws.utils.ts

import { WebSocket } from 'ws';
import { ClientInfo } from './types';

export const clients: ClientInfo[] = [];

export const addClient = (client: ClientInfo) => {
  clients.push(client);
};

export const removeClient = (socketId: string) => {
  const index = clients.findIndex(c => c.socketId === socketId);
  if (index !== -1) clients.splice(index, 1);
};

export const getClientsInRoom = (roomId: string) => {
  return clients.filter(c => c.roomId === roomId);
};

export const getClientBySocketId = (socketId: string) => {
  return clients.find(c => c.socketId === socketId);
};

export const broadcastToRoom = (roomId: string, message: any) => {
  const roomClients = getClientsInRoom(roomId);
  roomClients.forEach(c => {
    (c as any).socket?.send(JSON.stringify(message));
  });
};
