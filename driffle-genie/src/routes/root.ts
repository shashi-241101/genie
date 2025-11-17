import { Router } from "express";
import { SearchController } from "../controllers/search.controller";
import { WaitlistController } from "../controllers/waitlist.controller";
import {
    createTicketController,
    sendUserMessageController,
    sendAgentMessageController,
    getChatHistoryController,
    getUserTicketsController,
    getAllTicketsController,
} from "../controllers/chat.controller";
import {
    getTicketSummaryController,
    getSuggestedResponseController,
    getTicketDetailsController,
} from "../controllers/ticket.controller";

const root = Router();

// Existing routes
root.post("/chat", SearchController);
root.post("/waitlist", WaitlistController);

// Ticket routes
root.post("/tickets", createTicketController);
root.get("/tickets", getAllTicketsController);
root.get("/tickets/user/:userId", getUserTicketsController);
root.get("/tickets/:ticketId", getTicketDetailsController);
root.get("/tickets/:ticketId/summary", getTicketSummaryController);
root.post(
    "/tickets/:ticketId/suggest-response",
    getSuggestedResponseController
);

// Chat routes
root.post("/tickets/:ticketId/messages/user", sendUserMessageController);
root.post("/tickets/:ticketId/messages/agent", sendAgentMessageController);
root.get("/tickets/:ticketId/messages", getChatHistoryController);

export default root;
