import { redisClient } from "../config/redis"; 

export const RedisService = {
  /**
   * @param roomId 
   * @param quizData 
   */
  setQuizData: async (roomId: string, quizData: any) => {

    await redisClient.set(`quiz:${roomId}:data`, JSON.stringify(quizData));
    console.log("Setting quiz data in Redis for", roomId);
  
  },

  /**
  
   * @param roomId 
   */
  getQuizData: async (roomId: string) => {
    const data = await redisClient.get(`quiz:${roomId}:data`);
    return data ? JSON.parse(data) : null;
  },

  /**
   * @param roomId 
   * @param userId 
   * @param answer 
   */
  saveAnswer: async (roomId: string, userId: string, answer: any) => {
    await redisClient.set(`quiz:${roomId}:answer:${userId}`, JSON.stringify(answer));
    console.log("Saving answer for", userId);
    console.log("Fetching users in room:", roomId);
  },

  /**
   * @param roomId string
   * @param userId string
   */
  getAnswer: async (roomId: string, userId: string) => {
    const answer = await redisClient.get(`quiz:${roomId}:answer:${userId}`);
    return answer ? JSON.parse(answer) : null;
  },

  /**
   * Add user to a quiz room
   * @param roomId string
   * @param userId string
   */
  addUserToRoom: async (roomId: string, userId: string) => {
    await redisClient.sAdd(`room:${roomId}:users`, userId);
  },

  /**
   * Remove user from quiz room
   * @param roomId string
   * @param userId string
   */
  removeUserFromRoom: async (roomId: string, userId: string) => {
    await redisClient.sRem(`room:${roomId}:users`, userId);
  },

  /**
   * Get all users in a quiz room
   * @param roomId string
   */
  getUsersInRoom: async (roomId: string) => {
    return await redisClient.sMembers(`room:${roomId}:users`);
  },
};
