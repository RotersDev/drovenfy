import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../database/db";
import { uploadImage, isBase64 } from "../storage/supabase";

export const authRoutes = Router();

function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    avatar: user.avatar || undefined,
    plan: {
      type: user.planType || "basic",
      interval: user.planInterval || undefined,
      expiresAt: user.planExpiresAt?.toISOString() || undefined,
      startedAt: user.planStartedAt?.toISOString() || undefined,
    },
    createdAt: user.createdAt.toISOString(),
  };
}

authRoutes.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const isHash = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
    const valid = isHash
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!valid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (!isHash) {
      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

authRoutes.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Usuário já existe" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

authRoutes.get("/me/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

authRoutes.put("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, avatar } = req.body;

    let avatarUrl = avatar;
    if (avatar && isBase64(avatar)) {
      try { avatarUrl = await uploadImage(avatar, "avatars"); }
      catch { avatarUrl = undefined; }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(avatarUrl !== undefined && { avatar: avatarUrl }),
      },
    });

    res.json({ user: sanitizeUser(user) });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

authRoutes.put("/password/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const isHash = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
    const valid = isHash
      ? await bcrypt.compare(currentPassword, user.password)
      : currentPassword === user.password;

    if (!valid) {
      return res.status(400).json({ error: "Senha atual incorreta" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    res.json({ success: true });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
