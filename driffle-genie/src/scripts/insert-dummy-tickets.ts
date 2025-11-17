import { connectMongoDB, disconnectMongoDB } from "../config/mongodb.config";
import { Ticket } from "../models";
import { randomUUID } from "crypto";

const dummyTickets = [
    {
        id: `TKT-${Date.now()}-${randomUUID().substring(0, 8).toUpperCase()}`,
        email: "john.doe@example.com",
        status: "open",
        customer: "John Doe",
        reason: "Order not received",
        description:
            "I placed an order 5 days ago but haven't received it yet. The tracking shows it's still in transit.",
    },
    {
        id: `TKT-${Date.now() + 1}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "sarah.smith@example.com",
        status: "assigned",
        customer: "Sarah Smith",
        reason: "Product key not working",
        description:
            "I purchased a game key but when I try to redeem it on Steam, it says the key is invalid or already used.",
    },
    {
        id: `TKT-${Date.now() + 2}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "mike.johnson@example.com",
        status: "in_progress",
        customer: "Mike Johnson",
        reason: "Refund request",
        description:
            "I want to refund my recent purchase. The game doesn't work on my system and I've tried all troubleshooting steps.",
    },
    {
        id: `TKT-${Date.now() + 3}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "emily.brown@example.com",
        status: "open",
        customer: "Emily Brown",
        reason: "Account access issue",
        description:
            "I can't log into my account. It says my password is incorrect but I'm sure it's correct. I've tried resetting it multiple times.",
    },
    {
        id: `TKT-${Date.now() + 4}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "david.wilson@example.com",
        status: "resolved",
        customer: "David Wilson",
        reason: "Payment failed",
        description:
            "My payment was declined but the money was deducted from my account. I need help resolving this issue.",
    },
    {
        id: `TKT-${Date.now() + 5}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "lisa.anderson@example.com",
        status: "open",
        customer: "Lisa Anderson",
        reason: "Wrong product received",
        description:
            "I ordered Game A but received Game B instead. I need to exchange it for the correct product.",
    },
    {
        id: `TKT-${Date.now() + 6}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "james.taylor@example.com",
        status: "assigned",
        customer: "James Taylor",
        reason: "Subscription cancellation",
        description:
            "I want to cancel my subscription but I can't find the cancellation option in my account settings.",
    },
    {
        id: `TKT-${Date.now() + 7}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "jennifer.martinez@example.com",
        status: "in_progress",
        customer: "Jennifer Martinez",
        reason: "Technical support needed",
        description:
            "The game keeps crashing after the latest update. I've updated my drivers and reinstalled the game but it still crashes.",
    },
    {
        id: `TKT-${Date.now() + 8}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "robert.thomas@example.com",
        status: "closed",
        customer: "Robert Thomas",
        reason: "Billing inquiry",
        description:
            "I was charged twice for the same order. I need a refund for the duplicate charge.",
    },
    {
        id: `TKT-${Date.now() + 9}-${randomUUID()
            .substring(0, 8)
            .toUpperCase()}`,
        email: "amanda.garcia@example.com",
        status: "open",
        customer: "Amanda Garcia",
        reason: "Product compatibility question",
        description:
            "I want to know if this game is compatible with my system before purchasing. My specs are: Windows 10, 8GB RAM, GTX 1050.",
    },
];

async function insertDummyTickets() {
    try {
        // Connect to MongoDB
        await connectMongoDB();
        console.log("Connected to MongoDB");

        // Clear existing tickets (optional - comment out if you want to keep existing data)
        // await Ticket.deleteMany({});
        // console.log("Cleared existing tickets");

        // Insert dummy tickets
        const ticketsToInsert = dummyTickets.map((ticket) => ({
            ticketId: ticket.id,
            userId: `user-${ticket.email.split("@")[0]}`,
            customerEmail: ticket.email,
            customerName: ticket.customer,
            subject: ticket.reason,
            status: ticket.status as
                | "open"
                | "assigned"
                | "in_progress"
                | "resolved"
                | "closed",
            priority: getPriorityFromStatus(ticket.status),
            metadata: {
                description: ticket.description,
                source: "dummy_data",
                category: getCategoryFromReason(ticket.reason),
            },
        }));

        const result = await Ticket.insertMany(ticketsToInsert);
        console.log(
            `\n✅ Successfully inserted ${result.length} dummy tickets!`
        );
        console.log("\nInserted tickets:");
        result.forEach((ticket, index) => {
            console.log(
                `${index + 1}. ${ticket.ticketId} - ${ticket.customerName} (${
                    ticket.status
                })`
            );
        });

        // Disconnect
        await disconnectMongoDB();
        console.log("\nMongoDB disconnected");
        process.exit(0);
    } catch (error) {
        console.error("Error inserting dummy tickets:", error);
        await disconnectMongoDB();
        process.exit(1);
    }
}

function getPriorityFromStatus(
    status: string
): "low" | "medium" | "high" | "urgent" {
    switch (status) {
        case "open":
            return "medium";
        case "assigned":
            return "high";
        case "in_progress":
            return "high";
        case "resolved":
            return "low";
        case "closed":
            return "low";
        default:
            return "medium";
    }
}

function getCategoryFromReason(reason: string): string {
    const lowerReason = reason.toLowerCase();
    if (
        lowerReason.includes("order") ||
        lowerReason.includes("received") ||
        lowerReason.includes("product")
    ) {
        return "order_issue";
    }
    if (lowerReason.includes("key") || lowerReason.includes("redeem")) {
        return "product_key";
    }
    if (
        lowerReason.includes("refund") ||
        lowerReason.includes("payment") ||
        lowerReason.includes("billing")
    ) {
        return "billing";
    }
    if (
        lowerReason.includes("account") ||
        lowerReason.includes("access") ||
        lowerReason.includes("login")
    ) {
        return "account";
    }
    if (
        lowerReason.includes("technical") ||
        lowerReason.includes("crash") ||
        lowerReason.includes("compatibility")
    ) {
        return "technical";
    }
    if (
        lowerReason.includes("subscription") ||
        lowerReason.includes("cancellation")
    ) {
        return "subscription";
    }
    return "general";
}

// Run the script
insertDummyTickets();
