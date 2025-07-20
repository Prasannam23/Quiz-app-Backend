import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";


export const redisClient = createClient({ url: redisUrl });

redisClient.on("error", (err) => console.error("Redis Error:", err));
redisClient.on("connect", () => console.log("✅ Connected to Redis"));


(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error(" Redis connection failed:", err);
  }
})();

export const RedisService = {
  /**
   
   * @param roomId string
   * @param quizData object (questions, quizTitle, teacherId, createdAt etc.)
   */
  setQuizData: async (roomId: string, quizData: any) => {
    await redisClient.set(`quiz:${roomId}:data`, JSON.stringify(quizData));
  },

 
  getQuizData: async (roomId: string) => {
    const data = await redisClient.get(`quiz:${roomId}:data`);
    return data ? JSON.parse(data) : null;
  },

  
  saveAnswer: async (roomId: string, userId: string, answer: any) => {
    await redisClient.set(`quiz:${roomId}:answer:${userId}`, JSON.stringify(answer));
  },

 
  getAnswer: async (roomId: string, userId: string) => {
    const answer = await redisClient.get(`quiz:${roomId}:answer:${userId}`);
    return answer ? JSON.parse(answer) : null;
  },

 
  addUserToRoom: async (roomId: string, userId: string) => {
    await redisClient.sAdd(`room:${roomId}:users`, userId);
  },

  
  removeUserFromRoom: async (roomId: string, userId: string) => {
    await redisClient.sRem(`room:${roomId}:users`, userId);
  },

  
  getUsersInRoom: async (roomId: string) => {
    return await redisClient.sMembers(`room:${roomId}:users`);
  },
};
