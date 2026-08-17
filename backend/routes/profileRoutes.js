const express = require('express');
const { initAuth, adminLogin, getProfile, getAllUsers, updateProfile } = require('../controllers/profileController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/auth', initAuth);
router.post('/admin-login', adminLogin);
router.get('/', authMiddleware, getProfile);
router.get('/users', authMiddleware, adminMiddleware, getAllUsers);
router.patch('/', authMiddleware, updateProfile);

module.exports = router;
