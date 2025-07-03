const express = require('express');
// Importez les fonctions du contrôleur et le middleware multer
const { updateUserProfile, searchUserByEmail, getAllUsers, uploadProfilePicture } = require('../controllers/userController');
const protect = require('../middleware/auth');
const router = express.Router();

// Correction ici: Insérez uploadProfilePicture AVANT updateUserProfile
router.put('/profile', protect, uploadProfilePicture, updateUserProfile);
router.get('/search', protect, searchUserByEmail);
router.get('/all', protect, getAllUsers);

module.exports = router;
