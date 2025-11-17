import express from "express";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import root from "./routes/root";
import cors from "cors";
import multer from "multer";
import { ErrorHandler, rid } from "./middlewares";
import {
    makeDocumentVectors,
    makeProductDescriptionVectors,
} from "./services/vector-store.service";
import { connectMongoDB } from "./config/mongodb.config";

const app = express();

app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms")
);
/**
 * CORS Setup
 */
let allowedOrigins: Array<string> = [];
allowedOrigins = String(process.env.ALLOWED_ORIGINS || "").split(",");
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    compression({
        level: 6,
        threshold: 100 * 1000,
        filter: (req, res) => {
            if (req.headers["x-no-compression"]) return false;
            return compression.filter(req, res);
        },
    })
);
app.use(rid);

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 10, // limit 10 MB
    },
});

app.use(upload.any());

app.use("/", root);
app.use("/ping", (req, res) => {
    return res.send("pong");
});

app.get("/generate-vectors", async (req, res) => {
    await makeDocumentVectors();
    return res.send("Generating FAQ Vectors");
});
app.use(ErrorHandler);

// makeDocumentVectors();
// makeProductDescriptionVectors();

export default app;
