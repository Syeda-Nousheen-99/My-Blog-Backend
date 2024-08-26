const {schema, model, Schema} = require('mongoose')

const postSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ["Agriculture", "Bussiness", "Education",
            "Entertainment", "Art", "Investment", "Programming", "Weather"], message: "{VALUE is not supported}",
    },
    description: {
        type: String, required: true
    },
    creator: {
        type: Schema.Types.ObjectId, ref: "User"
    },
    thumbnail: {
        type: String, required: true
    }, 
}, {timestamps: true})

module.exports = model("post", postSchema)