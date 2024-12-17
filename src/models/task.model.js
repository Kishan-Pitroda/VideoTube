import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema(
  {
    task: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["To Do", "In Progress", "Completed"],
    },
    id: {
      type: Number,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", taskSchema);
