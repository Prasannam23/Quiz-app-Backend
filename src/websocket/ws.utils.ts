// src/websocket/ws.utils.ts
import { RedisClientType } from 'redis';
import { redisPub, redisSub } from '../config/redis';
import LeaderBoardService from '../services/leaderboard.service';
import { ClientInfo, Room, WSMessage } from '../types/types';
import { QuestionService } from '../services/question.service';

export const rooms = new Map<string, Room>();

export const addClient = async (client: ClientInfo, roomId: string, socketId: string) => {
  if(!rooms.has(roomId)) {
    const questionService = new QuestionService(redisPub as RedisClientType, roomId);
    await questionService.init();
    const room: Room = {
      roomId,
      clients: new Map<string, ClientInfo>(),
      leaderboardService: new LeaderBoardService(redisPub as RedisClientType, redisSub as RedisClientType, `leaderboard:${roomId}`, `pubsub:${roomId}`),
      questionService,
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

export const isHost = (roomId: string, userId: string) => {
  const room = rooms.get(roomId);
  if(!room) return false;
  for(const [, val] of room.clients) {
    if(userId==val.userId && val.isHost) return true;
  }
  return false;
}

export const startquiz = async (quizId: string) => {
  const test = await rooms.get(quizId)?.questionService.addNewCurrentQuestion();
  if(!test) {
    return false;
  }
  await rooms.get(quizId)?.questionService.subscibeToExpiry();
  return true;
}

export const clientSubscriptionToQuestion = (quizId: string) => {
  rooms.get(quizId)?.questionService.subscribe((message) => {
    const question = JSON.parse(message);
    broadcastToRoom(quizId, question);
  });
}