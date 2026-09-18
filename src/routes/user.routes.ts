import { Router } from "express";
import { loginWithAccountNumber, logoutUser, getMe } from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

// POST http://localhost:3000/api/users/login
router.post(
  "/login", 
  rateLimit({ windowMs: 60_000, limit: 40 }), // 40 peticiones por minuto
  loginWithAccountNumber
);

// POST http://localhost:3000/api/users/logout
router.post(
  "/logout", 
  rateLimit({ windowMs: 60_000, limit: 50 }),
  logoutUser
);

// GET http://localhost:3000/api/users/me (Protegida con token)
router.get(
  "/me",
  authenticateToken,
  getMe
);

export default router;