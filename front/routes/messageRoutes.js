const express = require('express');
const { sendMessage, allMessages, sendMedia, markMessageAsRead } = require('../controllers/messageController');
const protect = require('../middleware/auth');
const router = express.Router();

router.route('/').post(protect, sendMessage);
router.post('/media', protect, sendMedia);
router.route('/:chatId').get(protect, allMessages);
router.put('/:messageId/read', protect, markMessageAsRead);

module.exports = router;