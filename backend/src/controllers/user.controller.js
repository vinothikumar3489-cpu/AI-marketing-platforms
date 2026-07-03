import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";

export const getCurrentUser = async (req, res) => {
  const user = req.user;
  const projectCount = await prisma.chat.count({ where: { userId: user.id } });
  const analysesCount = await prisma.analysis.count({ where: { userId: user.id } });
  const seoCount = await prisma.seoAnalysis.count({ where: { userId: user.id } });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage || null,
      role: user.role || "member",
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      projectCount,
      analysesCount,
      seoCount,
    },
  });
};

export const updateProfile = async (req, res) => {
  const { name, profileImage, password } = req.body;
  const updateData = {};

  if (name) updateData.name = name;
  if (profileImage) updateData.profileImage = profileImage;
  if (password) updateData.password = bcrypt.hashSync(password, 10);
  updateData.lastActiveAt = new Date();

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage || null,
        role: user.role || "member",
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Unable to update profile" });
  }
};
