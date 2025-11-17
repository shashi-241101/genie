import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import fs from "node:fs";

export async function makeDocumentVectors() {
    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
        });
        const vectorStore = new Chroma(embeddings, {
            collectionName: process.env.EMBEDDING_COLLECTION_NAME,
            url: process.env.CHROMA_URI,
            collectionMetadata: {
                "hnsw:space": "cosine",
            },
        });
        const document = fs.readFileSync("./src/data.txt", "utf-8");
        const documents = [] as Document[];
        let documentChunks = [] as string[];
        let index = 0;
        while (index < document.length) {
            const chunkSize = Number(process.env.EMBEDDING_CHUNK_SIZE || 500);
            let chunk = document.substring(index, index + chunkSize);
            if (chunk.length > 0) {
                documentChunks.push(chunk);
            }
            index += chunkSize;
        }
        for (let i = 0; i < documentChunks.length; i++) {
            documents.push({
                id: (i + 1).toString(),
                pageContent: documentChunks[i],
                metadata: {
                    title: "https://driffle.com",
                },
            });
        }
        const response = await vectorStore.addDocuments(documents);
        console.log("Document vectors created successfully");
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function makeProductDescriptionVectors() {
    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
        });
        const vectorStore = new Chroma(embeddings, {
            collectionName:
                process.env.EMBEDDING_PRODUCT_DESCRIPTION_COLLECTION_NAME,
            url: process.env.CHROMA_URI,
            collectionMetadata: {
                "hnsw:space": "cosine",
            },
        });
        await vectorStore.collection?.delete();
        const document = fs.readFileSync(
            "./src/product_description.csv",
            "utf-8"
        );
        let documentChunks = document.split("\n");
        let processedDocumentChunks = [] as string[];
        for (let i = 0; i < documentChunks.length; i++) {
            let chunkSize = 1000;
            /** divide this chunk into 1000 1000 length */
            for (let j = 0; j < documentChunks[i].length; j += chunkSize) {
                let chunk = documentChunks[i].substring(
                    j * chunkSize,
                    (j + 1) * chunkSize
                );
                if (chunk.length > 0) {
                    processedDocumentChunks.push(chunk);
                }
            }
        }
        const documents = [] as Document[];
        for (let i = 0; i < documentChunks.length; i++) {
            documents.push({
                id: i.toString(),
                pageContent: documentChunks[i],
                metadata: {
                    title: "https://driffle.com",
                },
            });
        }
        const batchSize = 1000;
        for (let i = 0; i < documents.length; i += batchSize) {
            try {
                const batch = documents.slice(i, i + batchSize);
                const response = await vectorStore.addDocuments(batch);
                console.log("Document vectors created successfully");
            } catch (error) {
                console.log(error);
            }
        }
        console.log("Document vectors created successfully");
    } catch (error) {
        console.log(error);
    }
}
