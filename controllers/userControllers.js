const jwt = require("jsonwebtoken")
const bcrypt = require('bcryptjs')
const HttpError = require("../models/errorModel")
const User = require("../models/userModel")
const fs = require('fs')
const path = require('path')
const {v4: uuid} = require('uuid')
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();
// ==================   REGISTER A NEW USER
//POST : api/user/register
//UNPROTECTED

const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validate input fields
        if (!name || !email || !password || !confirmPassword) {
            return next(new HttpError("All fields are required", 422));
        }

        const newEmail = email.toLowerCase();

        // Check if email already exists
        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return next(new HttpError("Email already exists", 422));
        }

        // Check password length
        if (password.trim().length < 8) {
            return next(new HttpError("Password must be at least 8 characters long", 422));
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return next(new HttpError("Passwords do not match", 422));
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new user
        const newUser = await User.create({ name, email: newEmail, password: hashedPassword });

        // Respond with a success message
        res.status(201).json({ message: `New User ${newUser.email} registered successfully` });
    } catch (error) {
        return next(new HttpError("User Registration Failed", 422))
    }
}









// ==================   LOGIN A NEW USER
//POST : api/user/login
//UNPROTECTED

const loginUser = async (req, res, next) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return next(new HttpError("Fill in all fields.", 422));
      }
  
      const newEmail = email.toLowerCase();
  
      const user = await User.findOne({ email: newEmail });
      if (!user) {
        return next(new HttpError("Invalid credentials.", 422));
      }
  
      const comparePass = await bcrypt.compare(password, user.password);
      if (!comparePass) {
        return next(new HttpError("Invalid credentials.", 422));
      }
  
      const { _id: id, name } = user;
      const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1d" });
  
      res.status(200).json({ token, id, name });
    } catch (error) {
      return next(new HttpError("Login failed. Please check your credentials.", 422));
    }
  };











// ==================   USER PROFILE
//POST : api/user/:id
//PROTECTED

const getUser = async (req,res,next) =>{
   try{
    const {id} = req.params;
    const user = await User.findById(id).select('-password');
    if(!user) {
        return next(new HttpError("User not found.", 404))
    }
    res.status(200).json(user);

   } catch (error) {
        return next(new HttpError(error));
      }
   }




// ==================  CHANGE USER AVATAR (profile picture)
//POST : api/user/change-avatar
//PROTECTED

const changeAvatar = async (req, res, next) => {
    try {
        if (!req.files || !req.files.avatar) {
            return next(new HttpError("Please choose an image", 422));
        }

        // Find user from the database
        const user = await User.findById(req.user.id);

        // Delete old avatar from Firebase Storage if it exists
        if (user.avatar) {
            const oldAvatarFile = bucket.file(`uploads/avatars/${user.avatar}`);
            await oldAvatarFile.delete().catch((err) => {
                console.error("Failed to delete old avatar:", err.message);
            });
        }

        const { avatar } = req.files;

        // Check file size
        if (avatar.size > 500000) { // 500KB limit
            return next(new HttpError("Profile picture too big. Should be less than 500KB", 422));
        }

        // Generate a new filename for the avatar
        const fileName = avatar.name;
        const splittedFilename = fileName.split('.');
        const newFileName = `${splittedFilename[0]}_${uuid()}.${splittedFilename[splittedFilename.length - 1]}`;

        // Create a stream from the avatar file data
        const avatarStream = require('stream').Readable.from(avatar.data);

        // Upload the avatar to Firebase Storage
        const fileUpload = bucket.file(`uploads/avatars/${newFileName}`);
        const stream = fileUpload.createWriteStream({
            metadata: {
                contentType: avatar.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: uuid()  // Add a token for access control
                }
            },
            resumable: false
        });

        stream.on('error', (err) => {
            return next(new HttpError(err.message, 500));
        });

        stream.on('finish', async () => {
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/uploads%2Favatars%2F${encodeURIComponent(newFileName)}?alt=media`;

            // Update the user's avatar in the database
            const updateAvatar = await User.findByIdAndUpdate(req.user.id, { avatar: publicUrl }, { new: true });

            if (!updateAvatar) {
                return next(new HttpError("Avatar couldn't be changed", 422));
            }

            res.status(200).json(updateAvatar);
        });

        // Pipe the avatar stream to the Firebase Storage stream
        avatarStream.pipe(stream);

    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};









// ==================  EDIT USER DETAIL (for profile )
//POST : api/user/edit-user
//PROTECTED

const editUser = async (req, res, next) => {
    try {
        const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body;
        
        if (!name || !email || !currentPassword || !newPassword) {
            return next(new HttpError("Fill in all fields.", 422));
        }

        // Get user from database
        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new HttpError("User not found.", 422));
        }

        // Make sure new email doesn't already exist
        const emailExist = await User.findOne({ email });
        
        // We want to update other details with/without changing the email (which is a unique id because we use it to login).
        if (emailExist && (emailExist._id.toString() !== req.user.id)) {
            return next(new HttpError("Email already exists.", 422));
        }

        // Compare current password to DB password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validateUserPassword) {
            return next(new HttpError("Invalid current password.", 422));
        }

        // Compare new passwords
        if (newPassword !== confirmNewPassword) {
            return next(new HttpError("New passwords do not match.", 422));
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // Update user info in database
        const newInfo = await User.findByIdAndUpdate(req.user.id, {
            name,
            email,
            password: hash
        }, { new: true });

        // Send updated user info in response
        res.status(200).json(newInfo);
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};












// ================== GET AUTHER
//POST : api/user/auther
//UNPROTECTED

const getAuthers = async (req,res,next) =>{
    try{
        const authers = await User.find().select('-password');
        res.json(authers);

    } catch(error) {
        return next(new HttpError(error))
    }
}

module.exports = {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthers}

