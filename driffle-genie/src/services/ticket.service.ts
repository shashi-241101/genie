import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Ticket, ChatMessage, Order, TicketSummary } from "../models";

interface TicketContext {
    ticket: any;
    chatHistory: any[];
    orders: any[];
}

export async function generateTicketSummary(ticketId: string): Promise<any> {
    try {
        // Fetch ticket, chat history, and orders
        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const chatHistory = await ChatMessage.find({ ticketId })
            .sort({ timestamp: 1 })
            .lean();

        const orders = await Order.find({ userId: ticket.userId })
            .sort({ orderDate: -1 })
            .limit(10)
            .lean();

        // Prepare context for AI
        const context: TicketContext = {
            ticket: ticket.toObject(),
            chatHistory: chatHistory,
            orders: orders,
        };

        // Generate summary using AI
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash-exp-0827",
            apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
            temperature: 0.7,
        });

        const chatHistoryText = chatHistory
            .map((msg) => `${msg.senderType}: ${msg.content}`)
            .join("\n");

        const ordersText =
            orders.length > 0
                ? orders
                      .map(
                          (order) =>
                              `Order ${order.orderId}: ${order.items
                                  .map((i: any) => i.productName)
                                  .join(", ")} - ${order.status} - ${
                                  order.totalAmount
                              } ${order.currency}`
                      )
                      .join("\n")
                : "No order history available";

        const prompt = `You are an AI assistant analyzing a customer support ticket. Generate a comprehensive summary with the following information:

TICKET DETAILS:
- Ticket ID: ${ticket.ticketId}
- Subject: ${ticket.subject}
- Status: ${ticket.status}
- Priority: ${ticket.priority}
- Customer: ${ticket.customerName || ticket.customerEmail || "Unknown"}

CHAT HISTORY:
${chatHistoryText}

ORDER HISTORY:
${ordersText}

Please provide a JSON response with the following structure:
{
    "summary": "A comprehensive summary of the ticket issue and conversation",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "customerTone": "positive|neutral|negative|frustrated|angry",
    "sentimentScore": -1.0 to 1.0 (where -1 is very negative, 0 is neutral, 1 is very positive),
    "suggestedResponse": "A suggested response for the support agent",
    "suggestedActions": ["Action 1", "Action 2"],
    "contextSummary": {
        "chatHistory": "Summary of chat history",
        "orderHistory": "Summary of order history",
        "ticketDetails": "Summary of ticket details"
    }
}

Analyze the customer's tone and sentiment carefully. Consider:
- Language used (formal, casual, angry, frustrated)
- Frequency of messages
- Escalation patterns
- Order history context
- Overall sentiment`;

        const response = await model.invoke([
            [
                "system",
                "You are an expert customer support analyst. Analyze tickets and provide actionable insights.",
            ],
            ["user", prompt],
        ]);

        let summaryData;
        try {
            summaryData = JSON.parse(response.content as string);
        } catch (e) {
            // Fallback if JSON parsing fails
            summaryData = {
                summary: response.content as string,
                keyPoints: [],
                customerTone: "neutral",
                sentimentScore: 0,
                suggestedResponse: "",
                suggestedActions: [],
                contextSummary: {
                    chatHistory: chatHistoryText.substring(0, 500),
                    orderHistory: ordersText.substring(0, 500),
                    ticketDetails: `Ticket ${ticket.ticketId}: ${ticket.subject}`,
                },
            };
        }

        // Save or update ticket summary
        const ticketSummary = await TicketSummary.findOneAndUpdate(
            { ticketId },
            {
                ...summaryData,
                ticketId,
                updatedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        return ticketSummary;
    } catch (error) {
        console.error("Error generating ticket summary:", error);
        throw error;
    }
}

export async function analyzeCustomerTone(messages: any[]): Promise<{
    tone: string;
    sentiment: string;
    sentimentScore: number;
}> {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash-exp-0827",
            apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
            temperature: 0.3,
        });

        const userMessages = messages
            .filter((msg) => msg.senderType === "user")
            .map((msg) => msg.content)
            .join("\n");

        const prompt = `Analyze the customer's tone and sentiment from these messages:

${userMessages}

Provide a JSON response:
{
    "tone": "positive|neutral|negative|frustrated|angry",
    "sentiment": "positive|neutral|negative",
    "sentimentScore": -1.0 to 1.0
}`;

        const response = await model.invoke([
            ["system", "You are a sentiment analysis expert."],
            ["user", prompt],
        ]);

        try {
            return JSON.parse(response.content as string);
        } catch (e) {
            return {
                tone: "neutral",
                sentiment: "neutral",
                sentimentScore: 0,
            };
        }
    } catch (error) {
        console.error("Error analyzing customer tone:", error);
        return {
            tone: "neutral",
            sentiment: "neutral",
            sentimentScore: 0,
        };
    }
}

export async function suggestResponse(
    ticketId: string,
    agentMessage?: string
): Promise<string> {
    try {
        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const chatHistory = await ChatMessage.find({ ticketId })
            .sort({ timestamp: 1 })
            .limit(20)
            .lean();

        const summary = await TicketSummary.findOne({ ticketId });

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash-exp-0827",
            apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
            temperature: 0.7,
        });

        const recentChat = chatHistory
            .slice(-10)
            .map((msg) => `${msg.senderType}: ${msg.content}`)
            .join("\n");

        const prompt = `You are an AI assistant helping a customer support agent respond to a customer.

TICKET SUMMARY:
${summary?.summary || "No summary available"}

CUSTOMER TONE: ${summary?.customerTone || "neutral"}

RECENT CONVERSATION:
${recentChat}

${
    agentMessage
        ? `AGENT'S DRAFT MESSAGE: ${agentMessage}\n\nPlease improve or suggest an alternative response.`
        : "Suggest an appropriate response to the customer."
}

Guidelines:
- Be empathetic and professional
- Address the customer's concerns directly
- Match the customer's tone appropriately
- Provide clear next steps if needed
- Keep the response concise but helpful

Provide only the suggested response text, no additional formatting.`;

        const response = await model.invoke([
            [
                "system",
                "You are an expert customer support assistant helping agents write effective responses.",
            ],
            ["user", prompt],
        ]);

        return response.content as string;
    } catch (error) {
        console.error("Error suggesting response:", error);
        return "I apologize for the inconvenience. Let me help you resolve this issue.";
    }
}
