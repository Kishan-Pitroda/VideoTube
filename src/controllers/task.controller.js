import { asyncHandler } from "../utils/asyncHandler.js";
import { Task } from "../models/task.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const getAllTask = asyncHandler(async (_, res) => {
  const tasks = await Task.find();
  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Task list fetched successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ id: req.params.id });

  if (!task) {
    throw new ApiError(400, "Task not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
  const { task, status, id } = req.body;

  const existingTask = await Task.findOne({ id });
  if (existingTask) {
    throw new ApiError(400, "Task with same id is already present");
  }

  const newTask = await Task.create({
    task,
    status,
    id,
  });

  if (!newTask) {
    throw new ApiError(500, "Error while creating a new task");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newTask, "Task created successfully"));
});

const updateTaskDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedTaskData = req.body;

  const updatedTask = await Task.findOneAndUpdate({ id }, updatedTaskData, {
    new: true,
    runValidators: true,
  });

  if (!updatedTask) {
    throw new ApiError(404, "Task not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedTask = await Task.findOneAndDelete({ id });

  if (!deletedTask) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedTask, "Task deleted successfully"));
});

export { getAllTask, getTaskById, createTask, updateTaskDetails, deleteTask };
