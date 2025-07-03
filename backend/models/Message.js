const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    content: {
        type: String,
        trim: true,
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
    },
    media: [
        {
            type: { // 'image', 'video', 'audio', 'document'
                type: String,
                enum: ['image', 'video', 'audio', 'document'],
            },
            url: String,
            fileName: String,
            fileSize: Number,
            mimetype: String, // <-- AJOUTÉ : Ce champ est crucial pour le frontend
        },
    ],
    readBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Message', MessageSchema);
