const Channel = require('../models/Channel');

exports.getChannels = async (req, res) => {
    try {
        const userId = req.userId;
        const channels = await Channel.find({
            $or: [
                { type: 'public' },
                { members: userId }
            ]
        }).populate('members', 'username email');
        res.status(200).json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ message: 'Server error fetching channels' });
    }
};

exports.createChannel = async (req, res) => {
    try {
        const { name, description, type = 'public', members = [] } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Channel name is required' });
        }

        const existingChannel = await Channel.findOne({ name });
        if (existingChannel) {
            return res.status(400).json({ message: 'Channel already exists' });
        }

        // Ensure creator is always a member
        const initialMembers = [...new Set([...members, req.userId])];

        const newChannel = new Channel({
            name,
            description,
            type,
            members: initialMembers
        });

        await newChannel.save();
        // Populate members to match getChannels structure
        await newChannel.populate('members', 'username email');

        res.status(201).json(newChannel);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ message: 'Server error creating channel' });
    }
};

exports.joinChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.userId;

        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        if (channel.type === 'private') {
            return res.status(403).json({ message: 'Cannot join private channel directly' });
        }

        if (channel.members.includes(userId)) {
            return res.status(400).json({ message: 'User already in channel' });
        }

        channel.members.push(userId);
        await channel.save();
        await channel.populate('members', 'username email');

        res.status(200).json(channel);
    } catch (error) {
        console.error('Error joining channel:', error);
        res.status(500).json({ message: 'Server error joining channel' });
    }
};

exports.leaveChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.userId;

        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        channel.members = channel.members.filter(member => member.toString() !== userId);
        await channel.save();
        await channel.populate('members', 'username email');

        res.status(200).json(channel);
    } catch (error) {
        console.error('Error leaving channel:', error);
        res.status(500).json({ message: 'Server error leaving channel' });
    }
};

exports.updateChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { name, description } = req.body;
        const userId = req.userId;

        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check if user is a member (basic permission check)
        if (!channel.members.some(member => member.toString() === userId)) {
            return res.status(403).json({ message: 'Not authorized to update this channel' });
        }

        // Update fields if provided
        if (name) channel.name = name;
        if (description !== undefined) channel.description = description;

        await channel.save();
        await channel.populate('members', 'username email');

        // Only populate createdBy if it exists (for backward compatibility)
        if (channel.createdBy) {
            await channel.populate('createdBy', 'username email');
        }

        res.status(200).json(channel);
    } catch (error) {
        console.error('Error updating channel:', error);
        res.status(500).json({ message: 'Server error updating channel' });
    }
};

exports.deleteChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.userId;

        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check if user is the creator (admin)
        if (channel.createdBy.toString() !== userId) {
            return res.status(403).json({ message: 'Only the channel creator can delete this channel' });
        }

        await Channel.findByIdAndDelete(channelId);

        res.status(200).json({ message: 'Channel deleted successfully', channelId });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ message: 'Server error deleting channel' });
    }
};
