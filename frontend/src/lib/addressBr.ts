export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function formatCepMask(value: string): string {
  const d = digitsOnly(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Busca endereço pelo CEP (Brasil). Retorna null se inválido ou não encontrado. */
export async function fetchViaCep(rawCep: string): Promise<ViaCepResult | null> {
  const cep = digitsOnly(rawCep);
  if (cep.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const data = await res.json();
  if (!data || data.erro) return null;
  return data as ViaCepResult;
}

export interface AddressParts {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
}

/** Texto para geocodificação legada / debug. */
export function buildGeocodeQuery(p: AddressParts): string {
  const streetLine = [p.street?.trim(), p.number?.trim()].filter(Boolean).join(", ");
  return [streetLine, p.neighborhood?.trim(), p.city?.trim(), p.uf?.trim(), "Brasil"].filter(Boolean).join(", ");
}

export interface GeocodeBrazilOptions {
  /**
   * Coordenadas de referência (ex.: loja). Resultados a menos de `minSeparationMeters`
   * são descartados para não cair no mesmo ponto/cerntroide (ex.: "0 km" falso).
   */
  rejectNear?: { lat: number; lon: number };
  /** Padrão 150 m — mesma quadra pode ser maior; ruas diferentes na mesma região costumam ser >150 m no mapa. */
  minSeparationMeters?: number;
}

const NOMINATIM_HEADERS = {
  "Accept-Language": "pt-BR,pt;q=0.9",
  "User-Agent": "Drovenfy/1.0 (cardapio digital; https://drovenfy.com.br)",
};

const UF_NOME: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map(w => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type NomRow = {
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  importance?: number | string;
};

function scoreNominatim(r: NomRow): number {
  let s = typeof r.importance === "number" ? r.importance : parseFloat(String(r.importance || 0));
  const cls = (r.class || "").toLowerCase();
  const typ = (r.type || "").toLowerCase();
  if (cls === "building" || typ === "house" || typ === "residential") s += 60;
  if (cls === "place" && typ === "house") s += 80;
  if (cls === "highway") s -= 25;
  if (typ === "administrative") s -= 40;
  if (typ === "postcode") s -= 30;
  return s;
}

function pickNominatim(
  rows: NomRow[],
  rejectNear?: { lat: number; lon: number },
  minM = 150
): { lat: number; lon: number } | null {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => scoreNominatim(b) - scoreNominatim(a));

  if (rejectNear) {
    for (const r of sorted) {
      const lat = parseFloat(r.lat);
      const lon = parseFloat(r.lon);
      if (haversineMeters(rejectNear.lat, rejectNear.lon, lat, lon) >= minM) {
        return { lat, lon };
      }
    }
    return null;
  }

  const r = sorted[0];
  return { lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
}

function pickPhotonFeatures(
  features: { geometry: { coordinates: [number, number] }; properties?: { osm_value?: string } }[],
  rejectNear?: { lat: number; lon: number },
  minM = 150
): { lat: number; lon: number } | null {
  if (!features?.length) return null;
  const scored = features.map((f, i) => {
    const [lon, lat] = f.geometry.coordinates;
    let bonus = 0;
    const v = (f.properties?.osm_value || "").toLowerCase();
    if (v === "house" || v === "residential") bonus = 40;
    return { lat, lon, bonus, i };
  }).sort((a, b) => b.bonus - a.bonus);

  if (rejectNear) {
    for (const { lat, lon } of scored) {
      if (haversineMeters(rejectNear.lat, rejectNear.lon, lat, lon) >= minM) return { lat, lon };
    }
    return null;
  }
  return { lat: scored[0].lat, lon: scored[0].lon };
}

/** Vários formatos de busca (Nominatim + Photon) para endereços brasileiros. */
export async function geocodeBrazil(
  p: AddressParts & { cep?: string },
  options?: GeocodeBrazilOptions
): Promise<{ lat: number; lon: number } | null> {
  const street = (p.street || "").trim();
  const number = (p.number || "").trim();
  const neighborhood = (p.neighborhood || "").trim();
  const city = (p.city || "").trim();
  const uf = (p.uf || "").trim().toUpperCase();
  const cepDigits = p.cep ? digitsOnly(p.cep) : "";
  const stateName = UF_NOME[uf] || uf;
  const streetPretty = titleCaseWords(street);
  const streetLine = number ? `${number}, ${streetPretty}` : streetPretty;
  const streetLineLoose = number ? `${number} ${street.trim()}` : street.trim();

  const rejectNear = options?.rejectNear;
  const minM = options?.minSeparationMeters ?? 150;

  const nominatimSearch = async (params: Record<string, string>): Promise<{ lat: number; lon: number } | null> => {
    const usp = new URLSearchParams({
      ...params,
      format: "json",
      limit: "12",
      countrycodes: "br",
      addressdetails: "1",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${usp}`, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as NomRow[];
    return pickNominatim(data, rejectNear, minM);
  };

  const tryPhoton = async (q: string): Promise<{ lat: number; lon: number } | null> => {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=pt&limit=8`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { geometry: { coordinates: [number, number] }; properties?: { osm_value?: string } }[];
    };
    return pickPhotonFeatures(data.features || [], rejectNear, minM);
  };

  const attempts: (() => Promise<{ lat: number; lon: number } | null>)[] = [
    () => {
      if (!street || !city || !uf) return Promise.resolve(null);
      const q: Record<string, string> = {
        street: streetPretty,
        housenumber: number || "S/N",
        city,
        state: stateName,
        country: "Brazil",
      };
      if (cepDigits.length === 8) q.postalcode = cepDigits;
      return nominatimSearch(q);
    },
    () => {
      if (!street || !city || !uf || !neighborhood) return Promise.resolve(null);
      const q: Record<string, string> = {
        street: streetPretty,
        housenumber: number || "S/N",
        city,
        state: stateName,
        country: "Brazil",
        suburb: titleCaseWords(neighborhood),
      };
      if (cepDigits.length === 8) q.postalcode = cepDigits;
      return nominatimSearch(q);
    },
    () => {
      if (!street || !city || !uf) return Promise.resolve(null);
      const q: Record<string, string> = {
        street: `${number ? `${number} ` : ""}${streetPretty}`,
        city,
        state: stateName,
        country: "Brazil",
      };
      if (cepDigits.length === 8) q.postalcode = cepDigits;
      return nominatimSearch(q);
    },
    () => {
      if (!street || !city || !uf) return Promise.resolve(null);
      const q: Record<string, string> = {
        street: streetLineLoose,
        city,
        state: uf,
        country: "Brazil",
      };
      if (cepDigits.length === 8) q.postalcode = cepDigits;
      return nominatimSearch(q);
    },
    () => {
      if (!city || !uf) return Promise.resolve(null);
      const parts = [streetLine, neighborhood, city, stateName, "Brasil"].filter(Boolean);
      return nominatimSearch({ q: parts.join(", ") });
    },
    () => {
      if (!city || !uf) return Promise.resolve(null);
      const parts = [streetLineLoose, neighborhood, `${city} ${uf}`, "Brasil"].filter(Boolean);
      return nominatimSearch({ q: parts.join(", ") });
    },
    () => {
      if (!city || !uf) return Promise.resolve(null);
      return nominatimSearch({ q: [neighborhood, city, stateName, "Brasil"].filter(Boolean).join(", ") });
    },
    () => {
      if (cepDigits.length === 8 && city) {
        return nominatimSearch({ postalcode: cepDigits, city, state: stateName, country: "Brazil" });
      }
      return Promise.resolve(null);
    },
    () => tryPhoton([streetLine, neighborhood, city, uf, "Brasil"].filter(Boolean).join(", ")),
    () => tryPhoton([street, neighborhood, city, uf].filter(Boolean).join(", ")),
  ];

  for (const run of attempts) {
    try {
      const coords = await run();
      if (
        coords &&
        Number.isFinite(coords.lat) &&
        Number.isFinite(coords.lon) &&
        coords.lat !== 0 &&
        coords.lon !== 0
      ) {
        return coords;
      }
    } catch {
      /* tenta próxima */
    }
    await new Promise(r => setTimeout(r, 350));
  }

  if (!rejectNear) {
    const c = await tryPhoton(`${city}, ${stateName}, Brasil`);
    if (c) return c;
  } else {
    /* Se tudo foi descartado por estar “em cima” da loja, tenta de novo sem esse filtro */
    return geocodeBrazil(p, { minSeparationMeters: options?.minSeparationMeters });
  }

  return null;
}

/** Endereço legível para exibir / salvar em `menu.address`. */
export function composeMenuAddressLines(p: {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}): string {
  const lines: string[] = [];
  if (p.street || p.number) {
    lines.push([p.street?.trim(), p.number?.trim()].filter(Boolean).join(", "));
  }
  if (p.complement?.trim()) lines.push(p.complement.trim());
  if (p.neighborhood?.trim()) lines.push(p.neighborhood.trim());
  if (p.city?.trim() && p.state?.trim()) {
    lines.push(`${p.city.trim()} - ${p.state.trim()}`);
  }
  if (p.cep && digitsOnly(p.cep).length === 8) {
    lines.push(`CEP ${formatCepMask(p.cep)}`);
  }
  return lines.join(" — ") || "";
}
