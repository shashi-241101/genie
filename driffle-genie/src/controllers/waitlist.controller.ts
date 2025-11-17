import { NextFunction, Request, Response } from "express";
import { HttpCustomError } from "../utils/error.util";
import { z } from "zod";
import axios from "axios";

export async function WaitlistController(
    request: Request,
    response: Response,
    next: NextFunction
) {
    try {
        const body = request.body as {
            email: string;
        };
        // const validationSchema = z.object({
        //     email: z.string().email(),
        // });
        // const validate = validationSchema.safeParse(body);
        // if (!validate.success) {
        //     throw new HttpCustomError({
        //         message: "Invalid request body",
        //         status: 400,
        //         name: "BAD_REQUEST",
        //     });
        // }
        try {
            await axios.post(
                "https://api.driffle.com" + `/public/newsletter/subscribe`,
                {
                    email: body.email,
                }
            );
            return response.status(200).json({
                data: null,
                message: "Registered successfully!",
                status: 200,
            });
        } catch (e: any) {
            throw new HttpCustomError({
                message: e?.response?.data?.message,
                status: 400,
                name: "BAD_REQUEST",
            });
        }
    } catch (error) {
        return next(error);
    }
}
