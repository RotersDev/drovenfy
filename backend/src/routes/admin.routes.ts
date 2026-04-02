import { Router } from "express";
import { prisma } from "../database/db";

export const adminRoutes = Router();

adminRoutes.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalMenus,
      proUsers,
      newUsersLast7Days,
      newUsersLast30Days,
      newMenusLast7Days,
      newMenusLast30Days,
      monthlyPro,
      quarterlyPro,
      annualPro,
      totalProducts,
      totalCategories,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.menu.count(),
      prisma.user.count({ where: { planType: "pro" } }),
      prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.menu.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.menu.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.user.count({ where: { planType: "pro", planInterval: "monthly" } }),
      prisma.user.count({ where: { planType: "pro", planInterval: "quarterly" } }),
      prisma.user.count({ where: { planType: "pro", planInterval: "annual" } }),
      prisma.product.count(),
      prisma.category.count(),
    ]);

    res.json({
      totalUsers,
      totalMenus,
      totalProducts,
      totalCategories,
      proUsers,
      basicUsers: totalUsers - proUsers,
      menusPerUser: totalUsers > 0 ? (totalMenus / totalUsers).toFixed(1) : "0",
      newUsersLast7Days,
      newUsersLast30Days,
      newMenusLast7Days,
      newMenusLast30Days,
      planDistribution: {
        monthly: monthlyPro,
        quarterly: quarterlyPro,
        annual: annualPro,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

adminRoutes.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        menus: {
          include: {
            categories: {
              include: { products: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = users.map((u) => {
      const totalProducts = u.menus.reduce(
        (acc, m) => acc + m.categories.reduce((cAcc, c) => cAcc + c.products.length, 0),
        0
      );
      return {
        id: u.id,
        email: u.email,
        name: u.name || "",
        plan: {
          type: u.planType || "basic",
          interval: u.planInterval || undefined,
          expiresAt: u.planExpiresAt?.toISOString() || undefined,
          startedAt: u.planStartedAt?.toISOString() || undefined,
        },
        createdAt: u.createdAt.toISOString(),
        menuCount: u.menus.length,
        totalProducts,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

adminRoutes.get("/menus", async (_req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      include: {
        user: true,
        categories: {
          include: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = menus.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      logo: m.logo,
      ownerEmail: m.user?.email || "Desconhecido",
      ownerName: m.user?.name || "",
      ownerId: m.userId,
      categoryCount: m.categories.length,
      productCount: m.categories.reduce((acc, c) => acc + c.products.length, 0),
      whatsappNumber: m.whatsappNumber || "",
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt?.toISOString() || null,
    }));

    res.json(result);
  } catch (err) {
    console.error("Admin menus error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

adminRoutes.delete("/users/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.json({ success: true });
    }
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

adminRoutes.put("/users/:id/plan", async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        planType: plan.type || "basic",
        planInterval: plan.interval || null,
        planExpiresAt: plan.expiresAt ? new Date(plan.expiresAt) : null,
        planStartedAt: plan.startedAt ? new Date(plan.startedAt) : null,
      },
    });

    res.json({
      success: true,
      plan: {
        type: user.planType,
        interval: user.planInterval || undefined,
        expiresAt: user.planExpiresAt?.toISOString() || undefined,
        startedAt: user.planStartedAt?.toISOString() || undefined,
      },
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    console.error("Admin update plan error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

adminRoutes.delete("/menus/:id", async (req, res) => {
  try {
    await prisma.menu.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.json({ success: true });
    }
    console.error("Admin delete menu error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
