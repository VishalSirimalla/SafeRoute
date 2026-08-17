const TrustedContact = require('../models/TrustedContact');
const { normalizeIndiaPhone } = require('../utils/phoneUtils');

const getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const contacts = await TrustedContact.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: error.message,
    });
  }
};

const createContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, email, relationship } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Contact name is required',
      });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number is required',
      });
    }

    const normalizedPhone = normalizeIndiaPhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
      });
    }

    let sanitizedEmail = undefined;
    if (email && typeof email === 'string' && email.trim()) {
      sanitizedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format',
        });
      }
    }

    const contact = await TrustedContact.create({
      userId,
      name: name.trim(),
      phone: normalizedPhone,
      email: sanitizedEmail,
      relationship: typeof relationship === 'string' ? relationship.trim() : undefined,
    });

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add contact',
      error: error.message,
    });
  }
};

const deleteContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const contact = await TrustedContact.findOneAndDelete({ _id: id, userId });

    if (!contact) {
      return res.status(403).json({
        success: false,
        message: 'Contact not found or access forbidden',
      });
    }

    res.status(200).json({ success: true, message: 'Contact deleted successfully', id });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message,
    });
  }
};

module.exports = {
  getContacts,
  createContact,
  deleteContact,
};
