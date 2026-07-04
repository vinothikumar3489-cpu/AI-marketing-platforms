import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const register = async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    }

    const { name, email, password } = parseResult.data;
    console.log("auth/register received email=", email);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashedPassword } });
    const token = signToken(user);

    return res.status(201).json({ success: true, user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) {
    console.error(`[Controller] register error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    }

    const { email, password } = parseResult.data;
    console.log("auth/login received email=", email);
    const user = await prisma.user.findUnique({ where: { email } });
    console.log("auth/login user found=", Boolean(user));

    if (!user || !bcrypt.compareSync(password, user.password)) {
      console.log("auth/login password valid=", user ? bcrypt.compareSync(password, user.password) : false);
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const token = signToken(user);
    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) {
    console.error(`[Controller] login error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const me = async (req, res) => {
  try {
    const user = req.user;
    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(`[Controller] me error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    console.error(`[Controller] logout error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
