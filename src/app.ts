// src/app.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import prisma from './config/db';
import http from 'http';

import { createWebSocketServer } from './websocket/ws.server';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import googleAuthRoutes from './routes/google.auth.routes';
import quizRoutes from './routes/quiz.routes';

import './google/strategies/google';

dotenv.config();

const app = express();
const server = http.createServer(app); 


app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// ✅ Passport session handlers
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


app.get('/', (_req: Request, res: Response) => {
  res.send('🧠 Quiz App Backend is running!');
});
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/user', userRoutes);
app.use('/api/quiz', quizRoutes);


createWebSocketServer(server);

export { app, server };
