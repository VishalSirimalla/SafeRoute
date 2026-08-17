const express = require('express');
const {
  createIncident,
  getIncidents,
  getIncidentById,
  getSharedIncident,
  updateIncidentStatus,
  updateIncidentLocation,
} = require('../controllers/incidentController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Public route for recipients viewing shared incident link
router.get('/share/:token', getSharedIncident);

// Protected routes requiring user ownership authentication
router.post('/', authMiddleware, createIncident);
router.get('/', authMiddleware, getIncidents);
router.get('/:id', authMiddleware, getIncidentById);
router.patch('/:id/status', authMiddleware, updateIncidentStatus);
router.patch('/:id/location', authMiddleware, updateIncidentLocation);

module.exports = router;
