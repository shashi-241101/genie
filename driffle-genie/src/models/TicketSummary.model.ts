import mongoose, { Schema, Document } from "mongoose";

export interface ITicketSummary extends Document {
    ticketId: string;
    summary: string;
    keyPoints: string[];
    customerTone: "positive" | "neutral" | "negative" | "frustrated" | "angry";
    sentimentScore: number; // -1 to 1
    suggestedResponse?: string;
    suggestedActions?: string[];
    contextSummary: {
        chatHistory: string;
        orderHistory?: string;
        ticketDetails: string;
    };
    generatedAt: Date;
    updatedAt: Date;
}

const TicketSummarySchema = new Schema<ITicketSummary>(
    {
        ticketId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        summary: {
            type: String,
            required: true,
        },
        keyPoints: [String],
        customerTone: {
            type: String,
            enum: ["positive", "neutral", "negative", "frustrated", "angry"],
            required: true,
        },
        sentimentScore: {
            type: Number,
            required: true,
            min: -1,
            max: 1,
        },
        suggestedResponse: String,
        suggestedActions: [String],
        contextSummary: {
            chatHistory: String,
            orderHistory: String,
            ticketDetails: String,
        },
        generatedAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

export const TicketSummary = mongoose.model<ITicketSummary>(
    "TicketSummary",
    TicketSummarySchema
);
