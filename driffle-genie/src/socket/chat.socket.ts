import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { Ticket, ChatMessage } from "../models";

// Helper function remains the same
const createBotMessage = (ticketId: string, content: string) => ({
    ticketId,
    senderType: "ai_agent",
    senderId: "ai_agent",
    senderName: "Genie",
    content: content,
    messageType: "text",
    timestamp: new Date(),
});

// Helper function to save and broadcast any message
const saveAndBroadcastMessage = async (
    io: SocketIOServer,
    ticketId: string,
    messageData: any
) => {
    // In a real app, you would save this to your ChatMessage model here.
    // await ChatMessage.create(messageData);
    await ChatMessage.create(messageData);
    console.log("📝 Message saved to DB:", messageData.content);
    console.log("Broadcasting message:", messageData);
    io.to(`ticket:${ticketId}`).emit("new_message", {
        ticketId,
        messages: [messageData],
    });
};

export function setupChatSocket(server: HTTPServer) {
    const io = new SocketIOServer(server, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log(`✅ Connection established: ${socket.id}`);
        socket.data.conversationStep = 0;

        socket.on(
            "join_ticket",
            async (data: {
                ticketId: string;
                userId: string;
                userType: "user" | "agent";
            }) => {
                try {
                    const { ticketId, userId, userType } = data;

                    if (userType === "user") {
                        console.log(
                            `⚠️ DEMO MODE: Resetting ticket ${ticketId} for user connection.`
                        );
                        await Ticket.updateOne(
                            { ticketId },
                            { $set: { status: "open" } }
                        );
                        await ChatMessage.deleteMany({ ticketId });
                        console.log(
                            `🔥 DEMO MODE: Old chat history for ${ticketId} deleted.`
                        );
                    }

                    const ticket = await Ticket.findOne({ ticketId });

                    console.log("This is the ticket", ticket);

                    if (!ticket) {
                        return socket.emit("join_failed", {
                            reason: "Ticket not found.",
                        });
                    }

                    // User access check
                    if (
                        userType === "user" &&
                        String(ticket.userId) !== String(userId)
                    ) {
                        return socket.emit("join_failed", {
                            reason: "Access denied.",
                        });
                    }

                    socket.join(`ticket:${ticketId}`);
                    console.log(
                        `${userType} ${userId} joined room: ticket:${ticketId}`
                    );

                    // Send the chat history to whoever just joined.
                    const chatHistory = await ChatMessage.find({ ticketId })
                        .sort({ timestamp: 1 })
                        .lean();
                    console.log(
                        `Found ${chatHistory.length} messages in history for ticket ${ticketId}.`
                    );
                    // const chatHistory = await getChatHistory(ticketId);
                    socket.emit("chat_history", {
                        ticketId,
                        messages: chatHistory,
                    });

                    if (
                        userType === "user" &&
                        ticket.status === "open" &&
                        chatHistory.length === 0
                    ) {
                        const welcomeMessage = createBotMessage(
                            ticketId,
                            `Hello ${ticket.customerName}! I see your ticket is about: "${ticket.subject}".`
                        );
                        const followUpMessage = createBotMessage(
                            ticketId,
                            "To get started, could you please explain the issue in a bit more detail?"
                        );

                        // --- FIX #2 APPLIED HERE ---
                        // We now use the helper function to SAVE and broadcast the welcome messages.
                        await saveAndBroadcastMessage(
                            io,
                            ticketId,
                            welcomeMessage
                        );
                        await saveAndBroadcastMessage(
                            io,
                            ticketId,
                            followUpMessage
                        );

                        socket.data.conversationStep = 0;
                    }
                } catch (error) {
                    console.error("Error in join_ticket:", error);
                }
            }
        );

        socket.on(
            "user_message",
            async (data: {
                ticketId: string;
                userId: string;
                message: string;
            }) => {
                try {
                    const { ticketId, userId, message } = data;
                    const ticket = await Ticket.findOne({ ticketId });
                    if (!ticket) return;

                    const userMessageData = {
                        ticketId,
                        senderType: "user",
                        senderId: userId,
                        content: message,
                        messageType: "text",
                        timestamp: new Date(),
                    };

                    // --- THE HANDOFF LOGIC ---
                    if (ticket.status === "open") {
                        // BOT IS IN CONTROL
                        let botResponse;
                        switch (socket.data.conversationStep) {
                            case 0:
                                botResponse = createBotMessage(
                                    ticketId,
                                    "Thank you for the details. To verify your account, could you please provide the email address associated with your purchase?"
                                );
                                socket.data.conversationStep++;
                                break;
                            case 1:
                                botResponse = createBotMessage(
                                    ticketId,
                                    "Perfect, thank you! I am now creating a support ticket and assigning a human agent to review your case. Please wait a moment."
                                );
                                // --- THE BOT'S FINAL ACT: UPDATE THE TICKET STATUS ---
                                await Ticket.updateOne(
                                    { ticketId },
                                    { $set: { status: "pending_agent" } }
                                );
                                console.log(
                                    `Ticket ${ticketId} status updated to pending_agent. Handoff complete.`
                                );
                                socket.data.conversationStep++;
                                break;
                            default:
                                botResponse = createBotMessage(
                                    ticketId,
                                    "An agent will be with you shortly. Thank you for your patience."
                                );
                                break;
                        }
                        // Save and broadcast both user message and bot response
                        await saveAndBroadcastMessage(
                            io,
                            ticketId,
                            userMessageData
                        );
                        await saveAndBroadcastMessage(
                            io,
                            ticketId,
                            botResponse
                        );
                    } else {
                        // HUMAN AGENT IS IN CONTROL
                        // Bot does nothing. Just save and broadcast the user's message for the agent to see.
                        await saveAndBroadcastMessage(
                            io,
                            ticketId,
                            userMessageData
                        );
                    }
                } catch (error) {
                    console.error("Error in user_message:", error);
                }
            }
        );

        // This existing handler is now perfect for the agent to use.
        socket.on(
            "agent_message",
            async (data: {
                ticketId: string;
                agentId: string;
                agentName: string;
                message: string;
            }) => {
                try {
                    const { ticketId, agentId, agentName, message } = data;
                    const agentMessageData = {
                        ticketId,
                        senderType: "agent",
                        senderId: agentId,
                        senderName: agentName,
                        content: message,
                        messageType: "text",
                        timestamp: new Date(),
                    };
                    await saveAndBroadcastMessage(
                        io,
                        ticketId,
                        agentMessageData
                    );
                } catch (error) {
                    console.error("Error in agent_message:", error);
                }
            }
        );

        socket.on("disconnect", () =>
            console.log(`🔌 Connection closed: ${socket.id}`)
        );
    });
    return io;
}
