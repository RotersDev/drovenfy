import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { Menu, Product, Category, DeliveryTier } from "@/types";
import { api } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { fetchViaCep, formatCepMask, geocodeBrazil, digitsOnly, composeMenuAddressLines } from "@/lib/addressBr";
import ProductCard from "@/components/ProductCard";
import { ShoppingCart, MessageSquare, Star, Store, Search, X, ArrowLeft, Plus, Minus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Interpreta texto único de endereço (trechos separados por —): rua 1º, cidade com UF se houver, CEP. */
function parsePickupFromString(address: string): { street: string; city: string; cep?: string } {
  const parts = address
    .trim()
    .split(/\s*[—–]\s*/u)
    .map(s => s.trim())
    .filter(Boolean);
  const cepPart = parts.find(p => /^CEP\s/i.test(p));
  const withoutCep = parts.filter(p => !/^CEP\s/i.test(p));
  const streetLine = withoutCep[0] || "";

  const cityWithUf = withoutCep.find((p, i) => i > 0 && /-\s*[A-Z]{2}$/i.test(p.trim()));
  let city = cityWithUf && cityWithUf !== streetLine ? cityWithUf : "";

  if (!city && withoutCep.length >= 2) {
    city = withoutCep[withoutCep.length - 1];
    if (city === streetLine) city = withoutCep[withoutCep.length - 2] || "";
  }

  return {
    street: streetLine || "Endereço",
    city: city.replace(/\s*-\s*/, " — "),
    cep: cepPart,
  };
}

/**
 * Endereço de retirada: rua + número à esquerda, cidade à direita; CEP abaixo.
 */
function pickupAddressForDisplay(menu: Menu): { street: string; city: string; cep?: string } {
  const cepField =
    menu.addressCep && digitsOnly(menu.addressCep).length === 8
      ? `CEP ${formatCepMask(menu.addressCep)}`
      : undefined;

  const streetFields = [menu.addressStreet?.trim(), menu.addressNumber?.trim()].filter(Boolean).join(", ");
  const cityFields =
    menu.addressCity?.trim() && menu.addressState?.trim()
      ? `${menu.addressCity.trim()} — ${menu.addressState.trim()}`
      : menu.addressCity?.trim() || "";

  if (streetFields && cityFields) {
    return { street: streetFields, city: cityFields, cep: cepField };
  }

  if (menu.address?.trim()) {
    const r = parsePickupFromString(menu.address);
    return { ...r, cep: cepField || r.cep };
  }

  if (streetFields) {
    return { street: streetFields, city: cityFields, cep: cepField };
  }

  const composed = composeMenuAddressLines({
    cep: menu.addressCep,
    street: menu.addressStreet,
    number: menu.addressNumber,
    complement: menu.addressComplement,
    neighborhood: menu.addressNeighborhood,
    city: menu.addressCity,
    state: menu.addressState,
  });
  if (composed) {
    const r = parsePickupFromString(composed);
    return { ...r, cep: cepField || r.cep };
  }

  return { street: "Confira o endereço no topo do cardápio", city: "", cep: cepField };
}

function pickupLocationLabel(menu: Menu): string {
  const { street, city, cep } = pickupAddressForDisplay(menu);
  return [street, city, cep].filter(Boolean).join(" — ");
}

function getDeliveryFeeByDistance(distance: number, tiers: DeliveryTier[]): { fee: number; tier: DeliveryTier } | null {
  const sorted = [...tiers].sort((a, b) => a.maxKm - b.maxKm);
  for (const tier of sorted) {
    if (distance <= tier.maxKm) return { fee: tier.fee, tier };
  }
  return null;
}

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  /** Observações deste item (ex.: sem milho). */
  notes: string;
}

