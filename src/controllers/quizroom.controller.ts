import { Request, Response } from "express";
import { RedisService } from "../services/redis.service";

export const createQuiz = async (req: Request, res: Response) => {
  const { questions, teacherId, quizTitle } = req.body;

  if (!questions || !teacherId || !quizTitle)
    return res.status(400).json({ error: "Missing data" });

  const { nanoid } = await import("nanoid"); // ✅ dynamic import
  const roomId = nanoid(); // generates a unique short ID

  await RedisService.setQuizData(roomId, {
    questions,
    teacherId,
    quizTitle,
    createdAt: Date.now(),
  });

  return res.status(201).json({
    message: "Quiz created successfully",
    roomId,
  });
};
