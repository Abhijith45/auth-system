import UserModel from '../models/user.model.js'
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from "../config/config.js";
import sessionModel from '../models/session.model.js';
import { sendEmail } from '../services/email.service.js';
import { generateOTP, getOtpHtml } from '../utils/utils.js';
import otpModel from '../models/otp.model.js';

// POST /api/auth/register
export const register = async (req,res) => {
    const {username, useremail, password} = req.body;

    const isAlreadyRegistered = await UserModel.findOne({$or:[
        {userName: username},
        {userEmail: useremail}
    ]})

    if (isAlreadyRegistered) {
        return res.status(409).json({ message: 'UserName or Email already exist' });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const newUser = await UserModel.create({
        userName: username,
        userEmail: useremail,
        password: hashedPassword
    })

    // const refreshToken = jwt.sign({
    //     id: newUser._id,
    // }, config.JWT_SECRET, { expiresIn: "7d" });

    // const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // const session = await sessionModel.create({
    //     user: newUser._id,
    //     refreshTokenHash,
    //     ip: req.ip,
    //     userAgent: req.headers['user-agent']
    // })

    // const accessToken = jwt.sign({
    //     id: newUser._id,
    //     sessionId: session._id
    // }, config.JWT_SECRET, { expiresIn: "15min" });

    // res.cookie('refreshToken', refreshToken, {
    //     httpOnly: true,
    //     secure: false,
    //     sameSite: 'strict',
    //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    // });

    const otp = generateOTP();
    const html = getOtpHtml(otp);

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await otpModel.create({
        email: useremail,
        user: newUser._id,
        otpHash
    })

    await sendEmail(useremail, 'OTP for Email Verification', `Your OTP is ${otp}`, html);

    res.status(201).json({ message: 'User registered successfully', user: {
        username: newUser.userName,
        useremail: newUser.userEmail,
        verified: newUser.verified

    } });

}

export const login = async (req, res) => {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ userName: username });

    if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    if(!user.verified){
        return res.status(401).json({ message: 'Email not verified. Please verify your email to login.' });
    }

    const isPasswordValid = crypto.createHash('sha256').update(password).digest('hex') === user.password;

    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    const refreshToken = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET, { expiresIn: "7d" });

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await sessionModel.create({
        user: user._id,
        refreshTokenHash,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    })
    const accessToken = jwt.sign({
        id: user._id,
        sessionId: session._id
    }, config.JWT_SECRET, { expiresIn: "15min" });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(200).json({ message: 'Logged in successfully', user: { username: user.userName, useremail: user.userEmail }, accessToken });

}

// GET /api/auth/get-me
export const getMe = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized. Token not found.' });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        const user = await UserModel.findById(decoded.id);

        res.status(200).json({
            message: "User details fetched successfully",
            user: {
                username: user.userName,
                useremail: user.userEmail
            }
        })
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }

}

// GET /api/auth/refresh-token
export const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        console.log("Refresh token not found in cookies");
        return res.status(401).json({ message: 'Unauthorized. Refresh token not found.' });
    }
   
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false
    });

    if(!session){
        return res.status(401).json({ message: 'Unauthorized. Invalid refresh token.' });
    }
 
    const accessToken = jwt.sign({
        id: decoded.id,
    }, config.JWT_SECRET, { expiresIn: "15m" });

    const newRefreshToken = jwt.sign({
        id: decoded.id,
    }, config.JWT_SECRET, { expiresIn: "7d" });

    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();

    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({ message: 'Access token refreshed successfully', accessToken });
};
    
// logout
export const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        return res.status(401).json({ message: 'Unauthorized. Refresh token not found.' });
    }
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false
    })

    if(!session){
        return res.status(401).json({ message: 'Unauthorized. Invalid refresh token.' });
    }

    session.revoked = true;
    await session.save();

    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });

}

export const logoutAll = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        return res.status(401).json({ message: 'Unauthorized. Refresh token not found.' });
    }
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    await sessionModel.updateMany({
        user: decoded.id,
        revoked: false
    }, { revoked: true });

    res.clearCookie('refreshToken');

    res.status(200).json({ message: 'Logged out from all devices successfully' });
}

export const verifyEmail = async (req,res) =>{
    const { otp, email } = req.query;

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    const otpRecord = await otpModel.findOne({ email, otpHash });

    if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid OTP.' });
    }

    const user = await UserModel.findByIdAndUpdate(otpRecord.user, { verified: true });

    await otpModel.deleteMany({ user: user._id });

    res.status(200).json({ message: 'Email verified successfully.', 
        user: {
            username: user.userName,
            useremail: user.userEmail,
            verified: user.verified
        }
     });
}

export default { register, getMe, refreshToken, logout, logoutAll };