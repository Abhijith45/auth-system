import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName:{
        type: String,
        required: true,
        unique: true
    },
    userEmail:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true,
    },
    verified: {
        type: Boolean,
        default: false
    }
})

const UserModel = mongoose.model('users',userSchema);

export default UserModel;