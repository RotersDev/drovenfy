import { Router } from "express";
import { prisma } from "../database/db";
import { uploadImage, isBase64 } from "../storage/supabase";

export const menuRoutes = Router();

async function convertIfBase64(value: string | null | undefined, folder: string): Promise<string | null> {
  if (!value) return null;
  if (isBase64(value)) {
    try { return await uploadImage(value, folder); }
    catch (err) { console.error("Auto-convert base64 failed:", err); return null; }
  }
  return value;
}

function serializeMenu(menu: any) {
  const categories = (menu.categories || [])
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      image: cat.image,
      products: (cat.products || [])
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          highlight: p.highlight,
        })),
    }));

  return {
    id: menu.id,
    userId: menu.userId,
    name: menu.name,
    slug: menu.slug,
    logo: menu.logo,
    banner: menu.banner,
    primaryColor: menu.primaryColor,
    categories,
    whatsappNumber: menu.whatsappNumber,
    whatsappMessage: menu.whatsappMessage,
    deliveryFeeCity: menu.deliveryFeeCity,
    deliveryFeeSitio: menu.deliveryFeeSitio,
    description: menu.description,
    businessType: menu.businessType,
    address: menu.address,
    addressCep: menu.addressCep,
    addressStreet: menu.addressStreet,
    addressNumber: menu.addressNumber,
    addressComplement: menu.addressComplement,
    addressNeighborhood: menu.addressNeighborhood,
    addressCity: menu.addressCity,
    addressState: menu.addressState,
    latitude: menu.latitude,
    longitude: menu.longitude,
    deliveryTiers: menu.deliveryTiers,
    instagram: menu.instagram,
    phone: menu.phone,
    estimatedDelivery: menu.estimatedDelivery,
    minimumOrder: menu.minimumOrder,
    paymentMethods: menu.paymentMethods,
    acceptsPickup: menu.acceptsPickup,
    isActive: menu.isActive,
    businessHours: menu.businessHours,
    createdAt: menu.createdAt.toISOString(),
    updatedAt: menu.updatedAt?.toISOString() || undefined,
  };
}

const menuInclude = {
  categories: {
    include: { products: true },
    orderBy: { sortOrder: "asc" as const },
  },
};

