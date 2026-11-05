import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
export const generateAccessToken = (payload) => {
    return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
        expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
    });
};
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
        expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
    });
};
export const verifyAccessToken = (token) => {
    return jwt.verify(token, ENV.JWT_ACCESS_SECRET);
};
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET);
};
export const setRefreshTokenCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
    });
};
export const clearRefreshTokenCookie = (res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    });
};
