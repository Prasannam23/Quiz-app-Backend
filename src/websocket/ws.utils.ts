// src/websocket/ws.utils.ts
import { RedisClientType } from 'redis';
import { redisPub, redisSub } from '../config/redis';
import LeaderBoardService from '../services/leaderboard.service';
import { ClientInfo, Room, WSMessage } from '../types/types';

export const rooms = new Map<string, Room>();

export const addClient = (client: ClientInfo, roomId: string, socketId: string) => {
  if(!rooms.has(roomId)) {
    const room: Room = {
      roomId,
      clients: new Map<string, ClientInfo>(),
      leaderboardService: new LeaderBoardService(redisPub as RedisClientType, redisSub as RedisClientType, `leaderboard:${roomId}`, `pubsub:${roomId}`)
    }
    room.clients.set(socketId, client);
    rooms.set(roomId, room);
  } else rooms.get(roomId)?.clients.set(socketId,client);
};

export const removeClient = (socketId: string) => {
  for(const [key, value] of rooms) {
    if(value.clients.has(socketId)) {
      value.clients.delete(socketId);
      console.log(`Client with socket id ${socketId} removed from Room ${key}`);
    }
  }
};

export const getClientsInRoom = (roomId: string) => {
  return rooms.get(roomId)?.clients;
};

export const getClientBySocketId = (socketId: string) => {
  for(const [, value] of rooms) {
    if(value.clients.has(socketId)) {
      return value.clients.get(socketId);
    }
  }
};

export const broadcastToRoom = (roomId: string, message: WSMessage) => {
  try {
    const roomClients = getClientsInRoom(roomId);
    if(!roomClients) {
      throw Error("Room not found.");
    }
    roomClients.forEach((value) => {
      value.socket?.send(JSON.stringify(message));
    });
  } catch (error) {
    console.error(`Error ocurred while broadcasting to room, ${(error as Error).message}`);
  }
};
