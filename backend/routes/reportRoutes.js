const express = require('express');
const {
  createReport,
  uploadEvidence,
  getReports,
  getReportById,
  updateReportStatus,
  getCommunityReports,
  getReportStats,
} = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes requiring authenticated user identity
router.post('/', authMiddleware, createReport);
router.post('/upload', authMiddleware, uploadEvidence);
router.get('/', authMiddleware, getReports);
router.get('/community', authMiddleware, getCommunityReports);
router.get('/stats', authMiddleware, getReportStats);
router.get('/:id', authMiddleware, getReportById);
router.patch('/:id/status', authMiddleware, updateReportStatus);

module.exports = router;
