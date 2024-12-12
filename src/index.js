import { configDotenv } from "dotenv";
import express from "express";
import connectDB from "./db/index.js";

const app = express();

configDotenv({
  path: "./env",
});
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port: ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection error", error);
  });

export { app };
