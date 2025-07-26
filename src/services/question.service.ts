import { createClient, RedisClientType } from "redis";
import { IQuestionService, Question, QuizStartPayload, QuizUpdatePayload, score, sendUsersPayload, WSMessage } from "../types/types";
import { server } from "../app";

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
        console.log(`redis sub initialized `, server.address())
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
        const data  =  await this.redisPub.get(`quiz:${this.quizId}:currentQuestion`);
        if(!data) return null;
        const question: Question = JSON.parse(data);
        return question;
    }

    async evaluateAnswer(questionId: string, answer: number): Promise<score> {
        const [question, ttl] = await Promise.all([this.getCurrentQuestion(), this.redisPub.ttl(`quiz:${this.quizId}:currentQuestion`)]);
        if(!question) {
            return ({
                score: 0,
                timetaken: 0
            } as score);
        }
        if(question.id !== questionId) {
            return ({
                score: 0,
                timetaken: (question.timeLimit*60) - ttl,
            } as score);
        }
        if(question.answerIndex === answer) {
            return ({
                score: question.marks + (ttl/(question.timeLimit*60)) * (question.timeLimit/3),
                timetaken: (question.timeLimit*60) - ttl,
            }as score);
        }
        return ({
            score: 0,
            timetaken: (question.timeLimit*60) - ttl,
        } as score);
    }

    async publishNewQuestion(question: Question): Promise<void> {
        await this.redisPub.publish(`quiz:${this.quizId}:newQuestion`, JSON.stringify({id: question.id, question: question.question, options: question.options, timeLimit: question.timeLimit, marks: question.marks}));
    }

    async publishUpdates(type: string, message: string): Promise<void> {
        if(type==="USERS_IN_ROOM") {
            const payload: sendUsersPayload = JSON.parse(message);
            const m: WSMessage = {
                type,
                payload,
            }
            await this.redisPub.publish(`quiz:${this.quizId}:updates`, JSON.stringify(m));
        } else if(type==="QUIZ_STARTED") {
            const payload: QuizUpdatePayload = {
                message,
                quizId: this.quizId,
            };
            const m: WSMessage = {
                type,
                payload,
            };
            await this.redisPub.publish(`quiz:${this.quizId}:updates`, JSON.stringify(m));
        } else {
            const payload: QuizStartPayload = {
                message,
                quizId: this.quizId,
                attemptId: null,
            };
            const m: WSMessage = {
                type,
                payload,
            };
            await this.redisPub.publish(`quiz:${this.quizId}:updates`, JSON.stringify(m));
        }
    }

    async subscribe(handler1: (message: string) => void, handler2: (messsage: string) => void): Promise<void> {
        await this.redisSub.subscribe(`quiz:${this.quizId}:updates`, handler2);
        await this.redisSub.subscribe(`quiz:${this.quizId}:newQuestion`, handler1);
    }

    async unsubscribe(): Promise<void> {
        await this.redisSub.unsubscribe(`quiz:${this.quizId}:currentQuestion`);
    }

    async subscibeToExpiry(): Promise<void> {
        await this.redisSub.subscribe("__keyevent@0__:expired", async (key) => {
            if(key===`quiz:${this.quizId}:currentQuestion`) {
                const test = await this.addNewCurrentQuestion();
                if(!test) {
                    await this.redisSub.unsubscribe("__keyevent@0__:expired");
                    await this.publishUpdates("QUIZ_END", "This quiz has ended.");
                    await this.unsubscribe();
                    await this.redisSub.quit();
                }
            }
        });
        console.log(`subscribed to expiry on `, server.address());
    }
}