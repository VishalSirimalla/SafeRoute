const express = require('express');
const { createSafePlace, getSafePlaces } = require('../controllers/safePlaceController');

const router = express.Router();

router.post('/', createSafePlace);
router.get('/', getSafePlaces);

module.exports = router;
