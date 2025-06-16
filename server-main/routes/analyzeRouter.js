import { Router } from 'express';
import MoodData from '../models/Mood.js';
const router = Router();



// Route for user mood data
router.get('/mood', async (req, res) => {
  try {
    const encodedUsername = req.query.username;
    const encodedRoom = req.query.room;
    const username = decodeURIComponent(encodedUsername);
    const room = decodeURIComponent(encodedRoom);

    const moodData = await MoodData.findOne({ username, room });

    if (moodData) {
      res.status(200).json(moodData);
    } else {
      res.status(404).json({ error: 'User mood data not found.' });
    }
  } catch (error) {
    console.error('Error fetching user mood data:', error);
    res.status(500).json({ error: 'Failed to fetch user mood data. Please try again.' });
  }
});

export default router;



