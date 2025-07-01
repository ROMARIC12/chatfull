const express = require('express');
const {
    createChat,
    fetchChats,
    createGroupChat,
    pinChat,
    archiveChat,
    getAllGroups, // NOUVEAU : Importez la fonction
} = require('../controllers/chatController');
const { getChatMedia } = require('../controllers/messageController');
const protect = require('../middleware/auth');
const router = express.Router();

router.route('/').post(protect, createChat).get(protect, fetchChats);
router.post('/group', protect, createGroupChat);
router.put('/:id/pin', protect, pinChat);
router.put('/:id/archive', protect, archiveChat);
router.get('/:chatId/media', protect, getChatMedia);

router.get('/all-groups', protect, getAllGroups); // NOUVELLE ROUTE : pour récupérer tous les groupes

module.exports = router;