menuRoutes.get("/menus", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const menus = await prisma.menu.findMany({
      where: { userId },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            image: true,
            _count: { select: { products: true } },
          },
          orderBy: { sortOrder: "asc" as const },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = menus.map(menu => {
      const categories = menu.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        image: cat.image,
        productCount: cat._count.products,
        products: [],
      }));
      return {
        id: menu.id,
        userId: menu.userId,
        name: menu.name,
        slug: menu.slug,
        logo: menu.logo,
        banner: menu.banner,
        primaryColor: menu.primaryColor,
        categories,
        whatsappNumber: menu.whatsappNumber,
        whatsappMessage: menu.whatsappMessage,
        deliveryFeeCity: menu.deliveryFeeCity,
        deliveryFeeSitio: menu.deliveryFeeSitio,
        description: menu.description,
        businessType: menu.businessType,
        address: menu.address,
        addressCep: menu.addressCep,
        addressStreet: menu.addressStreet,
        addressNumber: menu.addressNumber,
        addressComplement: menu.addressComplement,
        addressNeighborhood: menu.addressNeighborhood,
        addressCity: menu.addressCity,
        addressState: menu.addressState,
        latitude: menu.latitude,
        longitude: menu.longitude,
        deliveryTiers: menu.deliveryTiers,
        instagram: menu.instagram,
        phone: menu.phone,
        estimatedDelivery: menu.estimatedDelivery,
        minimumOrder: menu.minimumOrder,
        paymentMethods: menu.paymentMethods,
        acceptsPickup: menu.acceptsPickup,
        isActive: menu.isActive,
        businessHours: menu.businessHours,
        createdAt: menu.createdAt.toISOString(),
        updatedAt: menu.updatedAt?.toISOString() || undefined,
        _counts: {
          products: menu.categories.reduce((sum, c) => sum + c._count.products, 0),
          categories: menu.categories.length,
        },
      };
    });

    res.json(result);
  } catch (err) {
    console.error("List menus error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

menuRoutes.post("/menus", async (req, res) => {
  try {
    const { userId, menu: data } = req.body;

    const logo = await convertIfBase64(data.logo, "logos");
    const banner = await convertIfBase64(data.banner, "banners");

    const categories = await Promise.all(
      (data.categories || []).map(async (cat: any, ci: number) => {
        const catImage = await convertIfBase64(cat.image, "categories");
        const products = await Promise.all(
          (cat.products || []).map(async (p: any, pi: number) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.price || 0,
            image: await convertIfBase64(p.image, "products"),
            highlight: p.highlight || false,
            sortOrder: pi,
          }))
        );
        return {
          id: cat.id,
          name: cat.name,
          image: catImage,
          sortOrder: ci,
          products: { create: products },
        };
      })
    );

    const menu = await prisma.menu.create({
      data: {
        userId,
        name: data.name,
        slug: data.slug,
        logo,
        banner,
        primaryColor: data.primaryColor || "#f97316",
        whatsappNumber: data.whatsappNumber || "",
        whatsappMessage: data.whatsappMessage || "",
        deliveryFeeCity: data.deliveryFeeCity ?? null,
        deliveryFeeSitio: data.deliveryFeeSitio ?? null,
        description: data.description || null,
        businessType: data.businessType || null,
        address: data.address || null,
        addressCep: data.addressCep || null,
        addressStreet: data.addressStreet || null,
        addressNumber: data.addressNumber || null,
        addressComplement: data.addressComplement || null,
        addressNeighborhood: data.addressNeighborhood || null,
        addressCity: data.addressCity || null,
        addressState: data.addressState || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        deliveryTiers: data.deliveryTiers || null,
        instagram: data.instagram || null,
        phone: data.phone || null,
        estimatedDelivery: data.estimatedDelivery || null,
        minimumOrder: data.minimumOrder ?? null,
        paymentMethods: data.paymentMethods || [],
        acceptsPickup: data.acceptsPickup || false,
        isActive: data.isActive ?? true,
        businessHours: data.businessHours || null,
        categories: { create: categories },
      },
      include: menuInclude,
    });

    res.json(serializeMenu(menu));
  } catch (err) {
    console.error("Create menu error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

menuRoutes.get("/menus/:id", async (req, res) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: menuInclude,
    });
    if (menu) res.json(serializeMenu(menu));
    else res.status(404).json({ error: "Cardápio não encontrado" });
  } catch (err) {
    console.error("Get menu error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

menuRoutes.put("/menus/:id", async (req, res) => {
  try {
    const { menu: data } = req.body;
    const menuId = req.params.id;

    const logo = await convertIfBase64(data.logo, "logos");
    const banner = await convertIfBase64(data.banner, "banners");

    const categories = await Promise.all(
      (data.categories || []).map(async (cat: any, ci: number) => {
        const catImage = await convertIfBase64(cat.image, "categories");
        const products = await Promise.all(
          (cat.products || []).map(async (p: any, pi: number) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.price || 0,
            image: await convertIfBase64(p.image, "products"),
            highlight: p.highlight || false,
            sortOrder: pi,
          }))
        );
        return {
          id: cat.id,
          name: cat.name,
          image: catImage,
          sortOrder: ci,
          products: { create: products },
        };
      })
    );

    await prisma.category.deleteMany({ where: { menuId } });

    const menu = await prisma.menu.update({
      where: { id: menuId },
      data: {
        name: data.name,
        slug: data.slug,
        logo,
        banner,
        primaryColor: data.primaryColor || "#f97316",
        whatsappNumber: data.whatsappNumber || "",
        whatsappMessage: data.whatsappMessage || "",
        deliveryFeeCity: data.deliveryFeeCity ?? null,
        deliveryFeeSitio: data.deliveryFeeSitio ?? null,
        description: data.description || null,
        businessType: data.businessType || null,
        address: data.address || null,
        addressCep: data.addressCep || null,
        addressStreet: data.addressStreet || null,
        addressNumber: data.addressNumber || null,
        addressComplement: data.addressComplement || null,
        addressNeighborhood: data.addressNeighborhood || null,
        addressCity: data.addressCity || null,
        addressState: data.addressState || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        deliveryTiers: data.deliveryTiers || null,
        instagram: data.instagram || null,
        phone: data.phone || null,
        estimatedDelivery: data.estimatedDelivery || null,
        minimumOrder: data.minimumOrder ?? null,
        paymentMethods: data.paymentMethods || [],
        acceptsPickup: data.acceptsPickup || false,
        isActive: data.isActive ?? true,
        businessHours: data.businessHours || null,
        updatedAt: new Date(),
        categories: { create: categories },
      },
      include: menuInclude,
    });

    res.json(serializeMenu(menu));
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Cardápio não encontrado" });
    }
    console.error("Update menu error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

menuRoutes.delete("/menus/:id", async (req, res) => {
  try {
    await prisma.menu.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.json({ success: true });
    }
    console.error("Delete menu error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

menuRoutes.get("/public/menu/:slug", async (req, res) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { slug: req.params.slug },
      include: menuInclude,
    });
    if (menu) res.json(serializeMenu(menu));
    else res.status(404).json({ error: "Cardápio não encontrado" });
  } catch (err) {
    console.error("Public menu error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
