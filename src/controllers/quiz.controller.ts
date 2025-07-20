import { Request, Response } from 'express';
import prisma from '../config/db';
import { nanoid } from 'nanoid'; 

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, maxScore, questions } = req.body;
    const userId = (req as any).user.id;

    if (!title || !Array.isArray(questions) || !maxScore) {
      res.status(400).json({ error: 'Missing quiz data' });
      return;
    }

    const joinCode = nanoid(4).toString(); 

    const newQuiz = await prisma.quiz.create({
      data: {
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        joinCode,
        maxScore,
        ownerId: userId,
        questions: {
          create: questions.map((q: any) => ({
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
