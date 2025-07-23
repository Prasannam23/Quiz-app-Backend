import { WebSocket } from "ws"; 
import LeaderBoardService from "../services/leaderboard.service";
  
export interface ClientInfo {
  userId: string;
  isHost: boolean;
  socket: WebSocket; 
}

export interface Room {
  roomId: string,
  clients: Map<string, ClientInfo>,
  leaderboardService: LeaderBoardService
}

export interface WSMessage {
  type: string;
  payload: JoinRoomPayload | AnswerPayload | StartQuizPayload | UserPayload | sendUsersPayload;
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  isHost: boolean;
}

export interface AnswerPayload {
  quizId: string;
  userId: string;
  answer: string;
}

export interface StartQuizPayload {
  roomId: string;
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
  updateScore(userId: string, score: number): Promise<void>;
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

export interface UserPayload {
  id: string,
  name: string,
  avatar: string,
  email: string,
}