import { useState, useEffect, useMemo } from "react";
import { User, Menu, PLAN_LIMITS } from "@/types";
import { api } from "@/services/api";
import {
  Plus, Trash, Storefront, CopySimple,
  Crown, MagnifyingGlass, LinkSimple,
  WhatsappLogo, Lightning, DotsThree,
  Clock, ArrowSquareOut, MapPin, Tag, Package
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden animate-pulse">
      <div className="p-5 pb-0">
        <div className="flex gap-3.5">
          <div className="w-14 h-14 rounded-xl bg-neutral-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-2/5" />
            <div className="h-3 bg-neutral-100 rounded w-1/4" />
          </div>
        </div>
      </div>
      <div className="px-5 pt-3 pb-4 space-y-2">
        <div className="flex gap-4">
          <div className="h-3 bg-neutral-100 rounded w-20" />
          <div className="h-3 bg-neutral-100 rounded w-24" />
        </div>
        <div className="h-3 bg-neutral-50 rounded w-2/3" />
      </div>
      <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 bg-neutral-50/50">
        <div className="h-7 bg-neutral-200 rounded-lg w-16" />
        <div className="h-3 bg-neutral-100 rounded w-14" />
      </div>
    </div>
  );
}

const DAY_MAP: Record<number, string> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

function isBusinessOpen(hours?: Menu["businessHours"]): { open: boolean; label: string } | null {
  if (!hours) return null;
  const now = new Date();
  const dayKey = DAY_MAP[now.getDay()];
  const dayConfig = hours[dayKey];
  if (!dayConfig || !dayConfig.enabled) return { open: false, label: "Fechado" };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = dayConfig.open.split(":").map(Number);
  const [ch, cm] = dayConfig.close.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  const isOpen = currentMinutes >= openMin && currentMinutes < closeMin;
  return { open: isOpen, label: isOpen ? "Aberto" : "Fechado" };
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [menuDropdown, setMenuDropdown] = useState<string | null>(null);
  const navigate = useNavigate();

  const menuLimit = PLAN_LIMITS[user.plan?.type || "basic"];
  const canCreateMenu = menus.length < menuLimit;
  const isPro = user.plan?.type === "pro";

  useEffect(() => { fetchMenus(); }, []);

  const fetchMenus = async () => {
    try { setMenus(await api.menus.list(user.id)); }
    catch (err) { console.error("Erro ao carregar cardápios", err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.menus.delete(id); setMenus(menus.filter(m => m.id !== id)); }
    catch (err) { console.error("Erro ao excluir", err); }
    finally { setDeleteConfirm(null); }
  };

  const handleDuplicate = async (menu: Menu) => {
    if (!canCreateMenu) return;
    const { id, createdAt, updatedAt, ...rest } = menu;
    try {
      await api.menus.create(user.id, { ...rest, name: `${menu.name} (Cópia)`, slug: `${menu.slug}-copy-${Math.floor(Math.random() * 1000)}` });
      fetchMenus();
    } catch (err) { console.error("Erro ao duplicar", err); }
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/m/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleShareWhatsApp = (menu: Menu) => {
    const msg = `Confira o cardápio digital de *${menu.name}*!\n\n${window.location.origin}/m/${menu.slug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filteredMenus = useMemo(() => {
    if (!search.trim()) return menus;
    const q = search.toLowerCase();
    return menus.filter(m => m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q));
  }, [menus, search]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <AppHeader user={user} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Meus Cardápios</h1>
          </div>
          {canCreateMenu ? (
            <Link to="/creator" className="bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all text-sm">
              <Plus size={16} weight="bold" /> Novo
            </Link>
          ) : !loading ? (
            <Link to="/profile?tab=plan" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all text-sm">
              <Crown size={16} weight="fill" /> Assinar Pro
            </Link>
          ) : null}
        </div>

        {/* Plan Warning */}
        {!canCreateMenu && !loading && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Lightning size={18} weight="fill" className="text-orange-500 flex-shrink-0" />
            <p className="text-sm text-neutral-700">Limite atingido. <Link to="/profile?tab=plan" className="text-orange-500 font-bold hover:text-orange-600">Assine o Pro</Link> para cardápios ilimitados.</p>
          </motion.div>
        )}

        {/* Search */}
        {!loading && menus.length > 2 && (
          <div className="relative mb-6">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input type="text" placeholder="Buscar cardápio..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-orange-500/50 transition-colors" />
          </div>
        )}

        {/* Skeleton Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty State */}
        {!loading && menus.length === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-5">
              <Storefront size={32} weight="duotone" className="text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Nenhum cardápio ainda</h3>
            <p className="text-neutral-500 text-sm max-w-xs mx-auto mb-6">Monte um cardápio digital profissional e comece a vender.</p>
            <Link to="/creator" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition-all text-sm">
              <Plus size={18} weight="bold" /> Criar Cardápio
            </Link>
          </div>
        )}

        {/* Menu List */}
        {!loading && menus.length > 0 && (
          <div className="space-y-3">
            {filteredMenus.length === 0 && search && (
              <p className="text-center py-12 text-neutral-400 text-sm">Nenhum resultado para "{search}"</p>
            )}
            {filteredMenus.map((menu) => {
              const counts = (menu as any)._counts;
              const productCount = counts?.products ?? menu.categories.reduce((a, c) => a + c.products.length, 0);
              const categoryCount = counts?.categories ?? menu.categories.length;
              const isOpen = menuDropdown === menu.id;
              const status = isBusinessOpen(menu.businessHours);

              return (
                <div key={menu.id} className={`bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all group relative ${isOpen ? "z-50" : ""}`}>
                  {/* Card Header with Logo & Name */}
                  <div className="p-5 pb-0">
                    <div className="flex gap-3.5">
                      <div className="flex-shrink-0">
                        {menu.logo ? (
                          <img src={menu.logo} alt={menu.name} className="w-14 h-14 rounded-xl object-cover border border-neutral-100" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                            {menu.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-neutral-900 truncate text-base leading-tight">{menu.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {menu.businessType && (
                                <span className="text-xs text-orange-500 font-medium">{menu.businessType}</span>
                              )}
                              {status && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status.open ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                                  {status.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative flex-shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); setMenuDropdown(isOpen ? null : menu.id); }} className="p-1.5 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all">
                              <DotsThree size={20} weight="bold" />
                            </button>
                            {isOpen && (
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1">
                                <button onClick={() => { handleCopyLink(menu.slug); setMenuDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                                  <LinkSimple size={16} className="text-neutral-400" /> Copiar link
                                </button>
                                <a href={`/m/${menu.slug}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                                  <ArrowSquareOut size={16} className="text-neutral-400" /> Abrir cardápio
                                </a>
                                <button onClick={() => { handleShareWhatsApp(menu); setMenuDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                                  <WhatsappLogo size={16} weight="fill" className="text-neutral-400" /> Enviar por WhatsApp
                                </button>
                                <button onClick={() => { handleDuplicate(menu); setMenuDropdown(null); }} disabled={!canCreateMenu} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-30">
                                  <CopySimple size={16} className="text-neutral-400" /> Duplicar
                                </button>
                                <div className="border-t border-neutral-100 my-1" />
                                <button onClick={() => { setDeleteConfirm(menu.id); setMenuDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                                  <Trash size={16} /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="px-5 pt-3 pb-4">
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Package size={13} className="text-neutral-400" />
                        {productCount} produto{productCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag size={13} className="text-neutral-400" />
                        {categoryCount} categoria{categoryCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {menu.address && (
                      <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1 truncate">
                        <MapPin size={13} className="text-neutral-300 flex-shrink-0" />
                        {menu.address}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 bg-neutral-50/50">
                    <button onClick={() => navigate(`/creator/${menu.id}`)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all">
                      Editar
                    </button>
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Clock size={11} />
                      {menu.updatedAt
                        ? new Date(menu.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                        : new Date(menu.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {menuDropdown && <div className="fixed inset-0 z-40" onClick={() => setMenuDropdown(null)} />}

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-xl border border-neutral-200 p-5 text-center shadow-xl">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash size={24} weight="duotone" className="text-red-500" />
              </div>
              <h3 className="font-bold text-neutral-900 text-lg mb-2">Excluir cardápio</h3>
              <p className="text-sm text-neutral-500 mb-6">Tem certeza? Todos os dados deste cardápio serão perdidos.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-lg border border-neutral-200 text-neutral-500 font-bold text-sm hover:bg-neutral-50 transition-colors">Cancelar</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
