import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

export default function rid(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const uuid = randomUUID();
    request.id = uuid;
    next();
}
