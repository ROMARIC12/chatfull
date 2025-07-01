const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { io } = require('../server'); // Import io instance

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/messages/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const uploadMedia = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
}).array('media', 5); // Allow up to 5 media files

// @desc    Send a text message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
        return res.status(400).json({ message: 'Invalid data passed into request' });
    }

    var newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
    };

    try {
        var message = await Message.create(newMessage);

        message = await message.populate('sender', 'name profilePicture');
        message = await message.populate('chat');
        message = await User.populate(message, {
            path: 'chat.users',
            select: 'name profilePicture phone',
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        // Emit message to all participants in the chat
        message.chat.users.forEach(user => {
            if (user._id.toString() === req.user._id.toString()) return;
            io.to(user._id.toString()).emit('message received', message);
        });

        res.json(message);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Send media messages
// @route   POST /api/messages/media
// @access  Private
exports.sendMedia = async (req, res) => {
    uploadMedia(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        const { chatId } = req.body;
        if (!chatId) {
            return res.status(400).json({ message: 'Chat ID is required' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No media files uploaded' });
        }

        const mediaArray = req.files.map(file => {
            let mediaType;
            if (file.mimetype.startsWith('image')) mediaType = 'image';
            else if (file.mimetype.startsWith('video')) mediaType = 'video';
            else if (file.mimetype.startsWith('audio')) mediaType = 'audio';
            else mediaType = 'document';

            return {
                type: mediaType,
                url: `${process.env.BASE_URL}/uploads/messages/${file.filename}`,
                fileName: file.originalname,
                fileSize: file.size,
            };
        });

        try {
            var newMessage = {
                sender: req.user._id,
                chat: chatId,
                media: mediaArray,
            };

            var message = await Message.create(newMessage);

            message = await message.populate('sender', 'name profilePicture');
            message = await message.populate('chat');
            message = await User.populate(message, {
                path: 'chat.users',
                select: 'name profilePicture phone',
            });

            await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

            // Emit message to all participants in the chat
            message.chat.users.forEach(user => {
                if (user._id.toString() === req.user._id.toString()) return;
                io.to(user._id.toString()).emit('message received', message);
            });

            res.status(200).json(message);
        } catch (error) {
            // Clean up uploaded files if message creation fails
            mediaArray.forEach(media => {
                const filePath = path.join(__dirname, '..', media.url.replace(process.env.BASE_URL, ''));
                fs.unlink(filePath, (err) => {
                    if (err) console.error("Failed to delete media file:", err);
                });
            });
            res.status(400).json({ message: error.message });
        }
    });
};


// @desc    Get all messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
exports.allMessages = async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate('sender', 'name profilePicture phone')
            .populate('chat');
        res.json(messages);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/:messageId/read
// @access  Private
exports.markMessageAsRead = async (req, res) => {
    const { messageId } = req.params;
    try {
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (!message.readBy.includes(req.user._id)) {
            message.readBy.push(req.user._id);
            await message.save();

            // Emit read status to relevant users
            io.to(message.chat.toString()).emit('message read', {
                messageId: message._id,
                userId: req.user._id
            });
        }
        res.json({ message: 'Message marked as read', message });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all media for a chat
// @route   GET /api/chats/:chatId/media
// @access  Private
exports.getChatMedia = async (req, res) => {
    try {
        const mediaMessages = await Message.find({
            chat: req.params.chatId,
            'media.0': { '$exists': true } // Ensure message has media
        }).select('media sender createdAt').sort({ createdAt: 1 });

        let allMedia = [];
        mediaMessages.forEach(msg => {
            msg.media.forEach(m => {
                allMedia.push({
                    _id: m._id,
                    type: m.type,
                    url: m.url,
                    fileName: m.fileName,
                    fileSize: m.fileSize,
                    sender: msg.sender.name,
                    createdAt: msg.createdAt
                });
            });
        });
        res.json(allMedia);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};