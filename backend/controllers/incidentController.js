const crypto = require('crypto');
const Incident = require('../models/Incident');
const TrustedContact = require('../models/TrustedContact');
const { sendEmergencyNotification } = require('../services/notificationService');

const createIncident = async (req, res) => {
  try {
    const { type, description, latitude, longitude, accuracy, severity, status, incidentDate, source } = req.body;
    const userId = req.user.id;

    if (!type || !description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Type, description, latitude, and longitude are required',
      });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    const secureShareToken = crypto.randomBytes(24).toString('hex');
    const shareExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const incident = await Incident.create({
      type,
      description,
      latitude,
      longitude,
      accuracy: accuracy !== undefined ? accuracy : null,
      severity: severity || 'high',
      status: status || 'active',
      incidentDate: incidentDate || new Date(),
      source: source || 'sos',
      userId,
      secureShareToken,
      shareExpiresAt,
    });

    let notificationStatus = {
      email: { attempted: false, sent: false, reason: 'Not requested' },
      sms: { attempted: false, sent: false, reason: 'Not requested' },
    };

    if (type === 'sos') {
      try {
        const contacts = await TrustedContact.find({ userId });
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        notificationStatus = await sendEmergencyNotification({
          incident,
          contacts,
          baseUrl,
          shareToken: secureShareToken,
        });
      } catch (notifErr) {
        notificationStatus = {
          email: { attempted: true, sent: false, reason: notifErr.message },
          sms: { attempted: true, sent: false, reason: notifErr.message },
        };
      }
    }

    res.status(201).json({
      success: true,
      data: incident,
      incidentId: incident._id,
      shareToken: secureShareToken,
      notificationStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create incident',
      error: error.message,
    });
  }
};

const getIncidents = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin ? {} : { userId };
    const incidents = await Incident.find(query).sort({ incidentDate: -1 });
    res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: error.message,
    });
  }
};

const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        message: 'Invalid incident ID format',
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    const isOwner = incident.userId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this emergency incident.',
      });
    }

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident',
      error: error.message,
    });
  }
};

const getSharedIncident = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string' || token.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emergency share token',
      });
    }

    const incident = await Incident.findOne({ secureShareToken: token.trim() });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Shared emergency incident not found or link has expired.',
      });
    }

    if (incident.status === 'resolved' || (incident.shareExpiresAt && incident.shareExpiresAt < new Date())) {
      return res.status(410).json({
        success: false,
        message: 'This emergency share link has expired or the emergency incident has been resolved.',
      });
    }

    const safeData = {
      latitude: incident.latitude,
      longitude: incident.longitude,
      accuracy: incident.accuracy,
      status: incident.status,
      incidentDate: incident.incidentDate || incident.createdAt,
      type: incident.type,
      description: incident.description,
      severity: incident.severity,
    };

    res.status(200).json({ success: true, data: safeData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shared incident',
      error: error.message,
    });
  }
};

const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['active', 'open', 'under_review', 'acknowledged', 'resolved'];
    if (!status || !allowed.includes(status.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Valid status is required (${allowed.join(', ')})`,
      });
    }

    const normalizedStatus = status.trim().toLowerCase();
    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    const isOwner = incident.userId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to modify this emergency incident.',
      });
    }

    incident.status = normalizedStatus;
    if (normalizedStatus === 'resolved') {
      incident.secureShareToken = undefined;
    }
    await incident.save();

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update incident',
      error: error.message,
    });
  }
};

const updateIncidentLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy } = req.body;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude numbers are required',
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    const isOwner = incident.userId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to update location for this incident.',
      });
    }

    if (incident.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update location on a resolved incident',
      });
    }

    incident.latitude = latitude;
    incident.longitude = longitude;
    if (accuracy !== undefined) {
      incident.accuracy = accuracy;
    }
    await incident.save();

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update incident location',
      error: error.message,
    });
  }
};

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  getSharedIncident,
  updateIncidentStatus,
  updateIncidentLocation,
};
