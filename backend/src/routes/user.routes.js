import express from "express";
import { z } from "zod";
import { getCurrentUser, updateProfile } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";

export const userRouter = express.Router();
userRouter.use(requireAuth);

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profileImage: z.string().max(500).optional(),
  password: z.string().min(8).max(128).optional(),
});

userRouter.get("/me", getCurrentUser);
userRouter.put("/me", validate(updateProfileSchema), updateProfile);
