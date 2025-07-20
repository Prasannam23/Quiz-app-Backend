import { WebSocket } from "ws"; 
export interface ClientInfo {
  socketId: string;
  userId: string;
  roomId: string;
  isHost?: boolean;
  socket: WebSocket; 
}
  export interface WSMessage {
    type: string;
    payload: any;
  }
  
  export interface JoinRoomPayload {
    roomId: string;
    userId: string;
    isHost?: boolean;
  }
  
  export interface AnswerPayload {
    quizId: string;
    userId: string;
    answer: string;
  }
  
  export interface StartQuizPayload {
    roomId: string;
    quizData: any;
  }
  