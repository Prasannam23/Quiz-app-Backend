import { WebSocket } from "ws"; 
import LeaderBoardService from "../services/leaderboard.service";
import { QuestionService } from "../services/question.service";
  
export interface ClientInfo {
  userId: string;
  isHost: boolean;
  socket: WebSocket; 
}

export interface Room {
  roomId: string,
  clients: Map<string, ClientInfo>,
  leaderboardService: LeaderBoardService,
  questionService: QuestionService,
}

export interface WSMessage {
  type: string;
  payload: JoinRoomPayload | AnswerPayload | StartQuizPayload | UserPayload | sendUsersPayload | ErrorPayload | null;
}

export interface ErrorPayload {
  message: string,
}

export interface JoinRoomPayload {
  quizId: string;
  userId: string;
  isHost: boolean;
}

export interface AnswerPayload {
  quizId: string;
  userId: string;
  questionId: string,
  answer: string;
}

export interface StartQuizPayload {
  quizId: string;
}

export interface LeaderBoardEntry {
  value: string,
  score: number,
}

export interface sendUsersPayload {
  roomId: string,
  users: UserPayload[]
}

export interface ILeaderBoardService {
  addMember(userId: string, score: number): Promise<void>;
  incrementScore(userId: string, incrementBy: number): Promise<number>;
  getTopPlayers(count: number): Promise<LeaderBoardEntry[]>;
  getPlayersInRange(startRank: number, count: number): Promise<LeaderBoardEntry[]>;
  getRank(userId: string): Promise<number | null>;
  getScore(userId: string): Promise<number | null>;
  size(): Promise<number>;
  removeMember(userId: string): Promise<boolean>;
  publishUpdates(channel: string, message: string): Promise<void>;
  subscribeToUpdates(channel: string, handler: (message: string) => void): Promise<void>;
  unsubscribeToUpdates(channel: string): Promise<void>;
}

export interface IRedisService {
  addUsertoRoom(userId: string, quizId: string): Promise<void>;
  getUsersInRoom(quizId: string): Promise<UserPayload[]>;
  checkIfUserInRoom(userId: string, quizId: string): Promise<boolean>;
  removeUserFromRoom(userId: string, quizId: string): Promise<void>;
}

export interface IQuestionService {
  init(): Promise<void>;
  addNewCurrentQuestion(question: Question): Promise<boolean>;
  getCurrentQuestion(): Promise<Question | null>;
  publishNewQuestion(question: Question): Promise<void>;
  subscribe(handler:(message: string) => void): Promise<void>;
  unsubscribe(): Promise<void>;
  subscibeToExpiry(): Promise<void>;
}

export interface Question {
  id: string,
  question: string,
  options: string[],
  answerIndex: string,
  marks: number,
  timeLimit: number,
  status: string,
}

export interface UserPayload {
  id: string,
  name: string,
  avatar: string,
  email: string,
}