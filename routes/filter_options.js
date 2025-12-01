const express = require('express');
const router = express.Router();
const { FilterOption } = require('../models');


router.get('/filter-options', async (req, res) => {
  try {
    const options = await FilterOption.findAll();
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

router.post('/filter-options', async (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: 'Type and value are required' });
  }

  try {
    const newOption = await FilterOption.create({ type, value });
    res.status(201).json(newOption);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add filter option' });
  }
});

module.exports = router;
