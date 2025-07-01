const express = require('express');
const { updateUserProfile, searchUserByEmail, getAllUsers } = require('../controllers/userController'); // NOUVEAU : Importez getAllUsers
const protect = require('../middleware/auth');
const router = express.Router();

router.put('/profile', protect, updateUserProfile);
router.get('/search', protect, searchUserByEmail);

router.get('/all', protect, getAllUsers); // NOUVELLE ROUTE : pour récupérer tous les utilisateurs

module.exports = router;
