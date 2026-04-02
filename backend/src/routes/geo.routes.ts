import { Router } from "express";

export const geoRoutes = Router();

/** Distância aproximada por ruas (OSRM demo). Lat/lon em WGS84. */
geoRoutes.post("/route-distance", async (req, res) => {
  try {
    const fromLat = Number(req.body.fromLat);
    const fromLon = Number(req.body.fromLon);
    const toLat = Number(req.body.toLat);
    const toLon = Number(req.body.toLon);

    if (![fromLat, fromLon, toLat, toLon].every(n => Number.isFinite(n))) {
      return res.status(400).json({ error: "Coordenadas inválidas" });
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
    const r = await fetch(url, { headers: { "User-Agent": "Drovenfy/1.0" } });
    const data = (await r.json()) as { code?: string; routes?: { distance: number }[] };

    if (data.code !== "Ok" || !data.routes?.[0]?.distance) {
      return res.json({ km: null });
    }

    const km = data.routes[0].distance / 1000;
    res.json({ km: Math.round(km * 100) / 100 });
  } catch (err) {
    console.error("route-distance error:", err);
    res.json({ km: null });
  }
});
