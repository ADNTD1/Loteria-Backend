import { Router } from "express";
import { loginWithAccountNumber, loginGuest, logoutUser, getMe, getRanking } from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

// GET http://localhost:3000/api/users/ranking (Pública)
router.get(
  "/ranking",
  rateLimit({ windowMs: 60_000, limit: 60 }),
  getRanking
);

// POST http://localhost:3000/api/users/guest
router.post(
  "/guest",
  rateLimit({ windowMs: 60_000, limit: 10 }),
  loginGuest
);

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