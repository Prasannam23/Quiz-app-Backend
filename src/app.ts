import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import session  from 'express-session';
import passport from 'passport';
import prisma from './config/db';
dotenv.config();
const app = express();


app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
}));
/
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(express.json());
app.use(cookieParser());


passport.serializeUser((user: any, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id: string, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});
// Routes
app.get('/', (req: Request, res: Response): void => {
  res.send('Quiz App Backend is running 🚀');
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, (): void => {
  console.log(`Server is running on port ${PORT}`);
});
import googleAuthRoutes from '../src/routes/google.auth.routes';
app.use('/api/auth', googleAuthRoutes);


export default app;
