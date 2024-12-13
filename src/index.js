import { configDotenv } from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
configDotenv({
  path: "./.env",
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
