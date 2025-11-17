import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Ticket, ChatMessage } from "../models";
import { randomUUID } from "crypto";
import { analyzeCustomerTone, suggestResponse } from "./ticket.service";

interface ChatMessageInput {
    ticketId: string;
    senderId: string;
    senderType: "user" | "ai_agent" | "human_agent";
    senderName?: string;
    content: string;
}

export async function saveChatMessage(
    messageData: ChatMessageInput
): Promise<any> {
    try {
        const message = new ChatMessage({
            ...messageData,
            messageId: randomUUID(),
            timestamp: new Date(),
        });

        await message.save();
        return message;
    } catch (error) {
        console.error("Error saving chat message:", error);
        throw error;
    }
}

export async function getChatHistory(
    ticketId: string,
    limit: number = 50
): Promise<any[]> {
    try {
        const messages = await ChatMessage.find({ ticketId })
            .sort({ timestamp: 1 })
            .limit(limit)
            .lean();

        return messages;
    } catch (error) {
        console.error("Error fetching chat history:", error);
        throw error;
    }
}

export async function handleUserMessage(
    ticketId: string,
    userId: string,
    userMessage: string
): Promise<{ response: string; shouldEscalate: boolean }> {
    try {
        // Save user message
        await saveChatMessage({
            ticketId,
            senderId: userId,
            senderType: "user",
            content: userMessage,
        });

        // Get chat history
        const chatHistory = await getChatHistory(ticketId, 20);

        // Analyze tone
        const toneAnalysis = await analyzeCustomerTone(chatHistory);

        // Check if escalation is needed
        const shouldEscalate = shouldEscalateToHuman(chatHistory, toneAnalysis);

        // Generate AI response
        const aiResponse = await generateAIResponse(
            ticketId,
            chatHistory,
            userMessage
        );

        // Save AI response
        await saveChatMessage({
            ticketId,
            senderId: "ai_agent",
            senderType: "ai_agent",
            senderName: "AI Assistant",
            content: aiResponse,
        });

        // If escalation needed, update ticket
        if (shouldEscalate) {
            await Ticket.findOneAndUpdate(
                { ticketId },
                {
                    status: "assigned",
                    metadata: {
                        ...(await Ticket.findOne({ ticketId }))?.metadata,
                        escalatedBy: "ai_agent",
                        escalationReason:
                            "Complex issue or negative sentiment detected",
                    },
                }
            );
        }

        return {
            response: aiResponse,
            shouldEscalate,
        };
    } catch (error) {
        console.error("Error handling user message:", error);
        throw error;
    }
}

async function generateAIResponse(
    ticketId: string,
    chatHistory: any[],
    currentMessage: string
): Promise<string> {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash-exp-0827",
            apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
            temperature: 0.7,
        });

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const conversationContext = chatHistory
            .map((msg) => `${msg.senderType}: ${msg.content}`)
            .join("\n");

        const systemPrompt = `You are a helpful AI customer support assistant for Driffle, a gaming platform. 

TICKET INFORMATION:
- Subject: ${ticket.subject}
- Status: ${ticket.status}
- Priority: ${ticket.priority}

CONVERSATION HISTORY:
${conversationContext}

CURRENT USER MESSAGE:
${currentMessage}

Guidelines:
- Be friendly, professional, and empathetic
- Provide clear and helpful responses
- If you cannot resolve the issue, acknowledge it and indicate that a human agent will assist
- Keep responses concise but informative
- Use the conversation history to maintain context

Respond naturally to the user's message.`;

        const response = await model.invoke([
            ["system", systemPrompt],
            ["user", currentMessage],
        ]);

        return response.content as string;
    } catch (error) {
        console.error("Error generating AI response:", error);
        return "I apologize, but I'm having trouble processing your request right now. Please try again or wait for a human agent to assist you.";
    }
}

function shouldEscalateToHuman(
    chatHistory: any[],
    toneAnalysis: { tone: string; sentiment: string; sentimentScore: number }
): boolean {
    // Escalate if:
    // 1. Negative sentiment is strong
    if (toneAnalysis.sentimentScore < -0.5) {
        return true;
    }

    // 2. Customer is frustrated or angry
    if (["frustrated", "angry"].includes(toneAnalysis.tone)) {
        return true;
    }

    // 3. Multiple messages without resolution (more than 5 exchanges)
    const userMessages = chatHistory.filter((msg) => msg.senderType === "user");
    if (userMessages.length > 5) {
        return true;
    }

    // 4. Customer explicitly asks for human agent
    const lastUserMessage =
        userMessages[userMessages.length - 1]?.content?.toLowerCase() || "";
    if (
        lastUserMessage.includes("human") ||
        lastUserMessage.includes("agent") ||
        lastUserMessage.includes("representative") ||
        lastUserMessage.includes("speak to someone")
    ) {
        return true;
    }

    return false;
}

export async function handleAgentMessage(
    ticketId: string,
    agentId: string,
    agentName: string,
    agentMessage: string,
    requestSuggestion: boolean = false
): Promise<{ message: any; suggestedResponse?: string }> {
    try {
        // Save agent message
        const savedMessage = await saveChatMessage({
            ticketId,
            senderId: agentId,
            senderType: "human_agent",
            senderName: agentName,
            content: agentMessage,
        });

        // Update ticket status
        await Ticket.findOneAndUpdate(
            { ticketId },
            {
                status: "in_progress",
                assignedAgentId: agentId,
                assignedAgentName: agentName,
                assignedAt: new Date(),
            }
        );

        let suggestedResponse: string | undefined;
        if (requestSuggestion) {
            suggestedResponse = await suggestResponse(ticketId, agentMessage);
        }

        return {
            message: savedMessage,
            suggestedResponse,
        };
    } catch (error) {
        console.error("Error handling agent message:", error);
        throw error;
    }
}

export async function createTicket(
    userId: string,
    subject: string,
    initialMessage: string,
    customerEmail?: string,
    customerName?: string
): Promise<{ ticket: any; aiResponse: string }> {
    try {
        const ticketId = `TKT-${Date.now()}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`;

        // Create ticket
        const ticket = new Ticket({
            ticketId,
            userId,
            subject,
            status: "open",
            priority: "medium",
            customerEmail,
            customerName,
        });

        await ticket.save();

        // Save initial user message
        await saveChatMessage({
            ticketId,
            senderId: userId,
            senderType: "user",
            content: initialMessage,
        });

        // Generate AI response
        const chatHistory = await getChatHistory(ticketId);
        const aiResponse = await generateAIResponse(
            ticketId,
            chatHistory,
            initialMessage
        );

        // Save AI response
        await saveChatMessage({
            ticketId,
            senderId: "ai_agent",
            senderType: "ai_agent",
            senderName: "AI Assistant",
            content: aiResponse,
        });

        return {
            ticket: ticket.toObject(),
            aiResponse,
        };
    } catch (error) {
        console.error("Error creating ticket:", error);
        throw error;
    }
}
