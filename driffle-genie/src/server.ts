import app from "./app";
import { createServer } from "http";
import { setupChatSocket } from "./socket/chat.socket";
import { connectMongoDB } from "./config/mongodb.config";
import { Server } from "net";

const PORT = Number(process.env.PORT) || 8000;

// Function to find an available port
function findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = new Server();

        server.listen(startPort, () => {
            const port = (server.address() as { port: number })?.port;
            server.close(() => resolve(port || startPort));
        });

        server.on("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "EADDRINUSE") {
                // Try next port
                findAvailablePort(startPort + 1)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(err);
            }
        });
    });
}

async function startServer() {
    try {
        // Connect to MongoDB first
        await connectMongoDB();
        console.log("MongoDB connected successfully");

        // Find available port
        const availablePort = await findAvailablePort(PORT);

        if (availablePort !== PORT) {
            console.warn(
                `Port ${PORT} is in use, using port ${availablePort} instead`
            );
        }

        // Create HTTP server
        const httpServer = createServer(app);

        // Setup WebSocket
        setupChatSocket(httpServer);

        // Start server
        httpServer.listen(availablePort, "0.0.0.0", () => {
            console.log(`Server running on port ${availablePort}`);
            console.log(
                `Open http://localhost:${availablePort} in your browser`
            );
            console.log(`WebSocket server ready for real-time chat`);
        });

        // Handle server errors
        httpServer.on("error", (error: NodeJS.ErrnoException) => {
            if (error.code === "EADDRINUSE") {
                console.error(
                    `Port ${availablePort} is already in use. Please free the port or use a different one.`
                );
                process.exit(1);
            } else {
                console.error("Server error:", error);
                process.exit(1);
            }
        });

        // Graceful shutdown
        process.on("SIGTERM", () => {
            console.log("SIGTERM received, shutting down gracefully");
            httpServer.close(() => {
                console.log("Server closed");
                process.exit(0);
            });
        });

        process.on("SIGINT", () => {
            console.log("SIGINT received, shutting down gracefully");
            httpServer.close(() => {
                console.log("Server closed");
                process.exit(0);
            });
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
