require('dotenv').config();
const app = require('./app'); // Importe l'application Express
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User'); // Import User model to update status

const PORT = process.env.PORT ; // Utilise directement le port du .env

// Connect to MongoDB
connectDB();

const server = http.createServer(app); // Crée le serveur HTTP avec l'app Express

// Crée l'instance Socket.IO
const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.CLIENT_URL ,
        credentials: true,
    },
});

console.log("SERVER DEBUG: Socket.IO instance created:", io);

// Passe l'instance 'io' à l'application Express pour qu'elle puisse configurer ses routes
// et les rendre disponibles aux contrôleurs.
// Nous allons modifier app.js pour qu'il exporte une fonction qui prend 'io' en argument.
app.setupRoutes(io); // APPEL CLÉ : Configure les routes de l'app avec l'instance io

io.on('connection', (socket) => {
    console.log('Connected to socket.io');

    socket.on('setup', async (userData) => {
        if (userData && userData._id) {
            socket.join(userData._id);
            console.log(`User ${userData.name} (ID: ${userData._id}) connected and joined room: ${userData._id}`);

            await User.findByIdAndUpdate(userData._id, { status: 'online' });
            io.emit('user status update', { userId: userData._id, status: 'online' });
            socket.emit('connected');
        } else {
            console.log('Invalid user data for setup');
            socket.disconnect();
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
        console.log('USER DISCONNECTED (via setup off)');
        if (socket.rooms) {
            const userId = Array.from(socket.rooms).find(room => room !== socket.id);
            if (userId) {
                await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: Date.now() });
                io.emit('user status update', { userId: userId, status: 'offline', lastSeen: Date.now() });
            }
        }
        socket.leaveAll();
    });

    socket.on('disconnect', async () => {
        console.log('Client disconnected from Socket.IO');
        if (socket.rooms) {
            const userId = Array.from(socket.rooms).find(room => room !== socket.id && room.length === 24);
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

// Nous n'exportons plus 'io' via module.exports ici.
// 'io' est maintenant une variable locale à ce fichier, accessible par les fonctions de Socket.IO.
// Pour les contrôleurs, nous allons le passer explicitement.
