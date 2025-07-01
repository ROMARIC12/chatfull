const express = require('express');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');
const protect = require('../middleware/auth');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);

module.exports = router;