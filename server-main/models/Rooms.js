
import mongoose from "mongoose";
const  Rooms = mongoose.model("Rooms", {
    name: { type: String, required: true },
    activeusers:{type:Number,default:0},
    createdAt: { type: Date, default: Date.now ,expires: '1d'},
    admin:{type : [String],default:[]},
    capacity:{type:Number,default:100},
    locked:{type:Boolean,default:false}
});

export default Rooms;
