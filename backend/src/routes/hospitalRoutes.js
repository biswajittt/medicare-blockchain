import express from "express";
import {
  registerDoctors,
  registerPatients,
} from "../controllers/hospitalController.js";

const router = express.Router();

router.post("/patient", registerPatients);
router.post("/doctor", registerDoctors);

export default router;
