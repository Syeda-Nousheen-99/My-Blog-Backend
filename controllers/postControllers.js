const Post = require("../models/postModel")
const jwt = require("jsonwebtoken")
const fs = require("fs");
const HttpError = require("../models/errorModel")
const User = require("../models/userModel")
const path = require('path')
const { v4: uuid } = require('uuid')
const uploadFile = require('../utils/uploadFiles');
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();




//CREATE A POST
//POST: api/posts
//PROTECTED
const createPost = async (req, res, next) => {
    try {
        let { title, category, description } = req.body;
        if (!title || !category || !description || !req.files) {
            return next(new HttpError("Fill in all fields and Choose Thumbnail.", 422));
        }

        const { thumbnail } = req.files;
        if (thumbnail.size > 2000000) {
            return next(new HttpError("Thumbnail too big. File should be less than 2MB"));
        }

        let fileName = thumbnail.name;
        let splittedFilename = fileName.split(".");
        let newFilename = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];

        const thumbnailStream = require('stream').Readable.from(thumbnail.data);

        const fileUpload = bucket.file(`uploads/thumbnails/${newFilename}`);
        const stream = fileUpload.createWriteStream({
            metadata: {
                contentType: thumbnail.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: uuid()  // Add a token for access control
                }
            },
            resumable: false
        });

        stream.on('error', (err) => {
            return next(new HttpError(err));
        });

        stream.on('finish', async () => {
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/uploads%2Fthumbnails%2F${encodeURIComponent(newFilename)}?alt=media`;

            const newPost = await Post.create({
                title,
                category,
                description,
                thumbnail: publicUrl,
                creator: req.user.id
            });

            if (!newPost) {
                return next(new HttpError("Post couldn't be Created.", 422));
            }

            const currentUser = await User.findById(req.user.id);
            const userPostCount = currentUser.posts + 1;
            await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

            res.status(201).json(newPost);
        });

        thumbnailStream.pipe(stream);

    } catch (error) {
        return next(new HttpError(error));
    }
};








//Get All Posts
//POST: api/posts/:id
//UNPROTECTED
const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ updatedAt: -1 });
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error));
    }
};


//Get Single Posts
//GET: api/posts
//PROTECTED
const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            return next(new HttpError("Post not Found.", 404));
        }
        res.status(200).json(post)
    } catch (error) {
        return next(new HttpError(error));
    }
};


//GET POSTS BY CATEGORY
//GET: api/posts/categories/:category
//UNPROTECTED
const getCatPost = async (req, res, next) => {
    try {
        const { category } = req.params;
        const catPosts = await Post.find({ category }).sort({ createdAt: -1 });
        res.status(200).json(catPosts)
    } catch (error) {
        return next(new HttpError(error));
    }
};


//GET AUTHOR POST
//GET: api/posts/users/:id
//UNPROTECTED
const getUserPosts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 })
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error));
    }
};

//EDIT POST
//PATCH: api/posts/:id
//PROTECTED
const editPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        let { title, category, description } = req.body;

        // Validate input fields
        if (!title || !category || description.length < 12) {
            return next(new HttpError("Fill in all fields and ensure description is at least 12 characters long.", 422));
        }

        const oldPost = await Post.findById(postId);

        // Ensure the current user is the creator of the post
        if (req.user.id !== oldPost.creator.toString()) {
            return next(new HttpError("You are not authorized to edit this post.", 401));
        }

        let updatedPost;

        // If there is no new thumbnail, update the text fields only
        if (!req.files || !req.files.thumbnail) {
            updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true });
            if (!updatedPost) {
                return next(new HttpError("Couldn't update post.", 400));
            }
            return res.status(200).json(updatedPost);
        }

        // Handle thumbnail update scenario
        const { thumbnail } = req.files;

        // Check File Size
        if (thumbnail.size > 2000000) {
            return next(new HttpError("Thumbnail too big. Should be less than 2MB.", 422));
        }

        // Generate a unique filename for the new thumbnail
        const fileName = thumbnail.name;
        const ext = path.extname(fileName);
        const newFilename = `${uuid()}${ext}`;

        // Create a readable stream from thumbnail data
        const thumbnailStream = require('stream').Readable.from(thumbnail.data);

        const fileUpload = bucket.file(`uploads/thumbnails/${newFilename}`);
        const stream = fileUpload.createWriteStream({
            metadata: {
                contentType: thumbnail.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: uuid(),  // Add a token for access control
                },
            },
            resumable: false,
        });

        stream.on('error', (err) => {
            return next(new HttpError(err));
        });

        stream.on('finish', async () => {
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/uploads%2Fthumbnails%2F${encodeURIComponent(newFilename)}?alt=media`;

            // Delete the old thumbnail if it exists
            if (oldPost.thumbnail) {
                const oldFilePath = oldPost.thumbnail.split('/o/')[1].split('?')[0];
                const oldFile = bucket.file(decodeURIComponent(oldFilePath));
                oldFile.delete().catch(err => {
                    if (err.code !== 404) {
                        console.error("Error deleting old thumbnail:", err);
                    }
                });
            }

            updatedPost = await Post.findByIdAndUpdate(postId, {
                title, category, description, thumbnail: publicUrl,
            }, { new: true });

            if (!updatedPost) {
                return next(new HttpError("Couldn't update post.", 400));
            }

            res.status(200).json(updatedPost);
        });

        thumbnailStream.pipe(stream);

    } catch (error) {
        return next(new HttpError(error));
    }
};






//DELETE POST
//DELETE: api/posts/:id
//PROTECTED


const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("Post ID is required.", 400));
        }

        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("Post not found.", 404));
        }

        // Check if the current user is the creator of the post
        if (req.user.id !== post.creator.toString()) {
            return next(new HttpError("Unauthorized. You are not allowed to delete this post.", 403));
        }

        const fileName = post.thumbnail;

        // Delete the post document from MongoDB
        await Post.findByIdAndDelete(postId);

        // Delete the post's thumbnail from Firebase Storage if it exists
        if (fileName) {
            const fileRef = bucket.file(`uploads/thumbnails/${fileName}`);
            const [exists] = await fileRef.exists();

            if (exists) {
                await fileRef.delete();
            } else {
                console.warn(`Thumbnail file ${fileName} not found in Firebase Storage.`);
            }
        }

        //Find user and Reduce Post count by 1
        const currentUser = await User.findById(req.user.id);
        const userPostCount = currentUser?.posts - 1;
        await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })
        res.json(`Post ${postId} deleted successfully.`);
    } catch (error) {
        return next(new HttpError(error));
    }
};



module.exports = { createPost, getPosts, getPost, getCatPost, getUserPosts, editPost, deletePost }

