import mongoose from "mongoose";
import authConfig from "./config.js";

async function connectDb() {
    await mongoose.connect(authConfig.MONGO_URI)
    console.log('mongodb connected')
}

export default connectDb;