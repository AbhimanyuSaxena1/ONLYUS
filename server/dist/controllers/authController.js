import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, setRefreshTokenCookie, clearRefreshTokenCookie, } from '../utils/token.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authValidator.js';
import { logger } from '../utils/logger.js';
export const getAuthStatus = async (_req, res) => {
    try {
        const userCount = await User.countDocuments();
        res.json({
            success: true,
            data: {
                totalRegistered: userCount,
                maxAllowed: ENV.MAX_ALLOWED_USERS,
                isRegistrationOpen: userCount < ENV.MAX_ALLOWED_USERS,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const register = async (req, res) => {
    try {
        const validated = registerSchema.parse(req.body);
        const userCount = await User.countDocuments();
        if (userCount >= ENV.MAX_ALLOWED_USERS) {
            res.status(403).json({
                success: false,
                message: 'Registration is closed. OnlyUs is strictly private to two authorized accounts.',
            });
            return;
        }
        const existingUser = await User.findOne({ email: validated.email });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'An account with this email already exists.',
            });
            return;
        }
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(validated.password, salt);
        const newUser = await User.create({
            name: validated.name,
            email: validated.email,
            passwordHash,
            profilePicture: validated.profilePicture || '',
            isOnline: true,
            lastSeen: new Date(),
        });
        const tokenPayload = {
            id: newUser._id.toString(),
            email: newUser.email,
            name: newUser.name,
        };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        setRefreshTokenCookie(res, refreshToken);
        logger.info(`New user registered: ${newUser.name} (${newUser.email}) [Total: ${userCount + 1}/${ENV.MAX_ALLOWED_USERS}]`);
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: newUser._id.toString(),
                    name: newUser.name,
                    email: newUser.email,
                    profilePicture: newUser.profilePicture,
                    isOnline: newUser.isOnline,
                    lastSeen: newUser.lastSeen,
                },
                accessToken,
            },
        });
    }
    catch (error) {
        if (error.errors) {
            res.status(400).json({ success: false, message: error.errors[0]?.message || 'Validation error' });
            return;
        }
        res.status(500).json({ success: false, message: error.message });
    }
};
export const login = async (req, res) => {
    try {
        const validated = loginSchema.parse(req.body);
        const user = await User.findOne({ email: validated.email });
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
        };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        setRefreshTokenCookie(res, refreshToken);
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    profilePicture: user.profilePicture,
                    isOnline: user.isOnline,
                    lastSeen: user.lastSeen,
                },
                accessToken,
            },
        });
    }
    catch (error) {
        if (error.errors) {
            res.status(400).json({ success: false, message: error.errors[0]?.message || 'Validation error' });
            return;
        }
        res.status(500).json({ success: false, message: error.message });
    }
};
export const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken || req.body.refreshToken;
        if (!token) {
            res.status(401).json({ success: false, message: 'Refresh token missing' });
            return;
        }
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id);
        if (!user) {
            clearRefreshTokenCookie(res);
            res.status(401).json({ success: false, message: 'User not found' });
            return;
        }
        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
        };
        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);
        setRefreshTokenCookie(res, newRefreshToken);
        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
            },
        });
    }
    catch (error) {
        clearRefreshTokenCookie(res);
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
};
export const logout = async (req, res) => {
    try {
        if (req.user?.id) {
            await User.findByIdAndUpdate(req.user.id, {
                isOnline: false,
                lastSeen: new Date(),
                currentCallId: null,
            });
        }
        clearRefreshTokenCookie(res);
        res.json({ success: true, message: 'Logged out successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getMe = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id).select('-passwordHash');
        if (!currentUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Also fetch the partner user (the only other user in OnlyUs!)
        const partnerUser = await User.findOne({ _id: { $ne: currentUser._id } }).select('-passwordHash');
        res.json({
            success: true,
            data: {
                user: currentUser,
                partner: partnerUser || null,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const validated = updateProfileSchema.parse(req.body);
        const updatedUser = await User.findByIdAndUpdate(req.user.id, { $set: validated }, { new: true }).select('-passwordHash');
        res.json({
            success: true,
            data: updatedUser,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
