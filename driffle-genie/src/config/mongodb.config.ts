import mongoose from "mongoose";

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
    if (isConnected) {
        console.log("MongoDB already connected");
        return;
    }

    try {
        const mongoUri =
            process.env.MONGODB_URI ||
            "mongodb://localhost:27017/driffle-genie";

        await mongoose.connect(mongoUri);
        isConnected = true;
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        isConnected = false;
        throw error;
    }
}

export async function disconnectMongoDB(): Promise<void> {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log("MongoDB disconnected");
    } catch (error) {
        console.error("MongoDB disconnection error:", error);
        throw error;
    }
}
