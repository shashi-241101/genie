import { NextFunction, Request, Response } from "express";
import { HttpCustomError } from "../utils/error.util";

export default async function ErrorHandler(
    error: HttpCustomError | Error,
    request: Request,
    response: Response,
    next: NextFunction
) {
    const NODE_ENV = String(process.env.NODE_ENV).toLowerCase();
    let includeStack = false;
    if (NODE_ENV === "development") includeStack = true;

    console.log("Error Handler", error);
    try {
        if (error instanceof HttpCustomError) {
            response.status(error.status).json({
                status: error.status,
                name: error.name,
                message: error.message,
                data: error.data,
                stack: includeStack ? error.stack : undefined,
            });
        } else {
            response.status(500).json({
                status: 500,
                name: "INTERNAL_SERVER_ERROR",
                message: error.message || "An unexpected error occurred",
                stack: includeStack ? error?.stack : undefined,
                data: null,
            });
        }
    } catch (error) {
        console.log("Error Handler Error", error);
        next(error);
    }
}
