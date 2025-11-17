declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production" | "staging";
            IS_LOCAL: string;

            PORT: string;

            GOOGLE_AI_STUDIO_API_KEY: string;
            OPENAI_API_KEY: string;

            CHROMA_URI: string;

            EMBEDDING_COLLECTION_NAME: string;
            EMBEDDING_CHUNK_SIZE: string;

            MONGODB_URI: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
