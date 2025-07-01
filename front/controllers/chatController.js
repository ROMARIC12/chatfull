const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Create or fetch one-to-one chat
// @route   POST /api/chats
// @access  Private
exports.createChat = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'UserId param not sent with request' });
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
    .populate('users', '-password')
    .populate('latestMessage');

    isChat = await User.populate(isChat, {
        path: 'latestMessage.sender',
        select: 'name profilePicture email', // CHANGEMENT ICI : 'email' au lieu de 'phone'
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            chatName: 'sender',
            isGroupChat: false,
            users: [req.user._id, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                'users',
                '-password'
            );
            res.status(200).json(fullChat);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

// @desc    Create Group Chat
// @route   POST /api/chats/group
// @access  Private
exports.createGroupChat = async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).json({ message: 'Please Fill all the feilds' });
    }

    var users = JSON.parse(req.body.users);

    // Rendre les participants facultatifs (au moins le créateur du groupe)
    // if (users.length < 2) {
    //     return res
    //         .status(400)
    //         .json({ message: 'More than 2 users are required to form a group chat' });
    // }

    // Assurez-vous que l'utilisateur qui crée le groupe est toujours un participant
    if (!users.includes(req.user._id.toString())) {
        users.push(req.user._id);
    }

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user._id,
            chatDescription: req.body.description || '',
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate('users', '-password')
            .populate('groupAdmin', '-password');

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Fetch all chats for a user
// @route   GET /api/chats
// @access  Private
exports.fetchChats = async (req, res) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate('users', '-password')
            .populate('groupAdmin', '-password')
            .populate('latestMessage')
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: 'latestMessage.sender',
                    select: 'name profilePicture email', // CHANGEMENT ICI : 'email' au lieu de 'phone'
                });
                res.status(200).send(results);
            });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// NOUVELLE FONCTION : Récupérer tous les groupes (publics)
// @desc    Fetch all groups
// @route   GET /api/chats/all-groups
// @access  Private (authentifié)
exports.getAllGroups = async (req, res) => {
    try {
        const groups = await Chat.find({ isGroupChat: true })
            .populate('users', '-password')
            .populate('groupAdmin', '-password');
        res.status(200).json(groups);
    } catch (error) {
        console.error('Error fetching all groups:', error);
        res.status(500).json({ message: 'Server error fetching all groups' });
    }
};


