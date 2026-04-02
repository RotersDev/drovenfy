import { useState, useEffect, useMemo } from "react";
import { PLAN_PRICES, PLAN_LABELS } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3, Users, Store, ShoppingBag, Crown, Trash2,
  Search, ChevronDown, ChevronUp, ExternalLink, ArrowLeft,
  TrendingUp, Calendar, Shield, Zap, Eye, X, UserCheck, UserX
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "overview" | "users" | "menus" | "plans";

interface AdminStats {
  totalUsers: number;
  totalMenus: number;
  totalProducts: number;
  totalCategories: number;
  proUsers: number;
  basicUsers: number;
  menusPerUser: string;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  newMenusLast7Days: number;
  newMenusLast30Days: number;
  planDistribution: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: { type: string; interval?: string; expiresAt?: string; startedAt?: string };
  createdAt: string | null;
  menuCount: number;
  totalProducts: number;
}

interface AdminMenu {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  ownerEmail: string;
  ownerName: string;
  ownerId: string;
  categoryCount: number;
  productCount: number;
  whatsappNumber: string;
  createdAt: string;
  updatedAt: string | null;
}

const API_BASE = "/api/admin";

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Visão Geral", icon: BarChart3 },
  { id: "users", label: "Usuários", icon: Users },
  { id: "menus", label: "Cardápios", icon: Store },
  { id: "plans", label: "Planos", icon: Crown },
];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [userSort, setUserSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [menuSort, setMenuSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [userFilter, setUserFilter] = useState<"all" | "basic" | "pro">("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<AdminMenu | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "user" | "menu"; id: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsData, usersData, menusData] = await Promise.all([
        adminFetch<AdminStats>("/stats"),
        adminFetch<AdminUser[]>("/users"),
        adminFetch<AdminMenu[]>("/menus"),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setMenus(menusData);
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    await adminFetch(`/users/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    loadData(true);
  };

  const handleDeleteMenu = async (id: string) => {
    await adminFetch(`/menus/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    loadData(true);
  };

  const handleUpdatePlan = async (userId: string, plan: any) => {
    try {
      await adminFetch(`/users/${userId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      await loadData(true);
    } catch (err) {
      console.error("Failed to update plan:", err);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchesSearch = u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.name.toLowerCase().includes(userSearch.toLowerCase());
      const matchesFilter = userFilter === "all" || u.plan.type === userFilter;
      return matchesSearch && matchesFilter;
    });

    result.sort((a: any, b: any) => {
      const key = userSort.key;
      let aVal = a[key] ?? "";
      let bVal = b[key] ?? "";
      if (key === "createdAt") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return userSort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return userSort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, userSearch, userFilter, userSort]);

  const filteredMenus = useMemo(() => {
    let result = menus.filter(m =>
      m.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      m.slug.toLowerCase().includes(menuSearch.toLowerCase()) ||
      m.ownerEmail.toLowerCase().includes(menuSearch.toLowerCase())
    );

    result.sort((a: any, b: any) => {
      const key = menuSort.key;
      let aVal = a[key] ?? "";
      let bVal = b[key] ?? "";
      if (key === "createdAt" || key === "updatedAt") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return menuSort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return menuSort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [menus, menuSearch, menuSort]);

  const estimatedRevenue = useMemo(() => {
    if (!stats) return 0;
    const { planDistribution } = stats;
    return (planDistribution.monthly * PLAN_PRICES.monthly) +
      (planDistribution.quarterly * PLAN_PRICES.quarterly) +
      (planDistribution.annual * PLAN_PRICES.annual);
  }, [stats]);

  const toggleSort = (table: "user" | "menu", key: string) => {
    if (table === "user") {
      setUserSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
    } else {
      setMenuSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
    }
  };

  const SortIcon = ({ table, column }: { table: "user" | "menu"; column: string }) => {
    const sort = table === "user" ? userSort : menuSort;
    if (sort.key !== column) return <ChevronDown size={12} className="text-neutral-300" />;
    return sort.dir === "asc" ? <ChevronUp size={12} className="text-orange-500" /> : <ChevronDown size={12} className="text-orange-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="text-neutral-400 hover:text-neutral-700 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <img src="https://pub-599d1182afd34ef9bba864fbaca57854.r2.dev/logotipodrovenfy.png" alt="Drovenfy" className="h-7 w-auto" />
              <div className="hidden sm:flex items-center gap-1.5 bg-red-50 text-red-500 text-[10px] font-bold px-2 py-1 rounded">
                <Shield size={10} />
                ADMIN
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all disabled:opacity-50"
            >
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white"
                  : "bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && stats && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Usuários", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
                  { label: "Total Cardápios", value: stats.totalMenus, icon: Store, color: "text-orange-500", bg: "bg-orange-500/10" },
                  { label: "Total Produtos", value: stats.totalProducts, icon: ShoppingBag, color: "text-green-500", bg: "bg-green-50" },
                  { label: "Categorias", value: stats.totalCategories, icon: BarChart3, color: "text-purple-500", bg: "bg-purple-50" },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${card.bg}`}>
                        <card.icon size={18} className={card.color} />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-neutral-900">{card.value}</p>
                    <p className="text-xs text-neutral-500 mt-1">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={16} className="text-green-500" />
                    <h3 className="text-sm font-bold text-neutral-700">Últimos 7 dias</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Novos usuários</span>
                      <span className="text-sm font-bold text-neutral-800">+{stats.newUsersLast7Days}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Novos cardápios</span>
                      <span className="text-sm font-bold text-neutral-800">+{stats.newMenusLast7Days}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={16} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-neutral-700">Últimos 30 dias</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Novos usuários</span>
                      <span className="text-sm font-bold text-neutral-800">+{stats.newUsersLast30Days}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Novos cardápios</span>
                      <span className="text-sm font-bold text-neutral-800">+{stats.newMenusLast30Days}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-neutral-700">Médias</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Cardápios por usuário</span>
                      <span className="text-sm font-bold text-neutral-800">{stats.menusPerUser}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Taxa de conversão Pro</span>
                      <span className="text-sm font-bold text-neutral-800">{stats.totalUsers > 0 ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <h3 className="text-sm font-bold text-neutral-700 mb-4">Distribuição de Planos</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-neutral-400 flex items-center gap-1.5"><Zap size={12} /> Básico (Grátis)</span>
                        <span className="font-bold text-neutral-800">{stats.basicUsers}</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-400 rounded-full transition-all" style={{ width: `${stats.totalUsers > 0 ? (stats.basicUsers / stats.totalUsers) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-neutral-400 flex items-center gap-1.5"><Crown size={12} className="text-orange-500" /> Drovenfy Pro</span>
                        <span className="font-bold text-orange-500">{stats.proUsers}</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${stats.totalUsers > 0 ? (stats.proUsers / stats.totalUsers) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <h3 className="text-sm font-bold text-neutral-700 mb-4">Receita Estimada (MRR)</h3>
                  <p className="text-3xl font-bold text-green-500 mb-4">{formatCurrency(estimatedRevenue)}</p>
                  <div className="space-y-2">
                    {(["monthly", "quarterly", "annual"] as const).map(interval => (
                      <div key={interval} className="flex justify-between text-sm">
                        <span className="text-neutral-500">{PLAN_LABELS[interval]} ({formatCurrency(PLAN_PRICES[interval])})</span>
                        <span className="font-bold text-neutral-700">{stats.planDistribution[interval]} assinantes</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por e-mail ou nome..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg py-2.5 pl-9 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "basic", "pro"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setUserFilter(f)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        userFilter === f
                          ? "bg-orange-500 text-white"
                          : "bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      {f === "all" ? "Todos" : f === "basic" ? "Básico" : "Pro"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-neutral-500 font-medium">
                {filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""} encontrado{filteredUsers.length !== 1 ? "s" : ""}
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        {[
                          { key: "email", label: "Usuário" },
                          { key: "plan", label: "Plano" },
                          { key: "menuCount", label: "Cardápios" },
                          { key: "totalProducts", label: "Produtos" },
                          { key: "createdAt", label: "Criado em" },
                          { key: "actions", label: "" },
                        ].map(col => (
                          <th
                            key={col.key}
                            onClick={() => col.key !== "actions" && toggleSort("user", col.key)}
                            className={`text-left px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500 ${col.key !== "actions" ? "cursor-pointer hover:text-neutral-700" : ""}`}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              {col.key !== "actions" && <SortIcon table="user" column={col.key} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-xs font-bold flex-shrink-0">
                                {(u.name || u.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-neutral-900 truncate">{u.name || "Sem nome"}</p>
                                <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded ${
                              u.plan.type === "pro"
                                ? "bg-orange-500/10 text-orange-500"
                                : "bg-neutral-100 text-neutral-500"
                            }`}>
                              {u.plan.type === "pro" ? <Crown size={10} /> : <Zap size={10} />}
                              {u.plan.type === "pro" ? "Pro" : "Básico"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-700 font-medium">{u.menuCount}</td>
                          <td className="px-4 py-3 text-neutral-700 font-medium">{u.totalProducts}</td>
                          <td className="px-4 py-3 text-neutral-500 text-xs">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="p-1.5 text-neutral-600 hover:text-neutral-700 transition-colors"
                                title="Ver detalhes"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({ type: "user", id: u.id, name: u.email })}
                                className="p-1.5 text-neutral-600 hover:text-red-500 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "menus" && (
            <motion.div
              key="menus"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nome, slug ou proprietário..."
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg py-2.5 pl-9 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="text-xs text-neutral-500 font-medium">
                {filteredMenus.length} cardápio{filteredMenus.length !== 1 ? "s" : ""} encontrado{filteredMenus.length !== 1 ? "s" : ""}
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        {[
                          { key: "name", label: "Cardápio" },
                          { key: "ownerEmail", label: "Proprietário" },
                          { key: "categoryCount", label: "Categorias" },
                          { key: "productCount", label: "Produtos" },
                          { key: "createdAt", label: "Criado em" },
                          { key: "actions", label: "" },
                        ].map(col => (
                          <th
                            key={col.key}
                            onClick={() => col.key !== "actions" && toggleSort("menu", col.key)}
                            className={`text-left px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500 ${col.key !== "actions" ? "cursor-pointer hover:text-neutral-700" : ""}`}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              {col.key !== "actions" && <SortIcon table="menu" column={col.key} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMenus.map(m => (
                        <tr key={m.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 text-xs font-bold flex-shrink-0 overflow-hidden">
                                {m.logo ? (
                                  <img src={m.logo} alt={m.name} className="w-full h-full object-cover" />
                                ) : (
                                  m.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-neutral-900 truncate">{m.name}</p>
                                <p className="text-xs text-neutral-500 truncate">/m/{m.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-neutral-700 truncate text-xs">{m.ownerEmail}</p>
                          </td>
                          <td className="px-4 py-3 text-neutral-700 font-medium">{m.categoryCount}</td>
                          <td className="px-4 py-3 text-neutral-700 font-medium">{m.productCount}</td>
                          <td className="px-4 py-3 text-neutral-500 text-xs">
                            {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <a
                                href={`/m/${m.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-neutral-600 hover:text-orange-500 transition-colors"
                                title="Ver cardápio"
                              >
                                <ExternalLink size={16} />
                              </a>
                              <button
                                onClick={() => setSelectedMenu(m)}
                                className="p-1.5 text-neutral-600 hover:text-neutral-700 transition-colors"
                                title="Detalhes"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({ type: "menu", id: m.id, name: m.name })}
                                className="p-1.5 text-neutral-600 hover:text-red-500 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "plans" && stats && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center">
                  <p className="text-3xl font-bold text-green-500 mb-1">{formatCurrency(estimatedRevenue)}</p>
                  <p className="text-xs text-neutral-500">Receita total estimada</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center">
                  <p className="text-3xl font-bold text-orange-500 mb-1">{stats.proUsers}</p>
                  <p className="text-xs text-neutral-500">Assinantes Pro ativos</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center">
                  <p className="text-3xl font-bold text-neutral-900 mb-1">
                    {stats.totalUsers > 0 ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs text-neutral-500">Taxa de conversão</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="text-sm font-bold text-neutral-700 mb-6">Assinantes por Plano</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(["monthly", "quarterly", "annual"] as const).map(interval => {
                    const count = stats.planDistribution[interval];
                    const revenue = count * PLAN_PRICES[interval];
                    return (
                      <div key={interval} className="bg-neutral-50 rounded-xl p-5 border border-neutral-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-neutral-700">{PLAN_LABELS[interval]}</span>
                          <span className="text-xs text-neutral-500">{formatCurrency(PLAN_PRICES[interval])}</span>
                        </div>
                        <p className="text-2xl font-bold text-neutral-900 mb-1">{count}</p>
                        <p className="text-xs text-neutral-500">assinante{count !== 1 ? "s" : ""}</p>
                        <div className="mt-3 pt-3 border-t border-neutral-200">
                          <p className="text-sm font-bold text-green-500">{formatCurrency(revenue)}</p>
                          <p className="text-[10px] text-neutral-500">receita deste plano</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="text-sm font-bold text-neutral-700 mb-4">Usuários Pro</h3>
                {users.filter(u => u.plan.type === "pro").length === 0 ? (
                  <p className="text-sm text-neutral-500 py-4 text-center">Nenhum assinante Pro ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {users.filter(u => u.plan.type === "pro").map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-xs font-bold">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">{u.name || u.email}</p>
                            <p className="text-xs text-neutral-500">{u.plan.interval ? PLAN_LABELS[u.plan.interval as keyof typeof PLAN_LABELS] : "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.plan.expiresAt && (
                            <span className="text-xs text-neutral-500">
                              Expira: {new Date(u.plan.expiresAt).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          <button
                            onClick={() => handleUpdatePlan(u.id, { type: "basic" })}
                            className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors"
                          >
                            Rebaixar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="text-sm font-bold text-neutral-700 mb-4">Promover para Pro</h3>
                <p className="text-xs text-neutral-500 mb-4">Selecione um usuário do plano Básico para promover manualmente.</p>
                {users.filter(u => u.plan.type === "basic").length === 0 ? (
                  <p className="text-sm text-neutral-500 py-4 text-center">Todos os usuários já são Pro.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {users.filter(u => u.plan.type === "basic").map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 text-xs font-bold">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">{u.name || u.email}</p>
                            <p className="text-xs text-neutral-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(["monthly", "quarterly", "annual"] as const).map(interval => (
                            <button
                              key={interval}
                              onClick={() => {
                                const now = new Date();
                                const months = interval === "monthly" ? 1 : interval === "quarterly" ? 3 : 12;
                                const expiresAt = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
                                handleUpdatePlan(u.id, { type: "pro", interval, startedAt: now.toISOString(), expiresAt });
                              }}
                              className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100 transition-colors whitespace-nowrap"
                            >
                              {PLAN_LABELS[interval]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <h3 className="text-sm font-bold text-neutral-900">Detalhes do usuário</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1.5 text-neutral-400 hover:text-neutral-700">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-lg font-bold">
                    {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-neutral-900 text-base truncate">{selectedUser.name || "Sem nome"}</p>
                    <p className="text-xs text-neutral-500 truncate">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Plano", value: selectedUser.plan.type === "pro" ? "Drovenfy Pro" : "Básico", icon: selectedUser.plan.type === "pro" ? UserCheck : UserX },
                    { label: "Cardápios", value: selectedUser.menuCount, icon: Store },
                    { label: "Produtos", value: selectedUser.totalProducts, icon: ShoppingBag },
                    { label: "Membro desde", value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("pt-BR") : "—", icon: Calendar },
                  ].map(item => (
                    <div key={item.label} className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon size={12} className="text-neutral-500" />
                        <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-neutral-800">{item.value}</p>
                    </div>
                  ))}
                </div>

                {selectedUser.plan.type === "pro" && selectedUser.plan.interval && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <p className="text-xs text-neutral-400">
                      Plano <span className="text-orange-500 font-bold">{PLAN_LABELS[selectedUser.plan.interval as keyof typeof PLAN_LABELS]}</span>
                      {selectedUser.plan.expiresAt && (
                        <> — expira em <span className="text-orange-500 font-bold">{new Date(selectedUser.plan.expiresAt).toLocaleDateString("pt-BR")}</span></>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setConfirmDelete({ type: "user", id: selectedUser.id, name: selectedUser.email }); setSelectedUser(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    Excluir conta
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Detail Modal */}
      <AnimatePresence>
        {selectedMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMenu(null)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <h3 className="text-sm font-bold text-neutral-900">Detalhes do cardápio</h3>
                <button onClick={() => setSelectedMenu(null)} className="p-1.5 text-neutral-400 hover:text-neutral-700">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 text-lg font-bold overflow-hidden shrink-0">
                    {selectedMenu.logo ? (
                      <img src={selectedMenu.logo} alt={selectedMenu.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedMenu.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-neutral-900 text-base truncate">{selectedMenu.name}</p>
                    <p className="text-xs text-neutral-500 truncate">/m/{selectedMenu.slug}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Proprietário", value: selectedMenu.ownerEmail, icon: Users },
                    { label: "WhatsApp", value: selectedMenu.whatsappNumber || "—", icon: Store },
                    { label: "Categorias", value: selectedMenu.categoryCount, icon: BarChart3 },
                    { label: "Produtos", value: selectedMenu.productCount, icon: ShoppingBag },
                    { label: "Criado em", value: new Date(selectedMenu.createdAt).toLocaleDateString("pt-BR"), icon: Calendar },
                    { label: "Atualizado", value: selectedMenu.updatedAt ? new Date(selectedMenu.updatedAt).toLocaleDateString("pt-BR") : "—", icon: Calendar },
                  ].map(item => (
                    <div key={item.label} className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon size={12} className="text-neutral-500" />
                        <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-neutral-800 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={`/m/${selectedMenu.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-bold hover:bg-orange-100 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Ver cardápio
                  </a>
                  <button
                    onClick={() => { setConfirmDelete({ type: "menu", id: selectedMenu.id, name: selectedMenu.name }); setSelectedMenu(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-xl border border-neutral-200 p-5 text-center shadow-xl"
            >
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="font-bold text-neutral-900 text-base mb-2">Confirmar exclusão</h3>
              <p className="text-xs text-neutral-500 mb-5">
                Tem certeza que deseja excluir {confirmDelete.type === "user" ? "o usuário" : "o cardápio"}{" "}
                <span className="text-neutral-900 font-bold">{confirmDelete.name}</span>?
                {confirmDelete.type === "user" && " Todos os cardápios deste usuário também serão excluídos."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-lg border border-neutral-200 text-neutral-500 font-bold text-sm hover:bg-neutral-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmDelete.type === "user" ? handleDeleteUser(confirmDelete.id) : handleDeleteMenu(confirmDelete.id)}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
