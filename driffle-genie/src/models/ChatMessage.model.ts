import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
    ticketId: string;
    senderType: "user" | "ai_agent" | "agent";
    senderId: string;
    senderName?: string;
    content: string;
    messageType: "text" | "image";
    timestamp: Date;
}

const ChatMessageSchema: Schema = new Schema(
    {
        ticketId: { type: String, required: true, index: true },
        senderType: {
            type: String,
            required: true,
            enum: ["user", "ai_agent", "agent"],
        },
        senderId: { type: String, required: true },
        senderName: { type: String },
        content: { type: String, required: true },
        messageType: { type: String, required: true, default: "text" },
        timestamp: { type: Date, default: Date.now },
    },
    {
        timestamps: true, // This will add createdAt and updatedAt fields
    }
);

export const ChatMessage = mongoose.model<IChatMessage>(
    "ChatMessage",
    ChatMessageSchema
);
