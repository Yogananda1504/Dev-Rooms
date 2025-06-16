import { pipeline } from "@xenova/transformers";
import MoodData from "../models/Mood.js";

const cache = new Map();

const emotions = [
    "joy",
    "sadness",
    "anger",
    "fear",
    "surprise",
    "disgust"
];

let sentimentPipeline;
let emotionPipeline;

async function initializePipelines() {
    if (!sentimentPipeline) {
        sentimentPipeline = await pipeline("sentiment-analysis");
    }
    if (!emotionPipeline) {
        emotionPipeline = await pipeline("zero-shot-classification");
    }
}

function getTopN(obj, n) {
    return Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([emotion, score]) => ({ emotion, score }));
}

export async function analyzeMoodForUser(message, username, room) {
    try {
        await initializePipelines();

        const cacheKey = `${username}:${room}`;
        let moodData = cache.get(cacheKey);

        if (!moodData) {
            moodData = await MoodData.findOne({ username, room });
            if (moodData) {
                cache.set(cacheKey, moodData);
            }
        }

        const [sentiment] = await sentimentPipeline(message);
        const emotionResult = await emotionPipeline(message, emotions);

        console.log("Emotion Result:", emotionResult);

        const sentimentScore = sentiment?.score ?? 0;
        const overallMood = sentiment?.label ?? "neutral";

        const currentEmotionScores = {};
        emotions.forEach((emotion, index) => {
            currentEmotionScores[emotion] = emotionResult.scores[index];
        });

        if (!moodData) {
            moodData = new MoodData({
                username,
                room,
                overallMood,
                sentimentScore,
                emotionScores: currentEmotionScores,
                topEmotions: getTopN(currentEmotionScores, 3),
                moodDescription: "",
                messageCount: 1,
            });
        } else {
            moodData.sentimentScore =
                (moodData.sentimentScore * moodData.messageCount + sentimentScore) /
                (moodData.messageCount + 1);
            moodData.overallMood = overallMood;

            // Update emotionScores
            for (const emotion of emotions) {
                if (!moodData.emotionScores[emotion]) {
                    moodData.emotionScores[emotion] = 0;
                }
                moodData.emotionScores[emotion] =
                    (moodData.emotionScores[emotion] * moodData.messageCount +
                        currentEmotionScores[emotion]) /
                    (moodData.messageCount + 1);
            }

            moodData.messageCount += 1;
        }

        // Recalculate topEmotions after updating emotionScores
        moodData.topEmotions = getTopN(moodData.emotionScores, 3);

        // Update moodDescription
        moodData.moodDescription = `The overall mood is ${
            moodData.overallMood
        } with an average sentiment score of ${moodData.sentimentScore.toFixed(
            2
        )}. The top emotions detected are ${moodData.topEmotions
            .map((e) => `${e.emotion} (${e.score.toFixed(2)})`)
            .join(", ")}.`;

        // Use findOneAndUpdate to handle potential version conflicts
        const updatedMoodData = await MoodData.findOneAndUpdate(
            { username, room },
            {
                $set: {
                    overallMood: moodData.overallMood,
                    sentimentScore: moodData.sentimentScore,
                    emotionScores: moodData.emotionScores,
                    topEmotions: moodData.topEmotions,
                    moodDescription: moodData.moodDescription,
                    messageCount: moodData.messageCount
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        cache.set(cacheKey, updatedMoodData);
        return updatedMoodData;
    } catch (error) {
        console.error("Error in mood analysis:", error);
        throw error;
    }
}