const express = require('express');
const { scoreRouteAlternatives } = require('../services/routeRiskService');

const router = express.Router();

router.post('/plan', async (req, res) => {
  const { start, destination } = req.body || {};

  if (!start || !destination || !String(start).trim() || !String(destination).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both a start location and a destination.',
    });
  }

  try {
    const payload = await scoreRouteAlternatives(start, destination);

    if (!payload.success) {
      return res.status(400).json({
        success: false,
        message: payload.message || 'Unable to calculate routes for these locations.',
        routes: [],
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: 'Unable to calculate routes for these locations. Please check the inputs and try again.',
      routes: [],
      error: error.message,
    });
  }
});

module.exports = router;
