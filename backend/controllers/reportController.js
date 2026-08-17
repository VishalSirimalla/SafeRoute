const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const User = require('../models/User');

const ALLOWED_REPORT_TYPES = ['poor_lighting', 'suspicious_activity', 'harassment', 'path_blocked', 'other'];
const ALLOWED_SEVERITIES = ['low', 'medium', 'high'];
const ALLOWED_STATUSES = ['active', 'open', 'under_review', 'acknowledged', 'resolved'];

const createReport = async (req, res) => {
  try {
    const rawType = req.body.type || req.body.incidentType;
    const { description, latitude, longitude, accuracy, severity, evidenceUrl } = req.body;
    const userId = req.user ? req.user.id : null;

    console.log('--- CREATE REPORT DIAGNOSTIC ---');
    console.log('Received field names:', Object.keys(req.body));
    console.log('Report rawType:', rawType);
    console.log('Description length:', typeof description === 'string' ? description.trim().length : 0);
    console.log('Coordinates received:', { latitude, longitude, accuracy });
    console.log('Severity:', severity);
    console.log('User ID present:', Boolean(userId));
    console.log('--------------------------------');

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is required to submit a report.',
      });
    }

    if (!rawType || typeof rawType !== 'string' || !rawType.trim()) {
      console.warn('Report validation failed: missing type or incidentType');
      return res.status(400).json({
        success: false,
        message: 'Report type is required.',
      });
    }

    const normalizedType = rawType.trim().toLowerCase();
    if (!ALLOWED_REPORT_TYPES.includes(normalizedType)) {
      console.warn(`Report validation failed: invalid type '${normalizedType}'`);
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Allowed values: ${ALLOWED_REPORT_TYPES.join(', ')}`,
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      console.warn('Report validation failed: missing description');
      return res.status(400).json({
        success: false,
        message: 'Details/description is required.',
      });
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 1000) {
      console.warn('Report validation failed: description exceeds 1000 chars');
      return res.status(400).json({
        success: false,
        message: 'Description must not exceed 1000 characters.',
      });
    }

    if (latitude === undefined || longitude === undefined || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.warn('Report validation failed: invalid latitude/longitude');
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude numbers are required.',
      });
    }

    if (latitude < -90 || latitude > 90) {
      console.warn('Report validation failed: latitude out of range');
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90 degrees.',
      });
    }

    if (longitude < -180 || longitude > 180) {
      console.warn('Report validation failed: longitude out of range');
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180 degrees.',
      });
    }

    let normalizedSeverity = (severity || 'medium').toString().toLowerCase();
    if (normalizedSeverity === 'moderate') {
      normalizedSeverity = 'medium';
    }
    if (!ALLOWED_SEVERITIES.includes(normalizedSeverity)) {
      console.warn(`Report validation failed: invalid severity '${normalizedSeverity}'`);
      return res.status(400).json({
        success: false,
        message: 'Severity must be one of: low, moderate (medium), high.',
      });
    }

    const incidentReport = await Incident.create({
      type: normalizedType,
      description: trimmedDescription,
      latitude,
      longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      severity: normalizedSeverity,
      status: 'active',
      incidentDate: new Date(),
      source: 'report',
      userId,
      evidenceUrl: evidenceUrl && typeof evidenceUrl === 'string' ? evidenceUrl.trim() : null,
    });

    console.log('Report created successfully in MongoDB:', incidentReport._id);

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully.',
      reportId: incidentReport._id,
      data: incidentReport,
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit safety report',
      error: error.message,
    });
  }
};

const uploadEvidence = async (req, res) => {
  try {
    const { image, fileName } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Image data is required.',
      });
    }

    const matches = image.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Expected base64 data URL.',
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image file size must be less than 5MB.',
      });
    }

    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';

    const safeName = `evidence_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const uploadsDir = path.join(__dirname, '..', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, safeName);
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;

    res.status(200).json({
      success: true,
      message: 'Evidence photo uploaded successfully',
      url: publicUrl,
    });
  } catch (error) {
    console.error('Upload evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload evidence image',
      error: error.message,
    });
  }
};

const getReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const reports = await Incident.find({ userId, source: 'report' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format.',
      });
    }

    const report = await Incident.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    const isOwner = report.userId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';
    const isPublicCommunityReport = report.source === 'report';

    if (!isOwner && !isAdmin && !isPublicCommunityReport) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this safety report.',
      });
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error.message,
    });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format.',
      });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required.',
      });
    }

    const normalizedStatus = status.trim().toLowerCase();
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    const report = await Incident.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    const isOwner = report.userId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only report owners or admins can update safety report status.',
      });
    }

    report.status = normalizedStatus;
    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report status updated successfully.',
      data: report,
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report status',
      error: error.message,
    });
  }
};

const getCommunityReports = async (req, res) => {
  try {
    const reports = await Incident.find({ source: 'report' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error('Get community reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch community reports',
      error: error.message,
    });
  }
};

const getReportStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalReports = await Incident.countDocuments({ source: 'report' });
    const activeReports = await Incident.countDocuments({ source: 'report', status: { $in: ['active', 'open', 'under_review'] } });
    const resolvedReports = await Incident.countDocuments({ source: 'report', status: 'resolved' });
    const highSeverityReports = await Incident.countDocuments({ source: 'report', severity: 'high' });
    const activeSosCount = await Incident.countDocuments({
      $or: [{ source: 'sos' }, { type: 'sos' }],
      status: { $in: ['active', 'open', 'under_review'] },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        total: totalReports,
        active: activeReports,
        resolved: resolvedReports,
        highSeverity: highSeverityReports,
        activeSos: activeSosCount,
      },
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report statistics',
      error: error.message,
    });
  }
};

module.exports = {
  createReport,
  uploadEvidence,
  getReports,
  getReportById,
  updateReportStatus,
  getCommunityReports,
  getReportStats,
};
