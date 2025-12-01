const express = require('express');
const { User } = require('../models')
const router = express.Router();

router.post('/reset-vip-status', async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
  
    try {
      const user = await User.findOne({ where: { email } });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      await User.update(
        { isVip: false },
        { where: { email } }
      );
  
      res.status(200).json({ message: 'User VIP status reset successfully' });
    } catch (error) {
      console.error('Error resetting VIP status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  module.exports = router;

  