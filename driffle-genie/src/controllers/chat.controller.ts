import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HttpCustomError } from "../utils/error.util";
import {
    createTicket,
    handleUserMessage,
    handleAgentMessage,
    getChatHistory,
    saveChatMessage,
} from "../services/chat.service";
import { Ticket } from "../models";

// User creates a new ticket and starts chat
export async function createTicketController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const validationSchema = z.object({
            userId: z.string().min(1),
            subject: z.string().min(1),
            message: z.string().min(1),
            customerEmail: z.string().email().optional(),
            customerName: z.string().optional(),
        });

        const body = req.body;
        const validate = validationSchema.safeParse(body);

        if (!validate.success) {
            throw new HttpCustomError({
                message: "Invalid request body",
                status: 400,
                name: "BAD_REQUEST",
            });
        }

        const { userId, subject, message, customerEmail, customerName } =
            validate.data;

        const result = await createTicket(
            userId,
            subject,
            message,
            customerEmail,
            customerName
        );

        return res.status(201).json({
            data: result,
            message: "Ticket created successfully",
            status: 201,
        });
    } catch (error) {
        return next(error);
    }
}

// User sends a message in an existing ticket
export async function sendUserMessageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { ticketId } = req.params;

        const validationSchema = z.object({
            userId: z.string().min(1),
            message: z.string().min(1),
        });

        const body = req.body;
        const validate = validationSchema.safeParse(body);

        if (!validate.success) {
            throw new HttpCustomError({
                message: "Invalid request body",
                status: 400,
                name: "BAD_REQUEST",
            });
        }

        const { userId, message } = validate.data;

        // Verify ticket exists and belongs to user
        const ticket = await Ticket.findOne({ ticketId, userId });
        if (!ticket) {
            throw new HttpCustomError({
                message: "Ticket not found or access denied",
                status: 404,
                name: "NOT_FOUND",
            });
        }

        const result = await handleUserMessage(ticketId, userId, message);

        return res.status(200).json({
            data: result,
            message: "Message sent successfully",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}

// Agent sends a message in a ticket
export async function sendAgentMessageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { ticketId } = req.params;

        const validationSchema = z.object({
            agentId: z.string().min(1),
            agentName: z.string().min(1),
            message: z.string().min(1),
            requestSuggestion: z.boolean().optional(),
        });

        const body = req.body;
        const validate = validationSchema.safeParse(body);

        if (!validate.success) {
            throw new HttpCustomError({
                message: "Invalid request body",
                status: 400,
                name: "BAD_REQUEST",
            });
        }

        const { agentId, agentName, message, requestSuggestion } =
            validate.data;

        // Verify ticket exists
        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            throw new HttpCustomError({
                message: "Ticket not found",
                status: 404,
                name: "NOT_FOUND",
            });
        }

        const result = await handleAgentMessage(
            ticketId,
            agentId,
            agentName,
            message,
            requestSuggestion || false
        );

        return res.status(200).json({
            data: result,
            message: "Agent message sent successfully",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}

// Get chat history for a ticket
export async function getChatHistoryController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { ticketId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const messages = await getChatHistory(ticketId, limit);

        return res.status(200).json({
            data: messages,
            message: "Chat history retrieved successfully",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}

// Get all tickets for a user
export async function getUserTicketsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { userId } = req.params;

        const tickets = await Ticket.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            data: tickets,
            message: "User tickets retrieved successfully",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}

// Get all tickets (for agents/admin)
export async function getAllTicketsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const status = req.query.status as string;
        const priority = req.query.priority as string;
        const assignedAgentId = req.query.assignedAgentId as string;

        const query: any = {};
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedAgentId) query.assignedAgentId = assignedAgentId;

        const tickets = await Ticket.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            data: tickets,
            message: "Tickets retrieved successfully",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}
