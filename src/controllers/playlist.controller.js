import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(400, "All Fields are required");
  }

  const existingPlaylist = await Playlist.findOne({
    $and: [{ name: name }, { owner: req.user._id }],
  });

  if (existingPlaylist) {
    throw new ApiError(400, "Playlist with the same name already exists");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Error while creating a playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              description: 1,
              owner: 1,
            },
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
        pipeline: [
          {
            $project: {
              avatar: 1,
              fullName: 1,
              username: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        createdBy: {
          $first: "$createdBy",
        },
      },
    },
    {
      $project: {
        videos: 1,
        createdBy: 1,
        name: 1,
        description: 1,
      },
    },
  ]);

  if (!userPlaylists.length) {
    throw new ApiError(504, "No playlists found for this user");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, userPlaylists, "Playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        createdBy: {
          $first: "$createdBy",
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              owner: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        videos: 1,
        description: 1,
        name: 1,
        createdBy: 1,
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(500, "Error while fetching a playlist");
  }

  if (!playlist.length) {
    throw new ApiError(404, "No playlist found for this user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Playlist or Video ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "No playlist found");
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  const videoExists = playlist.videos.filter((video) => video.equals(videoId));

  if (videoExists.length > 0) {
    throw new ApiError(400, "Video is already in the playlist");
  }

  const addVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        videos: [...playlist.videos, videoId],
      },
    },
    { new: true }
  );

  if (!addVideo) {
    throw new ApiError(500, "Error while adding a video to the playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, addVideo, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(videoId) || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Video or Playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "No playlist found with the ID");
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  const videoExists = playlist.videos.find((video) => video.equals(videoId));

  if (!videoExists) {
    throw new ApiError(400, "No video found with the ID in the playlist");
  }

  const modifiedPlaylistVideos = playlist.videos.filter(
    (video) => !video.equals(videoId)
  );

  const removeVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        videos: modifiedPlaylistVideos,
      },
    },
    { new: true }
  );

  if (!removeVideo) {
    throw new ApiError(500, "Error while removing a video from the playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        removeVideo,
        "Video removed from the playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "No playlist found with this ID");
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  const deletePlaylist = await Playlist.findByIdAndDelete(playlist._id);

  if (!deletePlaylist) {
    throw new ApiError(500, "Error while deleting a playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(400, "All fields are required");
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "No playlist found with this ID");
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );

  if (!updatePlaylist) {
    throw new ApiError(500, "Error while updating a playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatePlaylist, "Playlist updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
