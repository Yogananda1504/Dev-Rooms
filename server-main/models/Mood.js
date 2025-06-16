
import mongoose from 'mongoose';



const MoodSchema = new mongoose.Schema({
    username: String,
    room: String,
    timestamp: { type: Date, default: Date.now },
    overallMood: String,
    sentimentScore: Number,
    emotionScores: {
      joy:Number,
      sadness:Number,
      anger:Number,
      fear:Number,
      surprise:Number,
      disgust:Number,
      trust:Number,
      anticipation:Number,
      love:Number,
      optimism:Number,
      pessimism:Number,
      anxiety:Number
    },
    topEmotions: [{
      emotion: String,
      score: Number
  }],
    moodDescription: String,
    messageCount:Number
  });
  
  const MoodData = mongoose.model('Mood', MoodSchema);

export default MoodData;
  