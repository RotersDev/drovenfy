import React, { useState, useEffect } from "react";
import { User, Menu, Category, Product, DeliveryTier } from "@/types";
import { api } from "@/services/api";
import {
  ArrowLeft, ArrowRight, FloppyDisk, Plus, Trash, ImageSquare, Check,
  Storefront, ListBullets, Package, Tag,
  WhatsappLogo, CurrencyDollar, CreditCard, Money,
  CheckCircle, XCircle, Bicycle, Warning, Sparkle,
  MapPin, NavigationArrow,
} from "@phosphor-icons/react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import AppHeader from "@/components/AppHeader";
import CustomSelect from "@/components/CustomSelect";
import { fetchViaCep, formatCepMask, geocodeBrazil, composeMenuAddressLines, digitsOnly } from "@/lib/addressBr";

interface MenuCreatorProps {
  user: User;
}

const BUSINESS_TYPES = [
  "Lanchonete", "Hamburgueria", "Pizzaria", "Açaíteria", "Restaurante",
  "Sorveteria", "Cafeteria", "Padaria", "Doceria", "Pastelaria",
  "Marmitaria", "Espetaria", "Sushi / Japonês", "Churrascaria",
  "Bar / Pub", "Petiscaria", "Food Truck", "Fit / Saudável",
  "Bebidas", "Mercearia / Mercado", "Outro",
];

const DAYS_OF_WEEK = [
  { key: "monday", label: "Seg" },
  { key: "tuesday", label: "Ter" },
  { key: "wednesday", label: "Qua" },
  { key: "thursday", label: "Qui" },
  { key: "friday", label: "Sex" },
  { key: "saturday", label: "Sáb" },
  { key: "sunday", label: "Dom" },
];

const DEFAULT_BUSINESS_HOURS: Record<string, { open: string; close: string; enabled: boolean }> = {
  monday:    { open: "08:00", close: "18:00", enabled: true },
  tuesday:   { open: "08:00", close: "18:00", enabled: true },
  wednesday: { open: "08:00", close: "18:00", enabled: true },
  thursday:  { open: "08:00", close: "18:00", enabled: true },
  friday:    { open: "08:00", close: "18:00", enabled: true },
  saturday:  { open: "08:00", close: "14:00", enabled: true },
  sunday:    { open: "08:00", close: "14:00", enabled: false },
};

const PAYMENT_OPTIONS = [
  { id: "pix", label: "Pix", icon: CurrencyDollar },
  { id: "dinheiro", label: "Dinheiro", icon: Money },
  { id: "credito", label: "Crédito", icon: CreditCard },
  { id: "debito", label: "Débito", icon: CreditCard },
];

const STEPS = [
  { num: 1, label: "Negócio", icon: Storefront },
  { num: 2, label: "Categorias", icon: ListBullets },
  { num: 3, label: "Produtos", icon: Package },
  { num: 4, label: "Entrega", icon: Bicycle },
  { num: 5, label: "Publicar", icon: Sparkle },
];

