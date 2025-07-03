const express = require('express');
// N'importez PAS les fonctions directement ici, elles seront des fonctions qui prennent io.
// const { sendMessage, allMessages, sendMedia, markMessageAsRead } = require('../controllers/messageController');
const messageController = require('../controllers/messageController'); // Importe tout le module
const protect = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/messages/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
    },
});

const uploadMedia = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
}).array('media', 5);

// Exportez une fonction qui prend 'io' et retourne le routeur
module.exports = (io) => { // Accepte io en argument
    const router = express.Router();

    // Maintenant, nous passons 'io' aux fonctions du contrôleur
    router.route('/').post(protect, (req, res) => messageController.sendMessage(req, res, io));
    router.post('/media', protect, uploadMedia, (req, res) => messageController.sendMedia(req, res, io));
    router.route('/:chatId').get(protect, messageController.allMessages); // allMessages n'a pas besoin de io
    router.put('/:messageId/read', protect, (req, res) => messageController.markMessageAsRead(req, res, io));

    return router;
};
