// src/websocket/ws.utils.ts
import { RedisClientType } from 'redis';
import { redisPub, redisSub } from '../config/redis';
import LeaderBoardService from '../services/leaderboard.service';
import { ClientInfo, LeaderBoardEntry, LeaderboardPayload, QuizStartPayload, Room, SelfScore, WSMessage } from '../types/types';
import { QuestionService } from '../services/question.service';
import { server } from '../app';
import prisma from '../config/db';

export const rooms = new Map<string, Room>();

export const addClient = async (client: ClientInfo, roomId: string, socketId: string) => {
  if(!rooms.has(roomId)) {
    const questionService = new QuestionService(redisPub as RedisClientType, roomId);
    await questionService.init();
    console.log("initiated");
    const room: Room = {
      roomId,
      clients: new Map<string, ClientInfo>(),
      leaderboardService: new LeaderBoardService(redisPub as RedisClientType, redisSub as RedisClientType, `leaderboard:${roomId}`, `pubsub:${roomId}`, roomId),
      questionService,
    }
    room.clients.set(socketId, client);
    rooms.set(roomId, room);
    console.log(`room created on `, server.address())
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
    console.log("broadcasting", message);
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

export const broadcastLeaderBoardToRoom = async (roomId: string, topPlayers: LeaderBoardEntry[]) => {
  try {
    const roomClients = getClientsInRoom(roomId);
    const room = rooms?.get(roomId);
    if(!roomClients || !room) {
      throw Error("Room not found.");
    }
    const arr = [];
    for(const [, value] of roomClients) {
      arr.push({
        socket: value.socket,
        score: await room.leaderboardService.getScore(value.userId),
        rank: await room.leaderboardService.getRank(value.userId),
        userId: value.userId,
      });
    }
    const fulfilledArr = await Promise.all(arr);
    fulfilledArr.forEach(async (value) => {
      const selfScore: SelfScore = {
        userId: value.userId,
        rank: value.rank || 0,
        score: value.score || 0,
      }
      const payload: LeaderboardPayload = {
        quizId: roomId,
        topPlayers,
        selfScore
      }
      value.socket?.send(JSON.stringify({type: "Leaderboard", payload}));
    });
  } catch (error) {
    console.error(`Error ocurred while broadcasting to room, ${(error as Error).message}`);
  }
}

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
  await prisma.quiz.update({
    where: {
      id: quizId
    },
    data: {
      state: "ongoing",
    }
  })
  return true;
}

export const sendAttemptId = async (quizId: string, update: WSMessage) => {
  const clients = rooms.get(quizId)?.clients;
  if(!clients) {
    return;
  }
  const attemptPromises = [];
  for(const [,val] of clients) {
    const startedAt = new Date();
    startedAt.setSeconds(startedAt.getSeconds() + 3);
    if(!val.isHost) attemptPromises.push({socket: val.socket,attempt: await prisma.attempt.create({
      data: {
        quiz: {
          connect: { id: quizId }
        },
        user:  {
          connect: {id: val.userId},
        },
        score: 0,
        startedAt,
      },
    })});
    else val.socket.send(JSON.stringify(update));
  }
  const attempts = await Promise.all(attemptPromises);
  attempts.forEach((attempt) => {
    (update.payload as QuizStartPayload).attemptId = attempt.attempt.id;
    attempt.socket.send(JSON.stringify(update));
  })
}

export const sendUpdates = async (type: string, message: string, quizId: string) => {
  console.log("inside sendupdates");
  await rooms.get(quizId)?.questionService.publishUpdates(type, message);
}

export const clientSubscriptionToQuestionAndLeaderboard = async (quizId: string) => {
  console.log("Inside client subscription");
  await rooms.get(quizId)?.questionService.subscribe((message) => {
    const question: WSMessage = JSON.parse(message);
    broadcastToRoom(quizId, question);
  }, (message) => {
    const update: WSMessage = JSON.parse(message);
    console.log(update);
    if(update.type === "QUIZ_STARTED") {
      sendAttemptId(quizId, update);
    } else broadcastToRoom(quizId, update);
  });
  await rooms.get(quizId)?.leaderboardService.subscribeToUpdates("leaderboard", (message: string)=> {
    const topPlayers: LeaderBoardEntry[] = JSON.parse(message);
    broadcastLeaderBoardToRoom(quizId, topPlayers);
  });
  console.log(`Client subscription to new question and leaderboard `, server.address());
}

export const evaluateScoreAndUpdateLeaderboard = async(userId: string, quizId: string, questionId: string, answer: number, attemptId: string): Promise<boolean> => {
  try {
    const questionScore = await rooms.get(quizId)?.questionService.evaluateAnswer(questionId, answer);
    const l = rooms.get(quizId)?.leaderboardService;
    if(!l) {
      throw new Error("Leaderboard service not found, Either not initiated or the quiz has not started yet.");
    }
    if(!questionScore) {
      throw new Error("Something went wrong while evaluating score.");
    }
    const existingScore = await l.getScore(userId);
    if(!existingScore) {
      await l.addMember(userId, questionScore.score);
    }
    await l.incrementScore(userId, questionScore.score);
    const topPlayers = await l.getTopPlayers(10);
    l.publishUpdates("leaderboard", JSON.stringify(topPlayers));
    await prisma.answer.create({
      data: {
        attempt: {
          connect: {
            id: attemptId,
          },
        },
        question: {
          connect: {
            id: quizId,
          },
        },
        selected: answer,
        isCorrect: questionScore? true: false,
        marksScored: questionScore.score,
        timeTaken:  questionScore.timetaken,
      }
    });
    await prisma.attempt.update({
      where: {
        id: attemptId,
      },
      data: {
        score: {
          increment: questionScore.score,
        },
        completedAt: new Date(),
      }
    });
    return true;
  } catch (error) {
    console.error((error as Error).message);
    return false;
  }
}