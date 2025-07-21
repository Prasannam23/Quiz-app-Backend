import { Request, Response } from "express";
import { redisClient } from "../config/redis";
import prisma from "../config/db";

export const cacheQuizToRedis = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    
    const cached = await redisClient.get(`quiz:${quizId}`);
    if (cached) {
      return res.status(200).json({ fromCache: true, data: JSON.parse(cached) });
    }

 
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

   
    await redisClient.set(`quiz:${quizId}`, JSON.stringify(quiz), { EX: 3600 }); // cache for 1hr

    return res.status(200).json({ fromCache: false, data: quiz });
  } catch (err) {
    console.error("Redis cache error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
