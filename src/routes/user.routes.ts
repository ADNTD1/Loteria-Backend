import { Router } from "express";
import { loginWithAccountNumber, logoutUser } from "../controllers/user.controller.js";

const router = Router();

// POST http://localhost:3000/api/users/login
router.post("/login", loginWithAccountNumber);

// POST http://localhost:3000/api/users/logout
router.post("/logout", logoutUser);

export default router;