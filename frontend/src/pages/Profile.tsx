import { useState, useMemo, useRef } from "react";
import { User, PLAN_PRICES, PLAN_LABELS, PLAN_LIMITS } from "@/types";
import { api, ApiError } from "@/services/api";
import {
  User as PhUser, Lock, Shield, Crown, Check, SignOut, Calendar, Lightning,
  Camera
} from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

type Tab = "profile" | "password" | "security" | "plan";

const TABS: { id: Tab; label: string; icon: typeof PhUser }[] = [
  { id: "profile", label: "Perfil", icon: PhUser },
  { id: "password", label: "Senha", icon: Lock },
  { id: "security", label: "Segurança", icon: Shield },
  { id: "plan", label: "Plano", icon: Crown },
];

export default function Profile({ user, onLogout, onUserUpdate }: ProfileProps) {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "profile";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const isPro = user.plan?.type === "pro";
  const menuLimit = PLAN_LIMITS[user.plan?.type || "basic"];

  const daysRemaining = useMemo(() => {
    if (!user.plan?.expiresAt) return null;
    const diff = new Date(user.plan.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [user.plan?.expiresAt]);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const { url } = await api.upload.image(reader.result as string, "avatars");
        setAvatarPreview(url);
        const res = await api.auth.updateProfile(user.id, { avatar: url });
        onUserUpdate(res.user);
      } catch (err) {
        console.error("Avatar upload failed:", err);
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    setProfileSaving(true); setProfileError(""); setProfileSuccess(false);
    try {
      const res = await api.auth.updateProfile(user.id, { name, email });
      onUserUpdate(res.user);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
    catch (err) { setProfileError(err instanceof ApiError ? err.message : "Erro ao salvar"); }
    finally { setProfileSaving(false); }
  };

  const handlePasswordChange = async () => {
    setPasswordError(""); setPasswordSuccess(false);
    if (newPassword.length < 6) { setPasswordError("A nova senha deve ter pelo menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("As senhas não coincidem"); return; }
    setPasswordSaving(true);
    try {
      await api.auth.changePassword(user.id, currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
    catch (err) { setPasswordError(err instanceof ApiError ? err.message : "Erro ao alterar senha"); }
    finally { setPasswordSaving(false); }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-orange-400 transition-colors";

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <AppHeader user={user} backTo="/dashboard" />

      <main className="max-w-xl mx-auto px-4 py-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-orange-50 border border-neutral-200 flex items-center justify-center text-orange-500 overflow-hidden">
              {avatarUploading ? (
                <div className="w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
              ) : (avatarPreview || user.avatar) ? (
                <img src={avatarPreview || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : user.name ? (
                <span className="text-xl font-bold uppercase">{user.name.charAt(0)}</span>
              ) : (
                <PhUser size={24} weight="bold" />
              )}
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Camera size={11} weight="bold" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-neutral-900 truncate">{user.name || "Sem nome"}</h2>
            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPro ? "bg-orange-50 text-orange-500" : "bg-neutral-100 text-neutral-500"}`}>
              {isPro ? <Crown size={9} weight="fill" /> : <Lightning size={9} weight="fill" />}
              {isPro ? "Pro" : "Básico"}
            </div>
          </div>
        </div>

        {/* Tabs - segmented control */}
        <div className="bg-neutral-100 rounded-lg p-0.5 grid grid-cols-4 gap-0.5 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <tab.icon size={13} weight={activeTab === tab.id ? "fill" : "regular"} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-neutral-900">Informações pessoais</h3>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Nome</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Seu nome completo" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="seu@email.com" />
                </div>
                {profileError && <p className="text-red-500 text-xs font-medium">{profileError}</p>}
                {profileSuccess && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-500 text-xs font-medium flex items-center gap-1.5"><Check size={14} weight="bold" /> Salvo</motion.p>}
                <button onClick={handleProfileSave} disabled={profileSaving} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs">
                  {profileSaving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} weight="bold" />}
                  Salvar
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "password" && (
            <motion.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-neutral-900">Alterar senha</h3>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Senha atual</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Nova senha</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Confirmar</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repita a nova senha" />
                  </div>
                </div>
                {passwordError && <p className="text-red-500 text-xs font-medium">{passwordError}</p>}
                {passwordSuccess && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-500 text-xs font-medium flex items-center gap-1.5"><Check size={14} weight="bold" /> Senha alterada</motion.p>}
                <button onClick={handlePasswordChange} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs">
                  {passwordSaving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock size={14} weight="bold" />}
                  Alterar
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-4">
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5">
                <h3 className="text-sm font-bold text-neutral-900 mb-3">Segurança da conta</h3>
                <div className="space-y-2">
                  {[
                    { title: "Autenticação 2FA", desc: "Camada extra de segurança" },
                    { title: "Sessões ativas", desc: "Dispositivos conectados" },
                    { title: "Histórico de logins", desc: "Últimos acessos" },
                  ].map(item => (
                    <div key={item.title} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                      <div>
                        <p className="text-xs font-bold text-neutral-800">{item.title}</p>
                        <p className="text-[10px] text-neutral-400">{item.desc}</p>
                      </div>
                      <span className="text-[9px] font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">EM BREVE</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-red-100 p-4 sm:p-5">
                <h3 className="text-xs font-bold text-red-500 mb-1">Zona de perigo</h3>
                <p className="text-[10px] text-neutral-400 mb-3">Ações irreversíveis.</p>
                <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-red-500 hover:border-red-200 transition-all font-bold text-xs">
                  <SignOut size={13} weight="bold" /> Sair da conta
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "plan" && (
            <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-4">
              {/* Current plan card */}
              <div className={`rounded-xl border p-4 sm:p-5 ${isPro ? "bg-gradient-to-br from-orange-50 to-white border-orange-200" : "bg-white border-neutral-200"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Plano atual</p>
                    <h3 className="text-base font-bold text-neutral-900 mt-0.5">{isPro ? "Drovenfy Pro" : "Básico"}</h3>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPro ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                    {isPro ? <Crown size={16} weight="fill" /> : <Lightning size={16} weight="fill" />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/70 rounded-lg p-2.5 border border-neutral-100">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">Cardápios</p>
                    <p className="text-lg font-bold text-neutral-900">{menuLimit === Infinity ? "∞" : menuLimit}</p>
                  </div>
                  {isPro && user.plan?.expiresAt ? (
                    <div className="bg-white/70 rounded-lg p-2.5 border border-neutral-100">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">Expira em</p>
                      <p className={`text-lg font-bold ${daysRemaining !== null && daysRemaining <= 7 ? "text-red-500" : "text-neutral-900"}`}>{daysRemaining}d</p>
                    </div>
                  ) : (
                    <div className="bg-white/70 rounded-lg p-2.5 border border-neutral-100">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-neutral-400">Status</p>
                      <p className="text-lg font-bold text-emerald-500">Ativo</p>
                    </div>
                  )}
                </div>
                {isPro && user.plan?.interval && (
                  <p className="text-[10px] text-neutral-500 mt-3 flex items-center gap-1">
                    <Calendar size={10} />
                    {PLAN_LABELS[user.plan.interval]} — {formatCurrency(PLAN_PRICES[user.plan.interval])}
                  </p>
                )}
              </div>

              {/* Upgrade section for basic users */}
              {!isPro && (
                <>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-neutral-900">Upgrade para Pro</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Cardápios ilimitados e mais</p>
                  </div>
                  <div className="space-y-2">
                    {(["monthly", "quarterly", "annual"] as const).map(interval => {
                      const price = PLAN_PRICES[interval];
                      const isPopular = interval === "quarterly";
                      const monthlyEq = interval === "monthly" ? price : interval === "quarterly" ? Math.round(price / 3) : Math.round(price / 12);
                      const savings: Record<string, string> = { quarterly: "R$ 44", annual: "R$ 467" };
                      return (
                        <div key={interval} className={`relative rounded-xl p-4 border transition-colors ${isPopular ? "border-orange-400 bg-orange-50/50" : "bg-white border-neutral-200"}`}>
                          {isPopular && <div className="absolute -top-2.5 left-4 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">POPULAR</div>}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-neutral-900">{PLAN_LABELS[interval]}</p>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xs text-neutral-400">R$</span>
                                <span className="text-xl font-bold text-neutral-900">{price}</span>
                                {interval !== "monthly" && <span className="text-[10px] text-neutral-400">~{formatCurrency(monthlyEq)}/mês</span>}
                              </div>
                              {savings[interval] && <p className="text-[10px] text-emerald-500 font-bold mt-0.5">Economia de {savings[interval]}</p>}
                            </div>
                            <button className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${isPopular ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"}`}>
                              Assinar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact comparison */}
                  <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <h4 className="text-xs font-bold text-neutral-800 mb-3">Comparação</h4>
                    <div className="space-y-0">
                      <div className="grid grid-cols-3 gap-2 pb-1.5 mb-1.5 border-b border-neutral-100 text-[9px] uppercase tracking-wider font-bold">
                        <span className="text-neutral-400">Recurso</span>
                        <span className="text-neutral-400 text-center">Básico</span>
                        <span className="text-orange-400 text-center">Pro</span>
                      </div>
                      {[
                        { feature: "Cardápios", basic: "Até 8", pro: "Ilimitados" },
                        { feature: "Link público", basic: "✓", pro: "✓" },
                        { feature: "WhatsApp", basic: "✓", pro: "✓" },
                        { feature: "Marca d'água", basic: "Sim", pro: "Removida" },
                        { feature: "Suporte", basic: "Comunidade", pro: "Prioritário" },
                      ].map(row => (
                        <div key={row.feature} className="grid grid-cols-3 gap-2 py-1.5 border-b border-neutral-50 last:border-0 text-[11px]">
                          <span className="text-neutral-600">{row.feature}</span>
                          <span className="text-neutral-400 text-center">{row.basic}</span>
                          <span className="text-orange-500 text-center font-bold">{row.pro}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
