import express from 'express';
import { verifyToken, allowRoles } from '../middlewares/auth.middleware';
import { createQuiz } from '../controllers/quiz.controller';

const router = express.Router();


router.post('/create', verifyToken, allowRoles(['TEACHER']), createQuiz);
// router.post('/create-room', verifyToken, allowRoles(['TEACHER']), createRoom);



export default router;