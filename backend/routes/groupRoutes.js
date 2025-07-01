const express = require('express');
const {
    renameGroup,
    addToGroup,
    removeFromGroup,
    deleteGroup,
    transferGroupAdmin,
    getGroupParticipants
} = require('../controllers/chatController'); // Using chatController for group logic
const protect = require('../middleware/auth');
const router = express.Router();

// Note: Create Group is already in /api/chats/group
router.put('/:id', protect, renameGroup); // Update group name/description
router.delete('/:id', protect, deleteGroup);
router.put('/:id/add', protect, addToGroup);
router.put('/:id/remove', protect, removeFromGroup);
router.put('/:id/transfer-admin', protect, transferGroupAdmin);
router.get('/:id/participants', protect, getGroupParticipants);


module.exports = router;