export default function MenuCreator({ user }: MenuCreatorProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [menu, setMenu] = useState<Partial<Menu>>({
    name: "",
    slug: "",
    primaryColor: "#ea580c",
    categories: [],
    whatsappNumber: "",
    description: "",
    businessType: "",
    address: "",
    addressCep: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    instagram: "",
    phone: "",
    estimatedDelivery: "30-50 min",
    minimumOrder: 0,
    paymentMethods: ["pix", "dinheiro"],
    acceptsPickup: true,
    isActive: true,
    businessHours: { ...DEFAULT_BUSINESS_HOURS },
    deliveryFeeCity: 0,
    deliveryFeeSitio: 0,
    deliveryTiers: [
      { maxKm: 3, fee: 5 },
      { maxKm: 6, fee: 8 },
      { maxKm: 10, fee: 12 },
    ],
    whatsappMessage: `Olá! Gostaria de fazer um pedido: {produto}

👤 Nome completo: (nome e sobrenome)
📱 Telefone (WhatsApp): (numero do cliente que esta pedindo)

📍 Endereço completo:
(Rua, número, bairro, complemento e ponto de referência)

💳 Forma de pagamento:
(Pix, dinheiro ou cartão)

💰 Precisa de troco?
Se sim, informe o valor:

📝 Observações do pedido:
(Ex: sem cebola, ponto da carne, retirar algum ingrediente, etc.)

⚠️ Importante: Confira tudo antes de finalizar para evitar atrasos na entrega!`,
  });

  useEffect(() => { if (id) fetchMenu(); }, [id]);

  const fetchMenu = async () => {
    try {
      const data = await api.menus.get(id!);
      setMenu({
        ...data,
        paymentMethods: data.paymentMethods || ["pix", "dinheiro"],
        acceptsPickup: data.acceptsPickup ?? true,
        isActive: data.isActive ?? true,
        businessHours: data.businessHours || { ...DEFAULT_BUSINESS_HOURS },
        addressCep: data.addressCep ? formatCepMask(data.addressCep) : data.addressCep,
      });
    } catch (err) { console.error("Erro ao carregar cardápio", err); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const composed = composeMenuAddressLines({
        cep: menu.addressCep,
        street: menu.addressStreet,
        number: menu.addressNumber,
        complement: menu.addressComplement,
        neighborhood: menu.addressNeighborhood,
        city: menu.addressCity,
        state: menu.addressState,
      });
      const payload = {
        ...menu,
        addressCep: menu.addressCep ? digitsOnly(menu.addressCep) : undefined,
        address: composed || menu.address || "",
      };
      if (id) await api.menus.update(id, payload as Menu);
      else await api.menus.create(user.id, payload);
      navigate("/dashboard");
    } catch (err) { console.error("Erro ao salvar", err); }
    finally { setSaving(false); }
  };

  const addCategory = () => {
    const newCat = { id: uuidv4(), name: "", products: [] };
    setMenu(prev => ({ ...prev, categories: [...(prev.categories || []), newCat] }));
  };
  const removeCategory = (catId: string) => setMenu(prev => ({ ...prev, categories: prev.categories?.filter(c => c.id !== catId) }));
  const updateCategory = (catId: string, updates: Partial<Category>) => setMenu(prev => ({ ...prev, categories: prev.categories?.map(c => c.id === catId ? { ...c, ...updates } : c) }));
  const addProduct = (catId: string) => {
    const p: Product = { id: uuidv4(), name: "", description: "", price: 0 };
    setMenu(prev => ({ ...prev, categories: prev.categories?.map(c => c.id === catId ? { ...c, products: [...c.products, p] } : c) }));
  };
  const updateProduct = (catId: string, prodId: string, updates: Partial<Product>) => setMenu(prev => ({ ...prev, categories: prev.categories?.map(c => c.id === catId ? { ...c, products: c.products.map(p => p.id === prodId ? { ...p, ...updates } : p) } : c) }));
  const removeProduct = (catId: string, prodId: string) => setMenu(prev => ({ ...prev, categories: prev.categories?.map(c => c.id === catId ? { ...c, products: c.products.filter(p => p.id !== prodId) } : c) }));

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = (cb: (result: string) => void, folder = "menus") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const { url } = await api.upload.image(reader.result as string, folder);
        cb(url);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "ok" | "error">("idle");
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [cepLookupError, setCepLookupError] = useState("");

  const buscarCepEstabelecimento = async () => {
    const raw = menu.addressCep || "";
    if (digitsOnly(raw).length !== 8) {
      setCepLookupError("CEP deve ter 8 dígitos");
      return;
    }
    setCepLookupLoading(true);
    setCepLookupError("");
    setGeocodeStatus("idle");
    try {
      const r = await fetchViaCep(raw);
      if (!r) {
        setCepLookupError("CEP não encontrado");
        return;
      }
      setMenu(prev => ({
        ...prev,
        addressCep: formatCepMask(r.cep),
        addressStreet: r.logradouro || prev.addressStreet || "",
        addressNeighborhood: r.bairro || prev.addressNeighborhood || "",
        addressCity: r.localidade,
        addressState: r.uf,
      }));
    } catch {
      setCepLookupError("Erro ao consultar CEP");
    } finally {
      setCepLookupLoading(false);
    }
  };

  const geocodeAddress = async () => {
    if (!menu.addressStreet?.trim() || !menu.addressNumber?.trim() || !menu.addressCity || !menu.addressState) {
      setGeocodeStatus("error");
      return;
    }
    setGeocoding(true);
    setGeocodeStatus("idle");
    try {
      const coords = await geocodeBrazil({
        street: menu.addressStreet || "",
        number: menu.addressNumber || "",
        neighborhood: menu.addressNeighborhood || "",
        city: menu.addressCity || "",
        uf: menu.addressState || "",
        cep: menu.addressCep || "",
      });
      if (coords) {
        setMenu(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lon }));
        setGeocodeStatus("ok");
      } else {
        setGeocodeStatus("error");
      }
    } catch {
      setGeocodeStatus("error");
    } finally {
      setGeocoding(false);
      setTimeout(() => setGeocodeStatus("idle"), 4000);
    }
  };

  const addTier = () => {
    const tiers = menu.deliveryTiers || [];
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].maxKm : 0;
    setMenu({ ...menu, deliveryTiers: [...tiers, { maxKm: lastMax + 5, fee: 0 }] });
  };
  const removeTier = (idx: number) => {
    setMenu({ ...menu, deliveryTiers: (menu.deliveryTiers || []).filter((_, i) => i !== idx) });
  };
  const updateTier = (idx: number, updates: Partial<DeliveryTier>) => {
    setMenu({ ...menu, deliveryTiers: (menu.deliveryTiers || []).map((t, i) => i === idx ? { ...t, ...updates } : t) });
  };

  const togglePayment = (method: string) => {
    const current = menu.paymentMethods || [];
    setMenu({ ...menu, paymentMethods: current.includes(method) ? current.filter(m => m !== method) : [...current, method] });
  };

  const updateBusinessHour = (dayKey: string, field: string, value: any) => {
    const hours = { ...(menu.businessHours || DEFAULT_BUSINESS_HOURS) };
    hours[dayKey] = { ...hours[dayKey], [field]: value };
    setMenu({ ...menu, businessHours: hours });
  };

  const totalProducts = (menu.categories || []).reduce((a, c) => a + c.products.length, 0);
  const inputClass = "w-full px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-orange-400 transition-colors";

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <AppHeader user={user} backTo="/dashboard" />

      {/* Compact Step Indicator */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => setStep(s.num)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    step === s.num
                      ? "bg-orange-500 text-white"
                      : step > s.num
                        ? "bg-orange-100 text-orange-500"
                        : "bg-neutral-100 text-neutral-400"
                  }`}>
                    {step > s.num ? <Check size={12} weight="bold" /> : s.num}
                  </div>
                  <span className={`text-[9px] font-bold mt-0.5 ${
                    step === s.num ? "text-orange-500" : step > s.num ? "text-orange-400" : "text-neutral-400"
                  }`}>
                    {s.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1.5 ${step > s.num ? "bg-orange-300" : "bg-neutral-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* STEP 1 */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="space-y-4">
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h2 className="text-xs font-bold text-neutral-900 mb-3">Informações do negócio</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Nome do estabelecimento *</label>
                    <input type="text" value={menu.name} onChange={e => setMenu({ ...menu, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "") })} className={inputClass} placeholder="Dona Maria" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Descrição</label>
                    <textarea value={menu.description || ""} onChange={e => setMenu({ ...menu, description: e.target.value })} className={`${inputClass} h-14 resize-none`} placeholder="Breve descrição..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">URL do cardápio</label>
                    <div className="flex items-center bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden focus-within:border-orange-400 transition-all">
                      <span className="px-2.5 text-neutral-400 text-[10px] bg-neutral-100 py-2 border-r border-neutral-200">/m/</span>
                      <input type="text" value={menu.slug} onChange={e => setMenu({ ...menu, slug: e.target.value })} className="bg-transparent flex-1 px-2.5 py-2 outline-none text-sm text-neutral-900 placeholder:text-neutral-400" placeholder="dona-maria" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 mb-1">Telefone</label>
                      <input type="text" value={menu.phone || ""} onChange={e => setMenu({ ...menu, phone: e.target.value.replace(/\D/g, "") })} className={inputClass} placeholder="(00) 00000-0000" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 mb-1">Instagram</label>
                      <input type="text" value={menu.instagram || ""} onChange={e => setMenu({ ...menu, instagram: e.target.value.replace("@", "") })} className={inputClass} placeholder="@perfil" />
                    </div>
                  </div>
                </div>
              </div>

              <CustomSelect
                label="Tipo de negócio"
                value={menu.businessType || ""}
                options={BUSINESS_TYPES}
                placeholder="Selecione o tipo..."
                onChange={val => setMenu({ ...menu, businessType: val })}
              />

              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h2 className="text-xs font-bold text-neutral-900 mb-3">Identidade visual</h2>
                <div className="flex gap-3 mb-3">
                  <div className="flex-shrink-0">
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Logo</label>
                    <div className="w-20 h-20 rounded-xl bg-neutral-50 border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden relative hover:border-orange-300 transition-colors cursor-pointer">
                      {menu.logo ? <img src={menu.logo} alt="Logo" className="w-full h-full object-cover" /> : <ImageSquare className="text-neutral-300" size={22} />}
                      <input type="file" accept="image/*" onChange={handleFileUpload(r => setMenu({ ...menu, logo: r }), "logos")} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Banner</label>
                    <div className="w-full h-20 rounded-xl bg-neutral-50 border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden relative hover:border-orange-300 transition-colors cursor-pointer">
                      {menu.banner ? <img src={menu.banner} alt="Banner" className="w-full h-full object-cover" /> : <ImageSquare className="text-neutral-300" size={22} />}
                      <input type="file" accept="image/*" onChange={handleFileUpload(r => setMenu({ ...menu, banner: r }), "banners")} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 mb-1">Cor principal</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={menu.primaryColor} onChange={e => setMenu({ ...menu, primaryColor: e.target.value })} className="w-8 h-8 rounded-lg border border-neutral-200 p-0.5 cursor-pointer" />
                    <span className="text-xs font-mono text-neutral-400">{menu.primaryColor}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="space-y-4">
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xs font-bold text-neutral-900">Categorias</h2>
                    <p className="text-[10px] text-neutral-400">{menu.categories?.length || 0} criadas</p>
                  </div>
                  <button onClick={addCategory} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all text-[11px]">
                    <Plus size={12} weight="bold" /> Nova
                  </button>
                </div>

                <div className="space-y-2">
                  {menu.categories?.map((cat, idx) => (
                    <div key={cat.id} className="bg-neutral-50 rounded-lg border border-neutral-100 p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center overflow-hidden relative flex-shrink-0 hover:border-orange-300 transition-colors cursor-pointer">
                          {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" /> : <ImageSquare className="text-neutral-300" size={16} />}
                          <input type="file" accept="image/*" onChange={handleFileUpload(r => updateCategory(cat.id, { image: r }))} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <input type="text" value={cat.name} onChange={e => updateCategory(cat.id, { name: e.target.value })} className="w-full bg-transparent outline-none font-bold text-neutral-800 placeholder:text-neutral-400 text-xs" placeholder="Nome da categoria" autoFocus={cat.name === ""} />
                          <p className="text-[10px] text-neutral-400">{cat.products.length} produto{cat.products.length !== 1 ? "s" : ""}</p>
                        </div>
                        <button onClick={() => removeCategory(cat.id)} className="p-1 text-neutral-400 hover:text-red-500 transition-colors"><Trash size={14} /></button>
                      </div>
                    </div>
                  ))}

                  {menu.categories?.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-xl">
                      <ListBullets size={28} weight="duotone" className="text-neutral-200 mx-auto mb-2" />
                      <p className="text-neutral-500 text-xs font-medium mb-1">Nenhuma categoria</p>
                      <p className="text-neutral-400 text-[10px] mb-3">Ex: Lanches, Bebidas, Sobremesas</p>
                      <button onClick={addCategory} className="text-orange-500 font-bold text-[11px] hover:text-orange-600">
                        <Plus size={12} weight="bold" className="inline -mt-0.5 mr-0.5" />Adicionar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="space-y-4">
              {(!menu.categories || menu.categories.length === 0) && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
                  <Warning size={16} weight="fill" className="text-orange-500 flex-shrink-0" />
                  <p className="text-xs text-neutral-700">Crie categorias primeiro. <button onClick={() => setStep(2)} className="text-orange-500 font-bold">Voltar</button></p>
                </div>
              )}

              {menu.categories?.map(cat => (
                <div key={cat.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-neutral-100 bg-neutral-50/50">
                    <div className="flex items-center gap-2">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-6 h-6 rounded object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-neutral-200 flex items-center justify-center"><Tag size={11} className="text-neutral-500" /></div>
                      )}
                      <div>
                        <h3 className="font-bold text-neutral-900 text-[11px]">{cat.name || "Sem nome"}</h3>
                        <p className="text-[9px] text-neutral-400">{cat.products.length} produto{cat.products.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <button onClick={() => addProduct(cat.id)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-all text-[10px]">
                      <Plus size={10} weight="bold" /> Produto
                    </button>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {cat.products.map(prod => (
                      <div key={prod.id} className="p-3">
                        <div className="flex gap-2.5">
                          <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center overflow-hidden relative flex-shrink-0 hover:border-orange-300 transition-colors cursor-pointer">
                            {prod.image ? <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" /> : <ImageSquare className="text-neutral-300" size={16} />}
                            <input type="file" accept="image/*" onChange={handleFileUpload(r => updateProduct(cat.id, prod.id, { image: r }))} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <input type="text" value={prod.name} onChange={e => updateProduct(cat.id, prod.id, { name: e.target.value })} className="bg-transparent outline-none font-bold text-neutral-900 placeholder:text-neutral-400 text-xs flex-1 min-w-0" placeholder="Nome do produto" />
                              <div className="relative flex-shrink-0 w-20">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-[9px] font-bold">R$</span>
                                <input type="number" step="0.01" value={prod.price || ""} onChange={e => updateProduct(cat.id, prod.id, { price: parseFloat(e.target.value) || 0 })} className="w-full bg-neutral-50 pl-6 pr-1.5 py-1 rounded border border-neutral-200 outline-none text-[11px] font-bold text-neutral-900 focus:border-orange-400 transition-colors" placeholder="0" />
                              </div>
                              <button onClick={() => removeProduct(cat.id, prod.id)} className="p-0.5 text-neutral-300 hover:text-red-500 transition-all flex-shrink-0"><Trash size={13} /></button>
                            </div>
                            <textarea value={prod.description} onChange={e => updateProduct(cat.id, prod.id, { description: e.target.value })} className="w-full bg-transparent outline-none text-[10px] text-neutral-500 placeholder:text-neutral-400 resize-none h-6" placeholder="Descrição..." />
                            <label className="flex items-center gap-1 cursor-pointer w-fit">
                              <button type="button" onClick={() => updateProduct(cat.id, prod.id, { highlight: !prod.highlight })} className={`w-6 h-3.5 rounded-full flex items-center transition-colors ${prod.highlight ? "bg-orange-500 justify-end" : "bg-neutral-300 justify-start"}`}>
                                <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm mx-0.5" />
                              </button>
                              <span className="text-[9px] text-neutral-400">Destaque</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    {cat.products.length === 0 && (
                      <div className="p-6 text-center">
                        <Package size={24} weight="duotone" className="text-neutral-200 mx-auto mb-1.5" />
                        <p className="text-[10px] text-neutral-400 mb-1">Nenhum produto</p>
                        <button onClick={() => addProduct(cat.id)} className="text-orange-500 font-bold text-[10px] hover:text-orange-600">Adicionar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="space-y-4">
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h2 className="text-xs font-bold text-neutral-900 mb-3">WhatsApp</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Número (com DDD) *</label>
                    <input type="text" value={menu.whatsappNumber} onChange={e => setMenu({ ...menu, whatsappNumber: e.target.value.replace(/\D/g, "") })} className={inputClass} placeholder="11999999999" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Mensagem padrão</label>
                    <textarea value={menu.whatsappMessage} onChange={e => setMenu({ ...menu, whatsappMessage: e.target.value })} className={`${inputClass} h-20 resize-none text-[11px] leading-relaxed`} />
                    <p className="text-[9px] text-neutral-400 mt-0.5">Use <code className="bg-neutral-100 px-0.5 rounded text-orange-500 font-semibold">{"{produto}"}</code> para inserir o nome do item</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
                <div>
                  <h2 className="text-xs font-bold text-neutral-900 mb-0.5">Endereço do estabelecimento</h2>
                  <p className="text-[10px] text-neutral-400">CEP, rua, número e localização no mapa para taxa por distância</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">CEP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      value={menu.addressCep || ""}
                      onChange={e => {
                        setMenu({ ...menu, addressCep: formatCepMask(e.target.value), latitude: undefined, longitude: undefined });
                        setCepLookupError("");
                        setGeocodeStatus("idle");
                      }}
                      className={inputClass}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={buscarCepEstabelecimento}
                      disabled={cepLookupLoading || digitsOnly(menu.addressCep || "").length !== 8}
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white text-[10px] font-bold h-[34px] transition-all disabled:opacity-40"
                    >
                      {cepLookupLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Buscar CEP"}
                    </button>
                  </div>
                </div>
                {cepLookupError && <p className="text-[10px] text-red-500">{cepLookupError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Nome da rua (logradouro)</label>
                    <input
                      type="text"
                      value={menu.addressStreet || ""}
                      onChange={e => { setMenu({ ...menu, addressStreet: e.target.value }); setGeocodeStatus("idle"); }}
                      className={inputClass}
                      placeholder="Ex: Rua das Flores"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Número</label>
                    <input
                      type="text"
                      value={menu.addressNumber || ""}
                      onChange={e => { setMenu({ ...menu, addressNumber: e.target.value }); setGeocodeStatus("idle"); }}
                      className={inputClass}
                      placeholder="Ex: 123"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={menu.addressComplement || ""}
                      onChange={e => setMenu({ ...menu, addressComplement: e.target.value })}
                      className={inputClass}
                      placeholder="Sala, bloco..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={menu.addressNeighborhood || ""}
                      onChange={e => { setMenu({ ...menu, addressNeighborhood: e.target.value }); setGeocodeStatus("idle"); }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Cidade e UF</label>
                    <div className={`${inputClass} bg-neutral-100 text-neutral-600 flex items-center min-h-[34px]`}>
                      {[menu.addressCity, menu.addressState].filter(Boolean).join(" — ") || "Preencha pelo CEP"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={geocodeAddress}
                  disabled={geocoding || !menu.addressStreet?.trim() || !menu.addressNumber?.trim() || !menu.addressCity || !menu.addressState}
                  className="w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                >
                  {geocoding ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <NavigationArrow size={14} weight="bold" />
                  )}
                  Localizar no mapa
                </button>
                {geocodeStatus === "ok" && (
                  <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle size={11} weight="fill" /> Localização encontrada ({menu.latitude?.toFixed(4)}, {menu.longitude?.toFixed(4)})
                  </p>
                )}
                {geocodeStatus === "error" && (
                  <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                    <XCircle size={11} weight="fill" /> Não localizamos no mapa. Confira rua e cidade; o sistema tenta várias fontes (incl. grafia da rua).
                  </p>
                )}
                {menu.latitude && menu.longitude && geocodeStatus === "idle" && (
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <MapPin size={11} weight="fill" /> Localização salva — clique em &quot;Localizar no mapa&quot; para atualizar
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xs font-bold text-neutral-900">Taxas por distância</h2>
                    <p className="text-[10px] text-neutral-400">Calcule automaticamente a taxa de entrega</p>
                  </div>
                  <button type="button" onClick={addTier} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-all text-[10px]">
                    <Plus size={10} weight="bold" /> Faixa
                  </button>
                </div>

                <div className="space-y-2">
                  {(menu.deliveryTiers || []).map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-neutral-50 rounded-lg border border-neutral-100 p-2.5">
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-[10px] text-neutral-500 font-medium">Até</span>
                        <div className="relative w-16">
                          <input
                            type="number"
                            step="1"
                            value={tier.maxKm}
                            onChange={e => updateTier(idx, { maxKm: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white px-2 py-1 rounded border border-neutral-200 outline-none text-[11px] font-bold text-neutral-900 focus:border-orange-400 transition-colors text-center"
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500 font-medium">km</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-neutral-400 font-bold">R$</span>
                        <div className="relative w-16">
                          <input
                            type="number"
                            step="0.5"
                            value={tier.fee}
                            onChange={e => updateTier(idx, { fee: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white px-2 py-1 rounded border border-neutral-200 outline-none text-[11px] font-bold text-neutral-900 focus:border-orange-400 transition-colors text-center"
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeTier(idx)} className="p-1 text-neutral-300 hover:text-red-500 transition-colors">
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}

                  {(menu.deliveryTiers || []).length === 0 && (
                    <div className="text-center py-4 border-2 border-dashed border-neutral-200 rounded-lg">
                      <p className="text-[10px] text-neutral-400">Nenhuma faixa configurada</p>
                      <button type="button" onClick={addTier} className="text-orange-500 font-bold text-[10px] mt-1 hover:text-orange-600">Adicionar faixa</button>
                    </div>
                  )}

                  {(menu.deliveryTiers || []).length > 0 && (
                    <p className="text-[9px] text-neutral-400 mt-1">
                      Acima de {Math.max(...(menu.deliveryTiers || []).map(t => t.maxKm))}km: entrega não disponível (ou configure uma faixa maior)
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h2 className="text-xs font-bold text-neutral-900 mb-3">Opções gerais</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Tempo estimado</label>
                    <input type="text" value={menu.estimatedDelivery || ""} onChange={e => setMenu({ ...menu, estimatedDelivery: e.target.value })} className={inputClass} placeholder="30-50 min" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-1">Pedido mínimo</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-[9px] font-bold">R$</span>
                      <input type="number" step="0.01" value={menu.minimumOrder || 0} onChange={e => setMenu({ ...menu, minimumOrder: parseFloat(e.target.value) })} className={`${inputClass} pl-7`} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-2.5 rounded-lg bg-neutral-50 border border-neutral-100 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-neutral-800">Retirada no local</span>
                      <p className="text-[9px] text-neutral-500 leading-snug mt-0.5 pr-2">
                        No cardápio público, o cliente pode escolher buscar o pedido no endereço cadastrado (sem taxa de entrega).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMenu({ ...menu, acceptsPickup: !menu.acceptsPickup })}
                      className={`shrink-0 w-8 h-[18px] rounded-full flex items-center transition-colors ${menu.acceptsPickup ? "bg-orange-500 justify-end" : "bg-neutral-300 justify-start"}`}
                      aria-pressed={menu.acceptsPickup}
                    >
                      <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm mx-0.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h2 className="text-xs font-bold text-neutral-900 mb-2">Horário de funcionamento</h2>
                <div className="space-y-0.5">
                  {DAYS_OF_WEEK.map(day => {
                    const config = (menu.businessHours || DEFAULT_BUSINESS_HOURS)[day.key] || { open: "08:00", close: "18:00", enabled: false };
                    return (
                      <div key={day.key} className="flex items-center gap-2 py-1.5">
                        <button type="button" onClick={() => updateBusinessHour(day.key, "enabled", !config.enabled)} className={`w-7 h-4 rounded-full flex items-center transition-colors flex-shrink-0 ${config.enabled ? "bg-orange-500 justify-end" : "bg-neutral-300 justify-start"}`}>
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm mx-0.5" />
                        </button>
                        <span className={`text-[11px] w-8 flex-shrink-0 ${config.enabled ? "text-neutral-800 font-medium" : "text-neutral-400"}`}>{day.label}</span>
                        {config.enabled ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <input type="time" value={config.open} onChange={e => updateBusinessHour(day.key, "open", e.target.value)} className="bg-neutral-50 border border-neutral-200 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 outline-none focus:border-orange-400 w-[70px]" />
                            <span className="text-[9px] text-neutral-300">-</span>
                            <input type="time" value={config.close} onChange={e => updateBusinessHour(day.key, "close", e.target.value)} className="bg-neutral-50 border border-neutral-200 rounded px-1.5 py-0.5 text-[10px] text-neutral-700 outline-none focus:border-orange-400 w-[70px]" />
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-300 ml-auto">Fechado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h2 className="text-xs font-bold text-neutral-900 mb-2">Pagamento</h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_OPTIONS.map(opt => {
                    const active = (menu.paymentMethods || []).includes(opt.id);
                    return (
                      <button key={opt.id} type="button" onClick={() => togglePayment(opt.id)} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-all text-left ${active ? "border-orange-400 bg-orange-50" : "border-neutral-200 hover:border-neutral-300"}`}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${active ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                          {active ? <Check size={10} weight="bold" /> : <opt.icon size={10} />}
                        </div>
                        <span className={`text-[11px] font-medium ${active ? "text-orange-600" : "text-neutral-600"}`}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="space-y-4">
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h2 className="text-xs font-bold text-neutral-900 mb-3">Resumo</h2>

                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 mb-3">
                  {menu.logo ? (
                    <img src={menu.logo} alt={menu.name} className="w-9 h-9 rounded-lg object-cover border border-neutral-200" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">{(menu.name || "?").charAt(0)}</div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-neutral-900 text-xs truncate">{menu.name || "Sem nome"}</h3>
                    <p className="text-[10px] text-neutral-400 truncate">{menu.businessType || "Tipo não definido"} {menu.address ? `· ${menu.address}` : ""}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-neutral-50 rounded-lg p-2 text-center border border-neutral-100">
                    <p className="text-base font-bold text-neutral-900">{menu.categories?.length || 0}</p>
                    <p className="text-[8px] text-neutral-400 font-bold uppercase">Categorias</p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-2 text-center border border-neutral-100">
                    <p className="text-base font-bold text-neutral-900">{totalProducts}</p>
                    <p className="text-[8px] text-neutral-400 font-bold uppercase">Produtos</p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-2 text-center border border-neutral-100">
                    <p className="text-base font-bold text-neutral-900">{(menu.paymentMethods || []).length}</p>
                    <p className="text-[8px] text-neutral-400 font-bold uppercase">Pagamentos</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {[
                    { label: "Nome", ok: !!menu.name },
                    { label: "URL", ok: !!menu.slug },
                    { label: "1+ categoria", ok: (menu.categories?.length || 0) > 0 },
                    { label: "1+ produto", ok: totalProducts > 0 },
                    { label: "WhatsApp", ok: !!menu.whatsappNumber },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 py-1">
                      {item.ok ? <CheckCircle size={13} weight="fill" className="text-emerald-500 flex-shrink-0" /> : <XCircle size={13} weight="fill" className="text-neutral-300 flex-shrink-0" />}
                      <span className={`text-[11px] ${item.ok ? "text-neutral-700" : "text-neutral-400"}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FloppyDisk size={16} weight="bold" />}
                {id ? "Salvar alterações" : "Publicar cardápio"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-3 z-20">
        <div className="max-w-xl mx-auto flex gap-3">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="flex-1 py-2.5 rounded-lg border border-neutral-200 font-bold text-neutral-500 flex items-center justify-center gap-1.5 hover:bg-neutral-50 transition-all disabled:opacity-30 text-xs">
            <ArrowLeft size={14} weight="bold" /> Anterior
          </button>
          {step < 5 ? (
            <button onClick={() => setStep(s => Math.min(5, s + 1))} className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center gap-1.5 hover:bg-orange-600 transition-all text-xs">
              Próximo <ArrowRight size={14} weight="bold" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center gap-1.5 hover:bg-orange-600 transition-all text-xs disabled:opacity-50">
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FloppyDisk size={14} weight="bold" />}
              {id ? "Salvar" : "Publicar"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
