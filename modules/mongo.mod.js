import { MongoClient } from "mongodb";
require('dotenv').config() // Configuracion de las variables de entorno

// Connect to MongoDB
export const connect = async () => {
    try {
        return await MongoClient(
            process.env.MONGO_URL,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        )
    } catch (err) {
        // Throw error for backend
        throw new Error("Because for: " + err);
    }
}