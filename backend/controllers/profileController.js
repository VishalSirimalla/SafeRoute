const User = require('../models/User');
const { generateToken } = require('../middleware/authMiddleware');
const { normalizeIndiaPhone } = require('../utils/phoneUtils');

const getConfiguredAdminEmail = () => {
  return String(process.env.ADMIN_EMAIL || 'vishalsirimalla31@gmail.com').trim().toLowerCase();
};

const getConfiguredAdminPassword = () => {
  return String(process.env.ADMIN_PASSWORD || 'Vishal@2008');
};

const initAuth = async (req, res) => {
  try {
    let { email, name, phone } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      email = 'user@saferoute.app';
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      name = 'Saarthi User';
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      phone = '+919876543210';
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizeIndiaPhone(phone) || phone.trim();

    let user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      const isConfiguredAdmin = sanitizedEmail === getConfiguredAdminEmail();
      user = await User.create({
        name: name.trim(),
        email: sanitizedEmail,
        phone: normalizedPhone,
        role: isConfiguredAdmin ? 'admin' : 'user',
        emergencyContact: { name: '', phone: '' },
      });
    }

    const token = generateToken(user._id.toString(), user.email, user.role || 'user');

    res.status(200).json({
      success: true,
      token,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize session',
      error: error.message,
    });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const inputEmail = String(email || '').trim().toLowerCase();
    const inputPassword = String(password || '');

    const configuredEmail = getConfiguredAdminEmail();
    const configuredPassword = getConfiguredAdminPassword();

    if (!configuredEmail || !configuredPassword) {
      console.error('Admin credentials are not configured in backend environment.');
      return res.status(500).json({
        success: false,
        message: 'Administrator authentication is not configured.',
      });
    }

    if (!inputEmail || !inputPassword) {
      return res.status(400).json({
        success: false,
        message: 'Administrator email and password are required.',
      });
    }

    if (inputEmail !== configuredEmail || inputPassword !== configuredPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator email or password credentials.',
      });
    }

    let user = await User.findOne({ email: configuredEmail });
    if (!user) {
      user = await User.create({
        name: 'Saarthi Administrator',
        email: configuredEmail,
        phone: '+919876543210',
        role: 'admin',
        emergencyContact: { name: '', phone: '' },
      });
    } else if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.email, 'admin');

    res.status(200).json({
      success: true,
      message: 'Admin authentication successful',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed',
      error: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    const totalCount = await User.countDocuments();

    res.status(200).json({
      success: true,
      total: totalCount,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registered user list',
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, emergencyContact, medicalInfo, bloodGroup, address } = req.body;

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ success: false, message: 'Valid name is required' });
    }

    let normalizedPhone = undefined;
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      normalizedPhone = normalizeIndiaPhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
        });
      }
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (name) user.name = name.trim();
    if (email && email.trim()) user.email = email.trim().toLowerCase();
    if (normalizedPhone) user.phone = normalizedPhone;

    if (emergencyContact) {
      let emPhone = emergencyContact.phone ? emergencyContact.phone.trim() : '';
      if (emPhone) {
        emPhone = normalizeIndiaPhone(emPhone) || emPhone;
      }
      user.emergencyContact = {
        name: emergencyContact.name ? emergencyContact.name.trim() : '',
        phone: emPhone,
      };
    }
    if (medicalInfo !== undefined) user.medicalInfo = medicalInfo.trim();
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup.trim();
    if (address !== undefined) user.address = address.trim();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

module.exports = {
  initAuth,
  adminLogin,
  getProfile,
  getAllUsers,
  updateProfile,
};
