// src/controllers/quiz.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';
import { nanoid } from 'nanoid';
// import { rooms } from '../websocket/ws.utils';
// import { ClientInfo, Room } from '../types/types';
// import {  redisPub, redisSub } from '../config/redis';
// import LeaderBoardService from '../services/leaderboard.service';
// import { RedisClientType } from 'redis';

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, maxScore, questions } = req.body;
    const userId = req.user?.id;

    if(!userId) {
      throw new Error("User Not Authenticated");
    }

    if (!title || !Array.isArray(questions) || !maxScore) {
      res.status(400).json({ error: 'Missing quiz data' });
      return;
    }

    const joinCode = nanoid(4);

    const newQuiz = await prisma.quiz.create({
      data: {
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        joinCode,
        maxScore,
        ownerId: userId,
        questions: {
          create: questions.map((q) => ({
            question: q.question,
            options: q.options,
            answerIndex: q.answerIndex,
            marks: q.marks,
            timeLimit: q.timeLimit,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({ message: 'Quiz created', quizId: newQuiz.id });
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// export const createRoom = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { quizId } = req.body;
//     const userId = req.user?.id;

//     const quiz = await prisma.quiz.findUnique({
//       where: {
//         id: quizId,
//         ownerId: userId,
//       }
//     });

//     if(!quiz) {
//       throw new Error("Quiz not found");
//     }

//     const leaderboardService = new LeaderBoardService(redisPub as RedisClientType, redisSub as RedisClientType, `leaderboard:${quizId}`, `pubsub:${quizId}`);

//     const room : Room = {
//       roomId: quiz.joinCode,
//       clients: new Map<string,ClientInfo>(),
//       leaderboardService,
//     }

//     const roomId = quiz.id;

//     rooms.set(roomId, room);

//     res.status(500).json({ message: 'Room Created', roomId });
//   } catch (error) {
//     console.error("Create room error:", error);
//     res.status(500).json({error: "Internal Server Error"});
//   }
// }
