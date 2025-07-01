require('dotenv').config();
const app = require('./app'); // Express app
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User'); // Import User model to update status

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000", // Adjust for your frontend URL
        credentials: true,
    },
});

// Export io for use in controllers
exports.io = io;

io.on('connection', (socket) => {
    console.log('Connected to socket.io');

    // Setup user for private chat rooms
    socket.on('setup', async (userData) => {
        if (userData && userData._id) {
            socket.join(userData._id);
            console.log(`User ${userData.name} (ID: ${userData._id}) connected and joined room: ${userData._id}`);

            // Update user status to online
            await User.findByIdAndUpdate(userData._id, { status: 'online' });
            io.emit('user status update', { userId: userData._id, status: 'online' });
            socket.emit('connected');
        } else {
            console.log('Invalid user data for setup');
            socket.disconnect(); // Disconnect if no valid user data
        }
    });

    socket.on('join chat', (chatId) => {
        socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
    });

    socket.on('new message', (newMessageReceived) => {
        var chat = newMessageReceived.chat;

        if (!chat.users) return console.log('Chat.users not defined');

        chat.users.forEach((user) => {
            if (user._id === newMessageReceived.sender._id) return;

            socket.in(user._id).emit('message received', newMessageReceived);
        });
    });

    socket.on('typing', (chatId) => socket.in(chatId).emit('typing'));
    socket.on('stop typing', (chatId) => socket.in(chatId).emit('stop typing'));

    socket.on('message read', ({ messageId, userId, chatId }) => {
        socket.in(chatId).emit('message read', { messageId, userId });
    });

    socket.off('setup', async () => {
        console.log('USER DISCONNECTED');
        if (socket.rooms) {
            const userId = Array.from(socket.rooms).find(room => room !== socket.id);
            if (userId) {
                await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: Date.now() });
                io.emit('user status update', { userId: userId, status: 'offline', lastSeen: Date.now() });
            }
        }
        socket.leaveAll(); // Disconnect from all rooms
    });

    socket.on('disconnect', async () => {
        console.log('Client disconnected from Socket.IO');
        // This 'disconnect' listener fires when the client explicitly disconnects or loses connection.
        // The 'off' event listener above is specifically for the 'setup' event being turned off,
        // which might indicate a user logging out or changing status.
        // The more reliable place to update status on disconnect is the general 'disconnect' event.

        // Find the user ID from the socket's joined rooms
        // Note: When a user connects and calls 'setup', they join a room named after their _id.
        // We can iterate through socket.rooms to find this.
        if (socket.rooms) {
            const userId = Array.from(socket.rooms).find(room => room !== socket.id);
            if (userId) {
                await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: Date.now() });
                io.emit('user status update', { userId: userId, status: 'offline', lastSeen: Date.now() });
            }
        }
    });
});


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});