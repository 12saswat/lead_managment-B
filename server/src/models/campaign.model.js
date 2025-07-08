import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        content: {
             type: String 
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId, ref: 'Manager'
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },

    }, { timestamps: true }
);
export const Campaign = mongoose.model("Campaign", campaignSchema);
