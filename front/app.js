require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes'); // New group routes

const app = express();

// Set BASE_URL for media files
process.env.BASE_URL = process.env.NODE_ENV === 'production'
    ? 'YOUR_PRODUCTION_URL' // Replace with your production domain
    : `http://localhost:${process.env.PORT || 5000}`;


// Middleware
app.use(express.json()); // Body parser for JSON
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Allow your frontend origin
    credentials: true,
}));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes); // Use group routes

// Basic route for testing
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware (optional but recommended)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;