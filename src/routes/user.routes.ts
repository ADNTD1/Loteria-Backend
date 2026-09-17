import { Router } from "express";
import { loginWithAccountNumber, logoutUser } from "../controllers/user.controller.js";
import rateLimit from "express-rate-limit";

const router = Router();

// POST http://localhost:3000/api/users/login
router.post("/login", 
	rateLimit({ windowMs: 60_000,limit: 40,}), // 40 peticiones por minuto, considerando que 38 alumnos usan la misma ip pública
	loginWithAccountNumber);

// POST http://localhost:3000/api/users/logout
router.post("/logout", 
	rateLimit({ windowMs: 60_000,limit: 50,}),
	logoutUser);

export default router;
