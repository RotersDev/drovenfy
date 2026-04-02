import { Router } from "express";
import { uploadImage, isBase64 } from "../storage/supabase";

export const uploadRoutes = Router();

uploadRoutes.post("/", async (req, res) => {
  try {
    const { image, folder = "general" } = req.body;

    if (!image || !isBase64(image)) {
      return res.status(400).json({ error: "Imagem base64 inválida" });
    }

    const url = await uploadImage(image, folder);
    res.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});

uploadRoutes.post("/batch", async (req, res) => {
  try {
    const { images, folder = "general" } = req.body;

    if (!Array.isArray(images)) {
      return res.status(400).json({ error: "Array de imagens inválido" });
    }

    const results = await Promise.all(
      images.map(async (img: { key: string; data: string }) => {
        if (!isBase64(img.data)) return { key: img.key, url: img.data };
        const url = await uploadImage(img.data, folder);
        return { key: img.key, url };
      })
    );

    res.json({ results });
  } catch (err) {
    console.error("Batch upload error:", err);
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});
