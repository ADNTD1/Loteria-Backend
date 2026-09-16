import { Router } from "express";
import { loginWithAccountNumber, logoutUser } from "../controllers/user.controller.js";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middlewares/validation.middleware.js";
import { loginSchema, logoutSchema } from "../validations/user.validation.js";

const router = Router();

// POST http://localhost:3000/api/users/login
router.post("/login",
	rateLimit({ windowMs: 60_000,limit: 40,}), // 40 peticiones por minuto, considerando que 38 alumnos usan la misma ip pública
	validateBody(loginSchema),
	loginWithAccountNumber);

// POST http://localhost:3000/api/users/logout
router.post("/logout",
	rateLimit({ windowMs: 60_000,limit: 50,}),
	validateBody(logoutSchema),
	logoutUser);

export default router;
