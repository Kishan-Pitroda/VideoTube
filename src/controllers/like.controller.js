import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const likedVideo = await Like.findOne({
    $and: [{ video: videoId }, { likedBy: req.user._id }],
  });

  if (!likedVideo) {
    const createdLike = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });

    if (!createdLike) {
      throw new ApiError(500, "Error while liking the video");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, createdLike, "User liked the video"));
  }

  const unLikedVideo = await Like.findByIdAndDelete(likedVideo._id);

  if (!unLikedVideo) {
    throw new ApiError(500, "Error while unliking the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, unLikedVideo, "User unliked the video"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment ID");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(400, "Invalid Comment ID");
  }

  const likedComment = await Like.findOne({
    $and: [{ comment: commentId }, { likedBy: req.user._id }],
  });

  if (!likedComment) {
    const createdLike = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });

    if (!createdLike) {
      throw new ApiError(500, "Error while liking the comment");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, createdLike, "User liked the comment"));
  }

  const unLikedComment = await Like.findByIdAndDelete(likedComment._id);

  if (!unLikedComment) {
    throw new ApiError(500, "Error while unliking the comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, unLikedComment, "User unliked the comment"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(400, "Invalid Tweet ID");
  }

  const likedTweet = await Like.findOne({
    $and: [{ likedBy: req.user._id }, { tweet: tweetId }],
  });

  if (!likedTweet) {
    const newTweet = await Like.create({
      likedBy: req.user._id,
      tweet: tweetId,
    });

    if (!newTweet) {
      throw new ApiError(500, "Error while liking the tweet");
    }

    return res.status(200).json(new ApiResponse(200, newTweet, "Tweet liked"));
  }

  const unlikedTweet = await Like.findByIdAndDelete(likedTweet._id);

  if (!unlikedTweet) {
    throw new ApiError(500, "Error while unliking the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, unlikedTweet, "Tweet unliked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "video",
        as: "video",
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
                    username: 1,
                    fullName: 1,
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
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        video: 1,
        likedBy: 1,
      },
    },
  ]);

  if (!likedVideos) {
    throw new ApiError(500, "Error while fetching liked videos");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
