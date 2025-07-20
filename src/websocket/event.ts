import { WebSocket } from "ws";
import { redisClient } from "../config/redis";
import {
  WSMessage,
  JoinRoomPayload,
  AnswerPayload,
  StartQuizPayload,
  ClientInfo,
} from "./types";
import { randomUUID } from "crypto"; 
import { v4 as uuidv4 } from 'uuid';


const clients = new Map<WebSocket, ClientInfo>();

export const handleMessage = async (socket: WebSocket, message: WSMessage) => {
  switch (message.type) {
    case "JOIN_ROOM":
      await handleJoinRoom(socket, message.payload);
      break;
    case "ANSWER":
      await handleAnswer(socket, message.payload);
      break;
    case "START_QUIZ":
      await handleStartQuiz(socket, message.payload);
      break;
  }
};

const handleJoinRoom = async (socket: WebSocket, payload: JoinRoomPayload) => {
  const { roomId, userId, isHost } = payload;

  clients.set(socket, {
    socket,
    socketId: uuidv4(),
    roomId,
    userId,
    isHost,
  });

  await redisClient.sAdd(`room:${roomId}`, userId);

  broadcastToRoom(roomId, {
    type: "USER_JOINED",
    payload: { userId },
  });
};

const handleAnswer = async (socket: WebSocket, payload: AnswerPayload) => {
  const { quizId, userId, answer } = payload;

  await redisClient.set(`quiz:${quizId}:answer:${userId}`, JSON.stringify(answer));

  socket.send(
    JSON.stringify({
      type: "ANSWER_RECEIVED",
      payload: { status: "ok" },
    })
  );
};

const handleStartQuiz = async (socket: WebSocket, payload: StartQuizPayload) => {
  const { roomId, quizData } = payload;

  await redisClient.set(`quiz:${roomId}:data`, JSON.stringify(quizData));

  broadcastToRoom(roomId, {
    type: "QUIZ_STARTED",
    payload: quizData,
  });
};

const broadcastToRoom = (roomId: string, message: WSMessage) => {
  for (const [client, info] of clients.entries()) {
    if (info.roomId === roomId) {
      client.send(JSON.stringify(message));
    }
  }
};

export const handleDisconnect = async (socket: WebSocket) => {
  const info = clients.get(socket);
  if (!info) return;

  const { roomId, userId } = info;
  await redisClient.sRem(`room:${roomId}`, userId);

  clients.delete(socket);

  broadcastToRoom(roomId, {
    type: "USER_LEFT",
    payload: { userId },
  });
};
