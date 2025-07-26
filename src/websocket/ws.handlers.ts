import { WebSocket } from "ws";
import {
  AnswerPayload,
  ClientInfo,
  JoinRoomPayload,
  StartQuizPayload,
  UserPayload,
  WSMessage,
  sendUsersPayload
} from "../types/types";
import { addClient, evaluateScoreAndUpdateLeaderboard, sendUpdates, startquiz } from "./ws.utils";
import prisma from "../config/db";
import { redisService } from "../services/redis.service";
import { server } from "../app";


export const handleJoinRoom = async (socket: WebSocket, payload: JoinRoomPayload, socketId: string) => {
  try {
    const { quizId, userId } = payload;

    console.log(`👤 User ${payload.userId} joined room ${payload.quizId},`, server.address());
    
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

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    const client: ClientInfo = {
      userId,
      socket,
      isHost: quiz?.ownerId==userId,
    };

    await addClient(client, quizId, socketId);
    

    if(!quiz) {
      throw new Error("Quiz not found.");
    }

    if(quiz.state == "ongoing") {
      const attempt = await prisma.attempt.create({
        data: {
          score: 0,
          user: {
            connect: {
              id: userId,
            },
          },
          quiz: {
            connect: {
              id: quizId,
            },
          },
          startedAt: new Date(),
        }
      });
      socket.send(JSON.stringify({type: "QUIZ_ONGOING", payload: {
        message: "Quiz Ongoing following is your attemptId, you will be given the next question shortly.",
        attemptId: attempt.id
      }}));
      
    }
  
    if(!user) {
      throw new Error("User not found.");
    }
  
    const data: UserPayload = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar || 'No-Avatar',
      email: user.email,
    }

    await redisService.addUsertoRoom(data.id, quizId);

    await sendUpdates("NEW_USER", JSON.stringify(data), quizId);
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
  const m: WSMessage = {
    type: "USERS_IN_ROOM",
    payload,
  }
  socket.send(JSON.stringify(m));
}

export const handleStartQuiz = async (socket: WebSocket, payload: StartQuizPayload) => {
  const { quizId } = payload;

  await sendUpdates("QUIZ_STARTED", "Quiz has started, here is the attemptId for the given quiz", quizId);

  setTimeout(async () => {
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
  }, 3000);
};

export const handleAnswer = async (socket: WebSocket, payload: AnswerPayload) => {
  const { quizId, userId, answer, questionId, attemptId } = payload;
  
  const test = await evaluateScoreAndUpdateLeaderboard(userId, quizId, questionId, answer, attemptId);

  if(test) {
    socket.send(
    JSON.stringify({
      type: "ANSWER_RECEIVED",
      payload: { status: "ok" },
    })
  );
  } else {
    socket.send(JSON.stringify({type: "ERROR", payload:{
      message: "Something went wrong."
    }}));
  }
};

// export const handleDisconnect = async (socketId: string) => {
  
//   broadcastToRoom(roomId, {
//     type: "USER_LEFT",
//     payload: { userId },
//   });
// };
