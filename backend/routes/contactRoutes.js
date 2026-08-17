const express = require('express');
const { getContacts, createContact, deleteContact } = require('../controllers/contactController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getContacts);
router.post('/', createContact);
router.delete('/:id', deleteContact);

module.exports = router;
