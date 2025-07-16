import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';

// ✅ Init Google strategy early
import '../src/google/strategies/google';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import googleAuthRoutes from './routes/google.auth.routes';

// Prisma
import prisma from './config/db';

dotenv.config();

const app = express();

// ✅ CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// ✅ Passport serialize/deserialize
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});

// ✅ Routes
app.get('/', (_req: Request, res: Response) => {
  res.send('🚀 Quiz App Backend is running');
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/user', userRoutes);

// ✅ Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🟢 Server running at http://localhost:${PORT}`);
});

export default app;
