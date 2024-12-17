import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTask,
  deleteTask,
  getAllTask,
  getTaskById,
  updateTaskDetails,
} from "../controllers/task.controller.js";

const router = Router();

// secured routes
router.route("/all-tasks").get(verifyJWT, getAllTask);
router.route("/task-by-id/:id").get(verifyJWT, getTaskById);
router.route("/create-task").post(verifyJWT, createTask);
router.route("/update-task/:id").patch(verifyJWT, updateTaskDetails);
router.route("/delete-task/:id").delete(verifyJWT, deleteTask);

export default router;
