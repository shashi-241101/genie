import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
    ticketId: string;
    userId: string;
    customerEmail?: string;
    customerName?: string;
    subject: string;
    status: "open" | "assigned" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    assignedAgentId?: string;
    assignedAgentName?: string;
    assignedAt?: Date;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    metadata?: {
        source?: string;
        category?: string;
        tags?: string[];
    };
}

const TicketSchema = new Schema<ITicket>(
    {
        ticketId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        customerEmail: {
            type: String,
            index: true,
        },
        customerName: {
            type: String,
        },
        subject: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["open", "assigned", "in_progress", "resolved", "closed"],
            default: "open",
            index: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        assignedAgentId: {
            type: String,
            index: true,
        },
        assignedAgentName: {
            type: String,
        },
        assignedAt: {
            type: Date,
        },
        resolvedAt: {
            type: Date,
        },
        metadata: {
            source: String,
            category: String,
            tags: [String],
            description: String,
        },
    },
    {
        timestamps: true,
    }
);

export const Ticket = mongoose.model<ITicket>("Ticket", TicketSchema);
