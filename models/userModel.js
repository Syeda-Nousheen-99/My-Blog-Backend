const {Schema, model} = require("mongoose");
// const validator = require("validator");

const UserSchema = new Schema({

name:{
    type:String,
    require: true,
},
email: {
    type: String,
    required: true,
    // unique: true,
    // validate: {
    //   validator: (value) => {
    //     if (!validator.isEmail(value)) {
    //       throw new Error("Not Valid Email");
    //     }
    //   },
    // },
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  avatar: {
    type: String
  },
  posts:{
    type: Number, default: 0
  }



},{ timestamps: true });

module.exports = model("User", UserSchema)