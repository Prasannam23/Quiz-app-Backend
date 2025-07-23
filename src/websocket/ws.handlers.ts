import { WebSocket } from "ws";
import {
  ClientInfo,
  JoinRoomPayload,
  StartQuizPayload,
  UserPayload,
  WSMessage,
  sendUsersPayload
} from "../types/types";
import { addClient, broadcastToRoom, clientSubscriptionToQuestion, startquiz } from "./ws.utils";
import prisma from "../config/db";
import { redisService } from "../services/redis.service";


export const handleJoinRoom = async (socket: WebSocket, payload: JoinRoomPayload, socketId: string) => {
  try {
    const { quizId, userId, isHost } = payload;
    const client: ClientInfo = {
      userId,
      isHost,
      socket,
    };
    console.log(`👤 User ${payload.userId} joined room ${payload.quizId}`);
    
    await addClient(client, quizId, socketId);
    
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true, 
      }
    });
  
    if(!user) {
      throw new Error("User not found.");
    }
  
    const data: UserPayload = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar || 'No-Avatar',
      email: user.email,
    }

    redisService.addUsertoRoom(data.id, quizId);

    broadcastToRoom(quizId, {
      type: "USER_JOINED",
      payload: data,
    });

  } catch (error) {
    console.error(`Error while handling user join message ${(error as Error).message}`)
  }
};

export const sendUsers = async (socket: WebSocket, roomId: string): Promise<void> => {
  const users = await redisService.getUsersInRoom(roomId);
  const payload: sendUsersPayload = {
    roomId,
    users,
  }
  const message: WSMessage = {
    type: "USERS_IN_ROOM",
    payload,
  }
  socket.send(JSON.stringify(message));
}

export const handleStartQuiz = async (socket: WebSocket, payload: StartQuizPayload) => {
  const { quizId } = payload;

  broadcastToRoom(quizId, {
    type: "QUIZ_STARTED",
    payload: null,
  });

  clientSubscriptionToQuestion(quizId);

  const test = await startquiz(quizId);
  if(!test) {
    const message: WSMessage = {
      type: "ERROR",
      payload: {
        message: "Either Quiz not found or or it does not have any questions"
      }
    }
    socket.send(JSON.stringify(message));
  }
};

// export const handleAnswer = async (socket: WebSocket, payload: AnswerPayload) => {
//   const { quizId, userId, answer } = payload;

//   await redisClient.set(`quiz:${quizId}:answer:${userId}`, JSON.stringify(answer));

//   socket.send(
//     JSON.stringify({
//       type: "ANSWER_RECEIVED",
//       payload: { status: "ok" },
//     })
//   );
// };

// export const handleDisconnect = async (socket: WebSocket) => {
//   const info = clients.get(socket);
//   if (!info) return;

//   const { roomId, userId } = info;
//   await redisClient.sRem(`room:${roomId}`, userId);

//   clients.delete(socket);

//   broadcastToRoom(roomId, {
//     type: "USER_LEFT",
//     payload: { userId },
//   });
// };
