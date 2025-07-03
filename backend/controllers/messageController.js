const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');
const path = require('path');
const fs = require('fs');
// NE PLUS IMPORTER getIo DIRECTEMENT ICI
// const { getIo } = require('../server');

// @desc    Send a text message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, io) => { // AJOUTÉ io en argument
    console.log("CONTROLLER DEBUG: io instance inside sendMessage:", io); // Vérifiez si io est défini
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

        message = await message.populate('sender', 'name profilePicture email');
        message = await message.populate('chat');
        message = await User.populate(message, {
            path: 'chat.users',
            select: 'name profilePicture email',
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        console.log("DEBUG: message.chat.users before emit (text message):", message.chat.users);

        message.chat.users.forEach((user, index) => {
            console.log(`DEBUG: Processing user at index ${index} (text message):`, user);
            if (user && user._id && user._id.toString() !== req.user._id.toString()) {
                const userIdToEmit = user._id.toString();
                console.log(`DEBUG: Attempting to emit text message to user ID: ${userIdToEmit}`);
                try {
                    if (io && io.sockets) { // Double vérification de io et io.sockets
                        io.sockets.to(userIdToEmit).emit('message received', message);
                        console.log(`DEBUG: Successfully emitted text message to user ID: ${userIdToEmit}`);
                    } else {
                        console.warn("WARN: io or io.sockets is undefined during text message emit.");
                    }
                } catch (emitError) {
                    console.error(`ERROR: Failed to emit text message to user ID ${userIdToEmit}:`, emitError);
                }
            } else {
                console.warn(`WARN: Skipping user at index ${index} (text message). User is null/undefined or missing _id, or is sender:`, user);
            }
        });

        res.json(message);
    } catch (error) {
        console.error("Error sending text message:", error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Send media messages
// @route   POST /api/messages/media
// @access  Private
exports.sendMedia = async (req, res, io) => { // AJOUTÉ io en argument
    console.log("CONTROLLER DEBUG: io instance inside sendMedia:", io); // Vérifiez si io est défini
    console.log("Received media upload request.");
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    const { chatId } = req.body;
    if (!chatId) {
        console.log("Error: Chat ID is missing from request body.");
        return res.status(400).json({ message: 'Chat ID is required' });
    }

    if (!req.files || req.files.length === 0) {
        console.log("Error: No media files found in req.files.");
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
            mimetype: file.mimetype,
        };
    });

    try {
        var newMessage = {
            sender: req.user._id,
            chat: chatId,
            media: mediaArray,
        };

        var message = await Message.create(newMessage);

        message = await message.populate('sender', 'name profilePicture email');
        message = await message.populate('chat');
        message = await User.populate(message, {
            path: 'chat.users',
            select: 'name profilePicture email',
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        console.log("DEBUG: message.chat.users before emit (media message):", message.chat.users);

        message.chat.users.forEach((user, index) => {
            console.log(`DEBUG: Processing user at index ${index} (media message):`, user);
            if (user && user._id && user._id.toString() !== req.user._id.toString()) {
                const userIdToEmit = user._id.toString();
                console.log(`DEBUG: Attempting to emit media message to user ID: ${userIdToEmit}`);
                try {
                    if (io && io.sockets) { // Double vérification de io et io.sockets
                        io.sockets.to(userIdToEmit).emit('message received', message);
                        console.log(`DEBUG: Successfully emitted media message to user ID: ${userIdToEmit}`);
                    } else {
                        console.warn("WARN: io or io.sockets is undefined during media message emit.");
                    }
                } catch (emitError) {
                    console.error(`ERROR: Failed to emit media message to user ID ${userIdToEmit}:`, emitError);
                    throw emitError;
                }
            } else {
                console.warn(`WARN: Skipping user at index ${index} (media message). User is null/undefined or missing _id, or is sender:`, user);
            }
        });

        res.status(200).json(message);
    } catch (error) {
        console.error("Error creating message with media:", error);
        mediaArray.forEach(media => {
            const filePath = path.join(__dirname, '..', media.url.replace(process.env.BASE_URL, ''));
            fs.unlink(filePath, (err) => {
                if (err) console.error("Failed to delete media file:", err);
            });
        });
        res.status(400).json({ message: error.message });
    }
};


// @desc    Get all messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
exports.allMessages = async (req, res) => {
    try {
        console.log(`DEBUG Backend: Fetching all messages for chat ID: ${req.params.chatId}`);
        const messages = await Message.find({ chat: req.params.chatId })
            .populate('sender', 'name profilePicture email')
            .populate('chat');
        console.log("DEBUG Backend: Messages found for chat:", messages.length);
        // console.log("DEBUG Backend: Messages data:", messages);
        res.json(messages);
    } catch (error) {
        console.error("ERROR Backend: Failed to fetch all messages:", error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/:messageId/read
// @access  Private
exports.markMessageAsRead = async (req, res, io) => { // AJOUTÉ io en argument
    const { messageId } = req.params;
    try {
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (!message.readBy.includes(req.user._id)) {
            message.readBy.push(req.user._id);
            await message.save();

            if (io && io.to) {
                io.to(message.chat.toString()).emit('message read', {
                    messageId: message._id,
                    userId: req.user._id
                });
            } else {
                console.warn("WARN: io or io.to is undefined during message read emit.");
            }
        }
        res.json({ message: 'Message marked as read', message });
    } catch (error) {
        console.error("Error marking message as read:", error);
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
            'media.0': { '$exists': true }
        })
        .populate('sender', 'name')
        .select('media sender createdAt')
        .sort({ createdAt: 1 });

        let allMedia = [];
        mediaMessages.forEach(msg => {
            msg.media.forEach(m => {
                allMedia.push({
                    _id: m._id,
                    type: m.type,
                    url: m.url,
                    fileName: m.fileName,
                    fileSize: m.fileSize,
                    mimetype: m.mimetype,
                    sender: msg.sender ? msg.sender.name : 'Unknown',
                    createdAt: msg.createdAt
                });
            });
        });
        res.json(allMedia);
    } catch (error) {
        console.error("Error getting chat media:", error);
        res.status(500).json({ message: error.message });
    }
};
