import { createClient, RedisClientType } from "redis";
import { IQuestionService, Question } from "../types/types";

export class QuestionService implements IQuestionService {
    private redisPub: RedisClientType;
    private redisSub: RedisClientType;
    private quizId: string;

    constructor(redisPub: RedisClientType, quizId: string) {
        this.redisPub = redisPub;
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const sub = createClient({url: redisUrl});
        this.redisSub = sub as RedisClientType;
        this.quizId = quizId;
    }

    async init() {
        await this.redisSub.connect();
    }

    async addNewCurrentQuestion(): Promise<boolean> {
        const question = await this.getNewQuestion();
        if(!question) return false;
        await this.redisPub.set(`quiz:${this.quizId}:currentQuestion`, JSON.stringify(question), { EX: question.timeLimit * 60 + 3 });
        this.publishNewQuestion(question);
        return true;
    }

    private async getNewQuestion(): Promise<Question | undefined> {
        const data = await this.redisPub.get(`quizData:${this.quizId}`);
        if(!data) return;
        const quiz = JSON.parse(data);
        for(const q of quiz.questions) {
            if(q.status=="not_done") {
                q.status="done";
                await this.redisPub.set(`quizData:${this.quizId}`, JSON.stringify(quiz));
                return q;
            }
        }
    }

    async getCurrentQuestion(): Promise<Question | null> {
        const data  =  await this.redisPub.get(`quiz${this.quizId}:currentQuestion`);
        if(!data) return null;
        const question: Question = JSON.parse(data);
        return question;
    }

    async publishNewQuestion(question: Question): Promise<void> {
        await this.redisPub.publish(`quiz:${this.quizId}:newQuestion`, JSON.stringify({id: question.id, question: question.question, options: question.options, timeLimit: question.timeLimit, marks: question.marks}));
    }

    async subscribe(handler: (message: string) => void): Promise<void> {
        await this.redisSub.subscribe(`quiz:${this.quizId}:newQuestion`, handler);
    }

    async unsubscribe(): Promise<void> {
        await this.redisSub.unsubscribe(`quiz:${this.quizId}:currentQuestion`);
    }

    async subscibeToExpiry(): Promise<void> {
        await this.redisSub.subscribe("__keyevent@0__:expired", async (key) => {
            if(key===`quiz:${this.quizId}:currentQuestion`) {
                const test = this.addNewCurrentQuestion();
                if(!test) await this.redisSub.unsubscribe("__keyevent@0__:expired");
            }
        });
    }
}