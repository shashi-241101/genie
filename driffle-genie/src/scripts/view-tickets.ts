import { connectMongoDB, disconnectMongoDB } from "../config/mongodb.config";
import { Ticket } from "../models";

async function viewTickets() {
    try {
        await connectMongoDB();
        console.log("Connected to MongoDB\n");

        const tickets = await Ticket.find({}).sort({ createdAt: -1 }).lean();

        console.log(`Found ${tickets.length} tickets:\n`);
        console.log("=".repeat(100));

        tickets.forEach((ticket, index) => {
            const metadata = ticket.metadata as any;
            const description = metadata?.description || "N/A";

            console.log(`\nTicket ${index + 1}:`);
            console.log(`  ID: ${ticket.ticketId}`);
            console.log(`  Email: ${ticket.customerEmail || "N/A"}`);
            console.log(`  Status: ${ticket.status}`);
            console.log(`  Customer: ${ticket.customerName || "N/A"}`);
            console.log(`  Reason: ${ticket.subject}`);
            console.log(`  Description: ${description}`);
            console.log(`  Priority: ${ticket.priority}`);
            console.log(`  Created: ${ticket.createdAt}`);
        });

        console.log("\n" + "=".repeat(100));

        // Also show in JSON format
        const formattedTickets = tickets.map((ticket) => {
            const metadata = ticket.metadata as any;
            return {
                id: ticket.ticketId,
                email: ticket.customerEmail,
                status: ticket.status,
                customer: ticket.customerName,
                reason: ticket.subject,
                description: metadata?.description || null,
            };
        });

        console.log("\n\nTickets in requested format (JSON):");
        console.log(JSON.stringify(formattedTickets, null, 2));

        await disconnectMongoDB();
        process.exit(0);
    } catch (error) {
        console.error("Error viewing tickets:", error);
        await disconnectMongoDB();
        process.exit(1);
    }
}

viewTickets();
