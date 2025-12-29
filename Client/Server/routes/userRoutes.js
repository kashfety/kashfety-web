import express from "express";
import * as userController from "../controllers/userController.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// User Authentication & Account Management
router.post("/account/create", userController.createUserAccount);
router.post("/authentication/login", userController.authenticateUser);
router.post("/authentication/password-reset", userController.resetUserPassword);

// User Profile Management
router.get("/profile/:uid/data", authenticateToken, userController.getUserProfileData);
router.put("/profile/:uid/update", authenticateToken, userController.updateUserProfileData);
router.put("/profile/:uid/role", authenticateToken, isAdmin, userController.updateUserRole);
router.delete("/account/:uid/delete", authenticateToken, isAdmin, userController.deleteUserAccount);

// User Directory & Admin Management
router.get("/directory/all-users", authenticateToken, isAdmin, userController.getAllUsersData);

// Legacy routes for backward compatibility
router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/reset-password", userController.resetPassword);
router.get("/profile/:id", authenticateToken, userController.getUserProfile);
router.put("/profile/:id", authenticateToken, userController.updateUserProfile);
router.get("/all", authenticateToken, isAdmin, userController.getAllUsers);

export default router;