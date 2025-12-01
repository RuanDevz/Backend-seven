// routes/Reactions.js
const express = require('express');
const router = express.Router();
const Authmiddleware = require('../Middleware/Auth');

const { Reaction, sequelize } = require('../models');
const { Op } = require('sequelize');

// Add or update reaction
router.post('/', Authmiddleware, async (req, res) => {
    try {
        const { contentId, contentType, emoji } = req.body;
        const userId = req.user.id;

        const existingReaction = await Reaction.findOne({
            where: { contentId, contentType, userId, emoji }
        });

        if (existingReaction) {
            // Increment the count if the reaction exists
            // Assuming you add a 'count' column to your Reaction model
            await existingReaction.increment('count');
            const updatedReaction = await existingReaction.reload(); // Fetch updated data
            return res.json(updatedReaction); 
        }

        // Create new reaction with count = 1
        const reaction = await Reaction.create({
            contentId,
            contentType,
            userId,
            emoji,
            count: 1 // Initialize count to 1
        });

        res.status(201).json(reaction);
    } catch (error) {
        res.status(500).json({ error: 'Error adding/updating reaction' });
    }
});

// Get reactions for content
router.get('/:contentType/:contentId', async (req, res) => {
    try {
        const { contentType, contentId } = req.params;

        const reactions = await Reaction.findAll({
            where: { contentType, contentId },
            attributes: [
                'emoji',
                [sequelize.fn('SUM', sequelize.col('count')), 'count'] // Use SUM to get total count
            ],
            group: ['emoji'],
            raw: true
        });

        res.json(reactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching reactions' });
    }
});

module.exports = router;