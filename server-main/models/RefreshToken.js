import mongoose from "mongoose";

const RefreshToken = mongoose.model("RefreshToken",{
    token: { type: String } ,
    createdAt: { type: Date, default: Date.now, expires: 7*24*60*60*1000}
})

export default RefreshToken;