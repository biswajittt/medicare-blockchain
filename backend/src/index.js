import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, "..", ".env") }); // Adjust path to go up two levels to the backend folderconsole.log("Environment Variables: ", process.env); // Log all environment variables
// console.log("Environment Variables: ", process.env); // Log all environment variables

const app = express();

app.use(cors());
app.use(express.json());

// Routes
// Import routes
import doctorRoutes from "./routes/doctorRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
app.use("/register", hospitalRoutes);
app.use("/doctor", doctorRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
