const SafePlace = require('../models/SafePlace');

const createSafePlace = async (req, res) => {
  try {
    const { name, type, latitude, longitude, address, phone } = req.body;

    if (!name || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, address, latitude, and longitude are required',
      });
    }

    const safePlace = await SafePlace.create({
      name,
      type: type || 'public_place',
      latitude,
      longitude,
      address,
      phone,
    });

    res.status(201).json({ success: true, data: safePlace });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create safe place',
      error: error.message,
    });
  }
};

const getSafePlaces = async (req, res) => {
  try {
    const safePlaces = await SafePlace.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: safePlaces });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch safe places',
      error: error.message,
    });
  }
};

module.exports = {
  createSafePlace,
  getSafePlaces,
};
