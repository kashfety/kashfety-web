import express from "express";
import * as userController from "../controllers/userController.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// User Authentication & Account Management
router.post("/account/create", userController.createUserAccount);
router.post("/authentication/login", userController.authenticateUser);
router.post("/authentication/password-reset", userController.resetUserPassword);

// User Profile Management
router.get("/profile/:uid/data", verifyToken, userController.getUserProfileData);
router.put("/profile/:uid/update", verifyToken, userController.updateUserProfileData);
router.put("/profile/:uid/role", verifyToken, isAdmin, userController.updateUserRole);
router.delete("/account/:uid/delete", verifyToken, isAdmin, userController.deleteUserAccount);

// User Directory & Admin Management
router.get("/directory/all-users", verifyToken, isAdmin, userController.getAllUsersData);

// Legacy routes for backward compatibility
router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/reset-password", userController.resetPassword);
router.get("/profile/:id", verifyToken, userController.getUserProfile);
router.put("/profile/:id", verifyToken, userController.updateUserProfile);
router.get("/all", verifyToken, isAdmin, userController.getAllUsers);

export default router;