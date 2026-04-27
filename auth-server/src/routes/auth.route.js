import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post('/register', authController.register);

authRouter.post('/login', authController.login);

authRouter.get('/get-me', authController.getMe);

// GET /api/auth/refresh-token
authRouter.get('/refresh-token', authController.refreshToken);

// Logout
authRouter.get('/logout', authController.logout);

// logoutAll
authRouter.get('/logout-all', authController.logoutAll);

authRouter.get('/verify-email', authController.verifyEmail);

export default authRouter;