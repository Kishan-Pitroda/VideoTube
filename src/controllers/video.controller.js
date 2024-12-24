import { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType } = req.query;

  const videos = await Video.aggregate([
    {
      $match: {
        $or: [
          {
            title: { $regex: query, $options: "i" },
          },
          {
            description: { $regex: query, $options: "i" },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $project: {
        thumbnail: 1,
        videoFile: 1,
        title: 1,
        description: 1,
        createdBy: {
          fullName: 1,
          username: 1,
          avatar: 1,
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const videoFilePath = req.files?.videoFile[0]?.path;

  if (!title || !description) {
    throw new ApiError(400, "Provide video title and description");
  }

  if (!videoFilePath) {
    throw new ApiError(400, "No video file found");
  }

  const thumbnailPath = req.files?.thumbnail[0]?.path;

  if (!thumbnailPath) {
    throw new ApiError(400, "No video thumbnail file found");
  }

  const videoFile = await uploadOnCloudinary(videoFilePath);

  if (!videoFile.url) {
    throw new ApiError(500, "Error while uploading a video file");
  }

  const videoThumbnailFile = await uploadOnCloudinary(thumbnailPath);

  if (!videoThumbnailFile.url) {
    throw new ApiError(500, "Error while uploading a video thumbnail file");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: videoThumbnailFile.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(500, "Error while publishing the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!title || !description) {
    throw new ApiError(400, "Provide updated title or description");
  }

  const videoThumbnail = req.file?.path;

  if (!videoThumbnail) {
    throw new ApiError(400, "Provide thumbnail file");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  const deleteThumbnailResponse = await deleteFromCloudinary(
    video.thumbnail,
    "image"
  );

  if (deleteThumbnailResponse.result !== "ok") {
    throw new ApiError(
      500,
      "Error while deleting old thumbnail from the cloudinary"
    );
  }

  const newThumbnail = await uploadOnCloudinary(videoThumbnail);

  if (!newThumbnail.url) {
    throw new ApiError(500, "Error while uploading new thumbnail");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: newThumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  const cloudinaryDeletedVideo = await deleteFromCloudinary(
    video.videoFile,
    "video"
  );

  if (cloudinaryDeletedVideo.result !== "ok") {
    throw new ApiError(
      500,
      "Error while deleting a video from the cloudinary server"
    );
  }

  const cloudinaryThumbnail = await deleteFromCloudinary(
    video.thumbnail,
    "image"
  );

  if (cloudinaryThumbnail.result !== "ok") {
    throw new ApiError(
      500,
      "Error while deleting a video thumbnail from the cloudinary server"
    );
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError(500, "Error while deleting a video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  const modifiedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        modifiedVideo,
        "Video publish status updated successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