export default function PublicMenu() {
  const { slug } = useParams();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [productNotes, setProductNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    name: "", phone: "", cep: "", street: "", neighborhood: "", number: "", city: "", uf: "",
    reference: "", locationType: "Cidade", housingType: "Casa", payment: "Pix", change: "",
  });

  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [cepLookupError, setCepLookupError] = useState("");
  const lastCepLookupOkRef = useRef<string>("");
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [distanceIsRoute, setDistanceIsRoute] = useState(false);
  const [distanceError, setDistanceError] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");

  const clearDeliveryDistance = () => {
    setDistanceKm(null);
    setDistanceIsRoute(false);
  };

  const hasTiers = !!(menu?.deliveryTiers && menu.deliveryTiers.length > 0 && menu.latitude && menu.longitude);

  const tierResult = useMemo(() => {
    if (!hasTiers || distanceKm === null || !menu?.deliveryTiers) return null;
    return getDeliveryFeeByDistance(distanceKm, menu.deliveryTiers);
  }, [hasTiers, distanceKm, menu?.deliveryTiers]);

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0), [cart]);
  const deliveryFee = useMemo(() => {
    if (fulfillmentType === "pickup") return 0;
    if (hasTiers) return tierResult?.fee ?? 0;
    if (!menu) return 0;
    return orderForm.locationType === "Cidade" ? (menu.deliveryFeeCity || 0) : (menu.deliveryFeeSitio || 0);
  }, [fulfillmentType, menu, orderForm.locationType, hasTiers, tierResult]);
  const finalTotal = cartTotal + deliveryFee;

  /** Ao completar 8 dígitos, consulta ViaCEP automaticamente (debounce). */
  useEffect(() => {
    const d = digitsOnly(orderForm.cep);
    if (d.length !== 8) {
      lastCepLookupOkRef.current = "";
      return;
    }
    if (d === lastCepLookupOkRef.current) return;

    const timer = setTimeout(() => {
      const d2 = digitsOnly(orderForm.cep);
      if (d2.length !== 8 || d2 !== d) return;
      void (async () => {
        setCepLookupLoading(true);
        setCepLookupError("");
        clearDeliveryDistance();
        try {
          const r = await fetchViaCep(d2);
          if (!r) {
            setCepLookupError("CEP não encontrado");
            return;
          }
          lastCepLookupOkRef.current = d2;
          setOrderForm(prev => ({
            ...prev,
            cep: formatCepMask(r.cep),
            street: r.logradouro || prev.street,
            neighborhood: r.bairro || prev.neighborhood,
            city: r.localidade,
            uf: r.uf,
          }));
        } catch {
          setCepLookupError("Erro ao consultar CEP");
          lastCepLookupOkRef.current = "";
        } finally {
          setCepLookupLoading(false);
        }
      })();
    }, 350);

    return () => clearTimeout(timer);
  }, [orderForm.cep]);

  const calculateDistance = async () => {
    if (!menu?.latitude || !menu?.longitude) return;
    if (!orderForm.street.trim() || !orderForm.number.trim() || !orderForm.city || !orderForm.uf) {
      setDistanceError("Preencha CEP, rua, número e confira cidade");
      return;
    }
    setCalculatingDistance(true);
    setDistanceError("");
    try {
      const coords = await geocodeBrazil(
        {
          street: orderForm.street,
          number: orderForm.number,
          neighborhood: orderForm.neighborhood,
          city: orderForm.city,
          uf: orderForm.uf,
          cep: orderForm.cep,
        },
        {
          rejectNear: { lat: menu.latitude, lon: menu.longitude },
          minSeparationMeters: 150,
        }
      );
      if (coords) {
        const straightKm = haversineKm(menu.latitude, menu.longitude, coords.lat, coords.lon);
        const straightRounded = Math.round(straightKm * 10) / 10;

        let routeKm: number | null = null;
        try {
          const { km } = await api.geo.routeDistance(menu.latitude, menu.longitude, coords.lat, coords.lon);
          routeKm = km;
        } catch {
          routeKm = null;
        }

        let km = straightRounded;
        let byRoute = false;
        if (routeKm !== null && Number.isFinite(routeKm)) {
          if (routeKm > 0) {
            km = Math.round(routeKm * 10) / 10;
            byRoute = true;
          } else if (straightRounded > 0.2) {
            km = straightRounded;
          }
        }
        setDistanceKm(km);
        setDistanceIsRoute(byRoute);
      } else {
        setDistanceError("Não encontramos o ponto no mapa. Verifique rua e cidade ou tente sem abreviações.");
      }
    } catch {
      setDistanceError("Erro ao buscar endereço");
    } finally {
      setCalculatingDistance(false);
    }
  };

  useEffect(() => { fetchMenu(); }, [slug]);
  const fetchMenu = async () => { try { const data = await api.menus.getPublic(slug!); setMenu(data); } catch { setError(true); } finally { setLoading(false); } };

  useEffect(() => {
    if (menu && !menu.acceptsPickup) setFulfillmentType("delivery");
  }, [menu?.acceptsPickup]);

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setProductNotes("");
    }
  }, [selectedProduct?.id]);

  const addToCart = (product: Product, qty: number, notes: string) => {
    const n = notes.trim();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.notes.trim() === n);
      if (existing) {
        return prev.map(item =>
          item.id === existing.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { id: crypto.randomUUID(), product, quantity: qty, notes: n }];
    });
    setSelectedProduct(null);
    setProductNotes("");
  };
  const removeFromCart = (lineId: string) => setCart(prev => prev.filter(item => item.id !== lineId));
  const updateCartQuantity = (lineId: string, delta: number) =>
    setCart(prev =>
      prev.map(item =>
        item.id === lineId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  const updateCartLineNotes = (lineId: string, notes: string) =>
    setCart(prev => prev.map(item => (item.id === lineId ? { ...item, notes } : item)));

  const handleOrder = () => {
    if (!menu || cart.length === 0) return;
    const itemsList = cart
      .map(item => {
        const base = `• ${item.quantity}x ${item.product.name} (${formatCurrency(item.product.price * item.quantity)})`;
        const o = item.notes.trim();
        return o ? `${base}\n   Obs.: ${o}` : base;
      })
      .join("\n");
    const isDelivery = fulfillmentType === "delivery";
    const distanceInfo =
      isDelivery && hasTiers && distanceKm !== null
        ? `\n📏 Distância: ${distanceKm} km${distanceIsRoute ? " (rota)" : " (linha reta)"}`
        : "";
    const deliveryLabel = hasTiers && distanceKm !== null ? `${distanceKm}km` : orderForm.locationType;
    const cepLine = orderForm.cep ? `\nCEP: ${orderForm.cep}` : "";
    const cidadeLine = orderForm.city && orderForm.uf ? `\nCidade: ${orderForm.city} - ${orderForm.uf}` : "";
    const taxaLine = !isDelivery
      ? `*Taxa de entrega:* Retirada (sem taxa)`
      : `*Taxa de Entrega (${deliveryLabel}):* ${formatCurrency(deliveryFee)}`;
    const receberLine =
      fulfillmentType === "pickup"
        ? `*Como receber:* Buscar o pedido no estabelecimento`
        : `*Como receber:* Entrega no endereço abaixo`;
    const localEstabelecimento =
      !isDelivery ? `\n\n📍 *Local:*\n${pickupLocationLabel(menu)}` : "";
    const enderecoEntrega = isDelivery
      ? `\n\n📍 *Endereço de entrega:*\nRua: ${orderForm.street || "(não informado)"}\nBairro: ${orderForm.neighborhood || "(não informado)"}\nNúmero: ${orderForm.number || "(não informado)"}${cepLine}${cidadeLine}\nReferência: ${orderForm.reference || "(não informado)"}\nTipo: ${orderForm.housingType}${distanceInfo}`
      : "";
    const msg = `Olá! Gostaria de fazer um pedido:\n\n*Itens:*\n${itemsList}\n\n*Subtotal:* ${formatCurrency(cartTotal)}\n${taxaLine}\n*Total:* ${formatCurrency(finalTotal)}\n\n${receberLine}\n\n👤 Nome: ${orderForm.name || "(não informado)"}\n📱 WhatsApp: ${orderForm.phone || "(não informado)"}${localEstabelecimento}${enderecoEntrega}\n\n💳 Pagamento: ${orderForm.payment}\n💰 Troco: ${orderForm.change ? `Sim, para R$ ${orderForm.change}` : "Não"}\n\n⚠️ Confira tudo antes de finalizar!`;
    window.open(`https://wa.me/55${menu.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error || !menu) return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8 text-center">
      <Store size={64} className="text-neutral-300 mb-4" />
      <h1 className="text-2xl font-bold text-neutral-800">Cardápio não encontrado</h1>
      <p className="text-neutral-500 mt-2">O link pode estar incorreto ou o cardápio foi removido.</p>
      <a href="/" className="mt-6 text-orange-500 font-bold hover:text-orange-600">Voltar para o início</a>
    </div>
  );

  const filteredCategories = menu.categories.map(cat => ({ ...cat, products: cat.products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())) })).filter(cat => cat.products.length > 0);

  const inputClass = "w-full bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200 outline-none text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500/50";
  const inputCart = "w-full bg-white px-2.5 py-1.5 rounded-md border border-neutral-200 outline-none text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-orange-500";
  /** `<select>` nativo com aparência custom (laranja no foco; chevron em SVG, não estilo do SO). */
  const selectCart =
    "w-full cursor-pointer appearance-none rounded-md border border-neutral-200 bg-white bg-[length:14px] bg-[right_0.5rem_center] bg-no-repeat px-2.5 py-2 pr-9 text-xs text-neutral-800 outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23737373'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]";

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 font-sans selection:bg-orange-100">
      {menu.banner && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="w-full aspect-[1500/1024] max-h-[300px] overflow-hidden rounded-2xl border border-neutral-100"><img src={menu.banner} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" /></div>
        </div>
      )}

      <header className="bg-white sticky top-0 z-30 border-b border-neutral-200">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedCategory ? (
              <button onClick={() => setSelectedCategory(null)} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-700 transition-colors"><ArrowLeft size={20} /></button>
            ) : menu.logo ? (
              <img src={menu.logo} alt={menu.name} className="w-10 h-10 rounded-xl object-cover border border-neutral-100" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 font-bold">{menu.name.charAt(0)}</div>
            )}
            <h1 className="font-bold text-lg text-neutral-900 truncate max-w-[180px]">{selectedCategory ? selectedCategory.name : menu.name}</h1>
          </div>
          <div className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> ABERTO
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input type="text" placeholder="Buscar no cardápio..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-orange-500/50 transition-all" />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-8">
        <AnimatePresence mode="wait">
          {search ? (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {filteredCategories.map(cat => (
                <section key={cat.id}>
                  <h2 className="text-lg font-bold text-neutral-900 mb-4">{cat.name}</h2>
                  <div className="space-y-3">{cat.products.map(prod => <ProductCard key={prod.id} product={prod} onClick={() => { setSelectedProduct(prod); setQuantity(1); }} />)}</div>
                </section>
              ))}
              {filteredCategories.length === 0 && <div className="py-20 text-center"><Search size={48} className="text-neutral-200 mx-auto mb-4" /><p className="text-neutral-500">Nenhum produto encontrado para "{search}"</p></div>}
            </motion.div>
          ) : selectedCategory ? (
            <motion.div key="cat-prods" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {selectedCategory.products.map(prod => <ProductCard key={prod.id} product={prod} onClick={() => { setSelectedProduct(prod); setQuantity(1); }} />)}
              {selectedCategory.products.length === 0 && <p className="text-center py-20 text-neutral-400 italic">Nenhum produto nesta categoria.</p>}
            </motion.div>
          ) : (
            <motion.div key="cats-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {menu.categories.some(c => c.products.some(p => p.highlight)) && (
                <section>
                  <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Star size={14} className="text-orange-500 fill-orange-500" />Destaques da Casa</h2>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {menu.categories.flatMap(c => c.products).filter(p => p.highlight).map(prod => (
                      <motion.div key={prod.id} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedProduct(prod); setQuantity(1); }} className="min-w-[240px] bg-white rounded-2xl p-4 border border-neutral-200 cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all">
                        <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-neutral-50">
                          {prod.image ? <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neutral-200"><Store size={32} /></div>}
                        </div>
                        <h3 className="font-bold text-neutral-900 truncate">{prod.name}</h3>
                        <p className="text-orange-500 font-bold mt-1">{formatCurrency(prod.price)}</p>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Categorias</h2>
                <div className="grid grid-cols-2 gap-4">
                  {menu.categories.map(cat => (
                    <motion.div key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => setSelectedCategory(cat)} className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group border border-neutral-200">
                      {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="w-full h-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl uppercase p-4 text-center">{cat.name}</div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4"><h3 className="text-white font-bold text-sm uppercase tracking-wider">{cat.name}</h3></div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProduct(null)} className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl overflow-hidden shadow-xl border border-neutral-200/90"
            >
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
              <div className="p-4 sm:p-5 max-h-[min(78vh,32rem)] overflow-y-auto">
                <div className="flex gap-3 mb-4 pr-8">
                  <div className="w-14 h-14 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden border border-neutral-200">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <Store size={22} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-bold text-neutral-900 leading-snug">{selectedProduct.name}</h2>
                      {selectedProduct.highlight && (
                        <span className="shrink-0 bg-orange-100 text-orange-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                          Destaque
                        </span>
                      )}
                    </div>
                    <p className="text-orange-600 font-bold text-sm mt-1">{formatCurrency(selectedProduct.price)}</p>
                  </div>
                </div>
                <p className="text-neutral-600 text-xs leading-relaxed mb-3">{selectedProduct.description}</p>
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold text-neutral-500 mb-1">Observações deste item</label>
                  <textarea
                    value={productNotes}
                    onChange={e => setProductNotes(e.target.value)}
                    rows={2}
                    className={`${inputCart} resize-none py-2 min-h-[2.5rem]`}
                    placeholder="Ex.: sem milho, ponto da carne…"
                  />
                </div>
                <div className="flex items-center justify-between bg-neutral-50 px-3 py-2.5 rounded-lg mb-4 border border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-700">Quantidade</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:border-orange-300 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-bold text-sm w-6 text-center text-neutral-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-9 h-9 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:border-orange-300 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addToCart(selectedProduct, quantity, productNotes)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingCart size={18} /> Adicionar · {formatCurrency(selectedProduct.price * quantity)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart FAB */}
      {cart.length > 0 && (
        <motion.button
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-orange-500 text-white pl-3 pr-3.5 py-2.5 rounded-full shadow-lg shadow-orange-500/25 flex items-center gap-2 hover:bg-orange-600 transition-colors border border-orange-400/30"
        >
          <div className="relative">
            <ShoppingCart size={20} strokeWidth={2.25} />
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.125rem] h-[1.125rem] px-0.5 bg-white text-orange-600 text-[9px] font-bold rounded-full flex items-center justify-center border border-orange-100">
              {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          </div>
          <span className="text-sm font-bold tabular-nums">{formatCurrency(cartTotal)}</span>
        </motion.button>
      )}

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl overflow-hidden shadow-xl border border-neutral-200/90 flex flex-col max-h-[min(85vh,40rem)] sm:max-h-[min(88vh,42rem)]"
            >
              <header className="px-4 py-3 border-b border-neutral-200 bg-white flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <ShoppingCart size={16} strokeWidth={2.25} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-neutral-900 tracking-tight leading-tight">Carrinho</h2>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {cart.length === 0
                          ? "Nenhum item"
                          : `${cart.reduce((n, i) => n + i.quantity, 0)} ${cart.reduce((n, i) => n + i.quantity, 0) === 1 ? "item" : "itens"} · ${formatCurrency(cartTotal)}`}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
                  aria-label="Fechar carrinho"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto overscroll-contain">
                {cart.length === 0 ? (
                  <div className="px-4 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
                      <ShoppingCart size={28} strokeWidth={1.75} />
                    </div>
                    <p className="text-sm text-neutral-600">Seu carrinho está vazio</p>
                    <button
                      type="button"
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-xs font-bold text-orange-600 hover:text-orange-700"
                    >
                      Voltar ao cardápio
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 space-y-5">
                    <section>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">Itens</p>
                      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-100 bg-neutral-50/50 overflow-hidden">
                        {cart.map(item => (
                          <li key={item.id} className="px-2.5 py-2 bg-white border-b border-neutral-100 last:border-0">
                            <div className="flex items-start gap-2.5">
                              <div className="h-11 w-11 rounded-md overflow-hidden shrink-0 border border-neutral-100 bg-neutral-50">
                                {item.product.image ? (
                                  <img src={item.product.image} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-neutral-200">
                                    <Store size={18} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-neutral-900 leading-tight">{item.product.name}</p>
                                <p className="text-[11px] text-orange-600 font-bold mt-0.5">{formatCurrency(item.product.price)}</p>
                                <label className="sr-only">Observações</label>
                                <textarea
                                  value={item.notes}
                                  onChange={e => updateCartLineNotes(item.id, e.target.value)}
                                  rows={2}
                                  className="mt-1.5 w-full text-[11px] rounded border border-neutral-200 px-2 py-1 text-neutral-800 placeholder:text-neutral-400 focus:border-orange-400 outline-none resize-none min-h-[2.25rem]"
                                  placeholder="Obs.: sem milho, etc."
                                />
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="inline-flex items-center rounded-md border border-neutral-200 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(item.id, -1)}
                                    className="p-1.5 text-neutral-500 hover:text-orange-600 transition-colors"
                                    aria-label="Diminuir"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <span className="text-xs font-bold w-5 text-center text-neutral-800 tabular-nums">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(item.id, 1)}
                                    className="p-1.5 text-neutral-500 hover:text-orange-600 transition-colors"
                                    aria-label="Aumentar"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.id)}
                                  className="p-1.5 rounded-md text-neutral-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                  aria-label="Remover"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <div className="space-y-3 pt-1 border-t border-neutral-100">
                      {menu.acceptsPickup && (
                        <div className="rounded-lg border border-neutral-200 overflow-hidden bg-white">
                          <div className="px-3 py-2.5 bg-orange-500 text-white">
                            <p className="text-xs font-semibold">Escolha como receber o pedido</p>
                          </div>
                          <div className="divide-y divide-neutral-100">
                            {(
                              [
                                { value: "delivery" as const, label: "Cadastrar novo endereço" },
                                { value: "pickup" as const, label: "Buscar o pedido" },
                              ] as const
                            ).map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setFulfillmentType(opt.value);
                                  clearDeliveryDistance();
                                }}
                                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${
                                  fulfillmentType === opt.value ? "bg-orange-50" : "hover:bg-neutral-50"
                                }`}
                              >
                                <span className="text-xs font-medium text-neutral-800">{opt.label}</span>
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                    fulfillmentType === opt.value ? "border-orange-500 bg-orange-500" : "border-neutral-300 bg-white"
                                  }`}
                                  aria-hidden
                                >
                                  {fulfillmentType === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dados pessoais */}
                      <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                        <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50/90">
                          <h3 className="text-xs font-bold text-neutral-900">Dados pessoais</h3>
                          <p className="text-[10px] text-neutral-500 mt-0.5">Nome e WhatsApp para contato</p>
                        </div>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Nome completo</label>
                            <input type="text" value={orderForm.name} onChange={e => setOrderForm({ ...orderForm, name: e.target.value })} className={inputCart} placeholder="Seu nome" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">WhatsApp</label>
                            <input type="text" value={orderForm.phone} onChange={e => setOrderForm({ ...orderForm, phone: e.target.value })} className={inputCart} placeholder="(00) 00000-0000" />
                          </div>
                        </div>
                      </section>

                      {fulfillmentType === "pickup" && (
                        <section className="rounded-lg border border-neutral-200 overflow-hidden bg-white">
                          <div className="px-3 py-2.5 border-b border-neutral-100 bg-neutral-50/90">
                            <h3 className="text-xs font-bold text-neutral-900">Retirar o pedido</h3>
                            <p className="text-[10px] text-neutral-500 mt-0.5">Retire seu pedido neste endereço</p>
                          </div>
                          <div className="p-3">
                            <div className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3 space-y-2">
                              {(() => {
                                const { street, city, cep } = pickupAddressForDisplay(menu);
                                return (
                                  <>
                                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                      <p className="text-sm font-semibold text-neutral-900 leading-snug min-w-0 flex-1">{street}</p>
                                      {city ? (
                                        <p className="text-[12px] text-neutral-700 leading-snug shrink-0 text-right max-w-[min(100%,14rem)]">{city}</p>
                                      ) : null}
                                    </div>
                                    {cep ? (
                                      <p className="text-[11px] text-neutral-500 font-medium tabular-nums pt-0.5 border-t border-neutral-200/80 mt-1">
                                        {cep}
                                      </p>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </section>
                      )}

                      {fulfillmentType === "delivery" && (
                        <>
                      {/* Endereço de entrega */}
                      <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                        <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50/90">
                          <h3 className="text-xs font-bold text-neutral-900">Endereço de entrega</h3>
                          <p className="text-[10px] text-neutral-500 mt-0.5">CEP, rua e número para localizar você</p>
                        </div>
                        <div className="p-3 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">CEP</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={9}
                                  value={orderForm.cep}
                                  onChange={e => {
                                    setOrderForm({ ...orderForm, cep: formatCepMask(e.target.value) });
                                    setCepLookupError("");
                                    clearDeliveryDistance();
                                  }}
                                  className={`${inputCart} w-full pr-9`}
                                  placeholder="00000-000"
                                  autoComplete="postal-code"
                                />
                                {cepLookupLoading && (
                                  <div
                                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                                    aria-hidden
                                  >
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
                                  </div>
                                )}
                              </div>
                              {cepLookupError && <p className="text-[11px] text-red-500 mt-1">{cepLookupError}</p>}
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Rua</label>
                              <input
                                type="text"
                                value={orderForm.street}
                                onChange={e => {
                                  setOrderForm({ ...orderForm, street: e.target.value });
                                  clearDeliveryDistance();
                                }}
                                className={inputCart}
                                placeholder="Preenchido pelo CEP ou digite"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Número</label>
                              <input
                                type="text"
                                value={orderForm.number}
                                onChange={e => {
                                  setOrderForm({ ...orderForm, number: e.target.value });
                                  clearDeliveryDistance();
                                }}
                                className={inputCart}
                                placeholder="Ex: 123"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Bairro</label>
                              <input
                                type="text"
                                value={orderForm.neighborhood}
                                onChange={e => {
                                  setOrderForm({ ...orderForm, neighborhood: e.target.value });
                                  clearDeliveryDistance();
                                }}
                                className={inputCart}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Cidade e UF</label>
                              <div className={`${inputCart} bg-neutral-50 text-neutral-600`}>
                                {orderForm.city && orderForm.uf ? `${orderForm.city} — ${orderForm.uf}` : "Preenchido pelo CEP"}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Ponto de referência</label>
                              <input
                                type="text"
                                value={orderForm.reference}
                                onChange={e => setOrderForm({ ...orderForm, reference: e.target.value })}
                                className={inputCart}
                                placeholder="Ex: Próximo ao mercado"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-neutral-500 mb-1">Tipo de residência</label>
                            <div className="flex gap-1.5">
                              {(["Casa", "Apartamento"] as const).map(h => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setOrderForm({ ...orderForm, housingType: h })}
                                  className={`flex-1 py-1.5 rounded-md border text-[10px] font-bold transition-colors ${orderForm.housingType === h ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-neutral-200 text-neutral-600"}`}
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Taxa / local de entrega */}
                      {hasTiers ? (
                        <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                          <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50/90">
                            <h3 className="text-xs font-bold text-neutral-900">Taxa de entrega</h3>
                            <p className="text-[10px] text-neutral-500 mt-0.5">Calcule pela distância até o endereço acima</p>
                          </div>
                          <div className="p-3 space-y-2">
                            <button
                              type="button"
                              onClick={calculateDistance}
                              disabled={calculatingDistance || digitsOnly(orderForm.cep).length !== 8 || !orderForm.street.trim() || !orderForm.number.trim() || !orderForm.city}
                              className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
                            >
                              {calculatingDistance ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : null}
                              {calculatingDistance ? "Calculando…" : "Calcular distância e taxa"}
                            </button>
                            {distanceKm !== null && (
                              <div className={`rounded-md p-2.5 ${tierResult ? "bg-emerald-50 border border-emerald-200/80" : "bg-red-50 border border-red-200/80"}`}>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-[11px] font-semibold text-neutral-800">
                                    {distanceKm} km
                                    <span className="block text-[10px] font-normal text-neutral-500 mt-0.5">
                                      {distanceIsRoute ? "Por rota" : "Linha reta"}
                                    </span>
                                  </span>
                                  {tierResult ? (
                                    <span className="text-xs font-bold text-emerald-700">{formatCurrency(tierResult.fee)}</span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-red-600">Fora da área</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {distanceError && <p className="text-[11px] text-red-500 font-medium">{distanceError}</p>}
                          </div>
                        </section>
                      ) : (
                        <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                          <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50/90">
                            <h3 className="text-xs font-bold text-neutral-900">Região de entrega</h3>
                            <p className="text-[10px] text-neutral-500 mt-0.5">Escolha cidade ou sítio para o valor do frete</p>
                          </div>
                          <div className="p-3">
                            <div className="flex gap-1.5">
                              {(["Cidade", "Sitio"] as const).map(loc => (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => setOrderForm({ ...orderForm, locationType: loc })}
                                  className={`flex-1 py-1.5 rounded-md border text-[10px] font-bold transition-colors ${orderForm.locationType === loc ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-neutral-200 text-neutral-600"}`}
                                >
                                  {loc === "Cidade" ? `Cidade (+${formatCurrency(menu.deliveryFeeCity || 0)})` : `Sítio (+${formatCurrency(menu.deliveryFeeSitio || 0)})`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}
                        </>
                      )}

                      {/* Pagamento */}
                      <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                        <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50/90">
                          <h3 className="text-xs font-bold text-neutral-900">Pagamento</h3>
                          <p className="text-[10px] text-neutral-500 mt-0.5">Forma de pagamento e troco</p>
                        </div>
                        <div className="p-3 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Forma de pagamento</label>
                              <select
                                value={orderForm.payment}
                                onChange={e => setOrderForm({ ...orderForm, payment: e.target.value })}
                                className={selectCart}
                              >
                                <option value="Pix">Pix</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão">Cartão</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-0.5">Troco (se dinheiro)</label>
                              <input
                                type="text"
                                value={orderForm.change}
                                onChange={e => setOrderForm({ ...orderForm, change: e.target.value })}
                                disabled={orderForm.payment !== "Dinheiro"}
                                className={`${inputCart} disabled:opacity-40`}
                                placeholder="Ex: 50"
                              />
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <footer className="shrink-0 border-t border-neutral-200 bg-neutral-50/90 px-4 py-3 space-y-2">
                  <div className="space-y-1 text-xs text-neutral-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="tabular-nums font-medium text-neutral-800">{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{fulfillmentType === "pickup" ? "Retirada (sem taxa)" : "Entrega"}</span>
                      <span className="tabular-nums font-medium text-neutral-800">{formatCurrency(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1.5 mt-1 border-t border-neutral-200/90 text-sm font-bold text-neutral-900">
                      <span>Total</span>
                      <span className="tabular-nums text-base">{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOrder}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageSquare size={16} strokeWidth={2.25} />
                    Pedir no WhatsApp
                  </button>
                </footer>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-xl mx-auto py-12 text-center">
        <div className="flex items-center justify-center gap-2 text-neutral-300 font-bold text-sm">
          <span>Criado com</span>
          <img src="https://pub-599d1182afd34ef9bba864fbaca57854.r2.dev/logotipodrovenfy.png" alt="Drovenfy" className="h-4 w-auto" />
        </div>
      </footer>
    </div>
  );
}
