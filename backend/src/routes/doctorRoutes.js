import express from "express";
import { loginDoctors } from "../controllers/doctorController.js";

const router = express.Router();

router.post("/login", loginDoctors);

export default router;
