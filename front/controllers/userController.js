const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for file uploads (existing code)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profiles/');
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const uploadProfilePicture = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    },
}).single('profilePicture');


// @desc    Update user profile (existing code)
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
    uploadProfilePicture(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.status = req.body.status || user.status;

            if (req.file) {
                // Delete old profile picture if it's not the default one
                if (user.profilePicture && !user.profilePicture.includes('default-avatar')) {
                    const oldPath = path.join(__dirname, '..', user.profilePicture.replace(process.env.BASE_URL, ''));
                    fs.unlink(oldPath, (err) => {
                        if (err) console.error("Failed to delete old profile picture:", err);
                    });
                }
                user.profilePicture = `${process.env.BASE_URL}/uploads/profiles/${req.file.filename}`;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                status: updatedUser.status,
                profilePicture: updatedUser.profilePicture,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    });
};

// @desc    Search user by email (existing code)
// @route   GET /api/users/search
// @access  Private
exports.searchUserByEmail = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email query parameter is required' });
    }

    try {
        const user = await User.findOne({ email }).select('-password');
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                status: user.status,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error("Error searching user:", error);
        res.status(500).json({ message: 'Server error during user search' });
    }
};

// NOUVELLE FONCTION : Récupérer tous les utilisateurs (pour les contacts)
// @desc    Get all users
// @route   GET /api/users/all
// @access  Private (authentifié)
exports.getAllUsers = async (req, res) => {
    try {
        // Exclure l'utilisateur actuel et les mots de passe
        const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};