// @desc    Pin a chat
// @route   PUT /api/chats/:id/pin
// @access  Private
exports.pinChat = async (req, res) => {
    const { id } = req.params;
    try {
        const chat = await Chat.findById(id);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (!chat.users.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to pin this chat' });
        }
        chat.isPinned = !chat.isPinned;
        await chat.save();
        res.json({ message: 'Chat pin status updated', chat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Archive a chat
// @route   PUT /api/chats/:id/archive
// @access  Private
exports.archiveChat = async (req, res) => {
    const { id } = req.params;
    try {
        const chat = await Chat.findById(id);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (!chat.users.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to archive this chat' });
        }
        chat.isArchived = !chat.isArchived;
        await chat.save();
        res.json({ message: 'Chat archive status updated', chat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ... existing code for renameGroup, addToGroup, removeFromGroup, deleteGroup, transferGroupAdmin, getGroupParticipants ...
// Note: These functions are likely in a separate chatController.js or groupController.js
// If they are in the same file, ensure they are also updated to use 'email' instead of 'phone' in relevant populates.

// @desc    Rename Group
// @route   PUT /api/groups/:id
// @access  Private (Admin Only)
exports.renameGroup = async (req, res) => {
    const { id } = req.params;
    const { chatName, chatDescription } = req.body;

    try {
        const updatedChat = await Chat.findByIdAndUpdate(
            id,
            { chatName, chatDescription },
            { new: true }
        )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

        if (!updatedChat) {
            return res.status(404).json({ message: 'Chat not Found' });
        } else {
            res.json(updatedChat);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Add user to Group
// @route   PUT /api/groups/:id/add
// @access  Private (Admin Only)
exports.addToGroup = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if the current user is the admin (add this logic in middleware or here)
    const chat = await Chat.findById(id);
    if (!chat.isGroupChat || chat.groupAdmin.toString() !== req.user._id.toString()) {
        // PERMETTRE À UN NON-ADMIN DE REJOINDRE SI LE GROUPE EST PUBLIC OU SI C'EST UNE REQUÊTE DE REJOINDRE
        // Si vous voulez que n'importe qui puisse rejoindre, retirez cette condition ou adaptez-la.
        // Pour l'instant, on suppose que addToGroup est pour l'admin, sauf si c'est un "join" explicite.
        // Puisque le frontend appelle addGroupMember, il faut que le backend l'autorise.
        // Si c'est un "Join Group", l'utilisateur n'est pas forcément admin.
        // Donc, on doit vérifier si c'est l'admin OU si l'utilisateur n'est pas déjà membre et essaie de se joindre.
        if (!chat.users.includes(userId)) { // Si l'utilisateur n'est pas déjà membre
            // Permettre l'ajout si l'utilisateur est admin, OU si le groupe est public et l'utilisateur essaie de se joindre lui-même
            if (chat.groupAdmin.toString() !== req.user._id.toString() && userId !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Only group admin can add other users. You can only join yourself if not already a member.' });
            }
        } else {
            return res.status(400).json({ message: 'User already a member of this group.' });
        }
    }

    try {
        const added = await Chat.findByIdAndUpdate(
            id,
            { $push: { users: userId } },
            { new: true }
        )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

        if (!added) {
            return res.status(404).json({ message: 'Chat not Found' });
        } else {
            res.json(added);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Remove user from Group
// @route   PUT /api/groups/:id/remove
// @access  Private (Admin Only or Member Leaving)
exports.removeFromGroup = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // userId to remove

    const chat = await Chat.findById(id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Check if the current user is removing themselves OR is an admin removing someone else
    const isCurrentUserRemovingSelf = req.user._id.toString() === userId;
    const isCurrentUserAdmin = chat.isGroupChat && chat.groupAdmin.toString() === req.user._id.toString();

    if (!isCurrentUserRemovingSelf && !isCurrentUserAdmin) {
        return res.status(403).json({ message: 'Only group admin can remove other users' });
    }

    // Prevent admin from removing themselves if they are the only admin and there's no transfer of admin rights
    if (isCurrentUserRemovingSelf && isCurrentUserAdmin && chat.users.length > 1) {
        if (chat.users.length === 1) { // Only admin left, delete group
             await Chat.findByIdAndDelete(id);
             return res.json({ message: 'Group deleted as admin was the last member' });
        }
    }


    try {
        const removed = await Chat.findByIdAndUpdate(
            id,
            { $pull: { users: userId } },
            { new: true }
        )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

        if (!removed) {
            return res.status(404).json({ message: 'Chat not Found' });
        } else {
            if (removed.users.length === 0) {
                // If no users left, delete the group
                await Chat.findByIdAndDelete(id);
                return res.json({ message: 'Group deleted as all members left' });
            }
            res.json(removed);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


// @desc    Delete Group
// @route   DELETE /api/groups/:id
// @access  Private (Admin Only)
exports.deleteGroup = async (req, res) => {
    const { id } = req.params;

    try {
        const chat = await Chat.findById(id);
        if (!chat) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (chat.isGroupChat && chat.groupAdmin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only group admin can delete the group' });
        }

        await chat.deleteOne(); // Use deleteOne or findByIdAndDelete
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Transfer Group Admin
// @route   PUT /api/groups/:id/transfer-admin
// @access  Private (Current Admin Only)
exports.transferGroupAdmin = async (req, res) => {
    const { id } = req.params;
    const { newAdminId } = req.body;

    try {
        const chat = await Chat.findById(id);

        if (!chat) {
            return res.status(404).json({ message: 'Group not found' });
        }
        if (!chat.isGroupChat || chat.groupAdmin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only current group admin can transfer admin rights' });
        }
        if (!chat.users.includes(newAdminId)) {
            return res.status(400).json({ message: 'New admin must be a member of the group' });
        }

        chat.groupAdmin = newAdminId;
        const updatedChat = await chat.save();

        res.json({ message: 'Group admin transferred successfully', chat: updatedChat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    List group participants
// @route   GET /api/groups/:id/participants
// @access  Private
exports.getGroupParticipants = async (req, res) => {
    const { id } = req.params;

    try {
        const chat = await Chat.findById(id).populate('users', 'name email profilePicture status').populate('groupAdmin', 'name email'); // CHANGEMENT ICI : 'email' au lieu de 'phone'

        if (!chat || !chat.isGroupChat) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const participants = chat.users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            status: user.status,
            isAdmin: user._id.toString() === chat.groupAdmin._id.toString() ? true : false
        }));

        res.json(participants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
