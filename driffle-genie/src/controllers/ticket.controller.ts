import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HttpCustomError } from "../utils/error.util";
import {
    generateTicketSummary,
    suggestResponse,
    analyzeCustomerTone,
} from "../services/ticket.service";
import { Ticket, ChatMessage, Order } from "../models";

export async function getTicketSummaryController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { ticketId } = req.params;

        if (!ticketId) {
            throw new HttpCustomError({
                message: "Ticket ID is required",
                status: 400,
                name: "BAD_REQUEST",
            });
        }

        const summary = await generateTicketSummary(ticketId);

        return res.status(200).json({
            data: summary,
            message: "Ticket summary generated successfully",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}

export async function getSuggestedResponseController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { ticketId } = req.params;
        const { agentMessage } = req.body;

        if (!ticketId) {
            throw new HttpCustomError({
                message: "Ticket ID is required",
                status: 400,
                name: "BAD_REQUEST",
            });
        }

        const suggestedResponse = await suggestResponse(ticketId, agentMessage);

        return res.status(200).json({
            data: { suggestedResponse },
            message: "Response suggestion generated",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}

export async function getTicketDetailsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { ticketId } = req.params;

        if (!ticketId) {
            throw new HttpCustomError({
                message: "Ticket ID is required",
                status: 400,
                name: "BAD_REQUEST",
            });
        }

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            throw new HttpCustomError({
                message: "Ticket not found",
                status: 404,
                name: "NOT_FOUND",
            });
        }

        const chatHistory = await ChatMessage.find({ ticketId })
            .sort({ timestamp: 1 })
            .lean();

        const orders = await Order.find({ userId: ticket.userId })
            .sort({ orderDate: -1 })
            .limit(10)
            .lean();

        // Analyze tone
        const toneAnalysis = await analyzeCustomerTone(chatHistory);

        return res.status(200).json({
            data: {
                ticket,
                chatHistory,
                orders,
                toneAnalysis,
            },
            message: "Ticket details retrieved successfully",
            status: 200,
        });
    } catch (error) {
        return next(error);
    }
}
