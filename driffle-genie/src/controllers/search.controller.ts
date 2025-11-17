import { NextFunction, Request, Response } from "express";
import { HttpCustomError } from "../utils/error.util";
import { resolveSearch } from "../services/search.service";
import { z } from "zod";

export async function SearchController(
    request: Request,
    response: Response,
    next: NextFunction
) {
    try {
        const body = request.body as {
            chats: {
                text: string;
                type: "human" | "assistant";
            }[];
        };
        const validationSchema = z.object({
            chats: z.array(
                z.object({
                    text: z.string().min(1),
                    type: z.enum(["human", "assistant"]),
                })
            ),
        });
        const validate = validationSchema.safeParse(body);
        if (!validate.success) {
            throw new HttpCustomError({
                message: "Invalid request body",
                status: 400,
                name: "BAD_REQUEST",
            });
        }
        const res = await resolveSearch(body.chats);
        return response.status(200).json({
            data: res,
            message: "Search results",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}
