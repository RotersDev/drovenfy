import React, { useState } from "react";
import { User } from "@/types";
import { api, ApiError } from "@/services/api";
import { Eye, EyeSlash, ArrowRight, ArrowLeft, WarningCircle, EnvelopeSimple, CheckCircle, GoogleLogo } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginProps {
  onLogin: (user: User) => void;
}

type View = "auth" | "forgot" | "forgot-sent";

export default function Login({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [view, setView] = useState<View>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const action = isRegistering ? api.auth.register : api.auth.login;
      const data = await action(email, password);
      onLogin(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro de conexão com o servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setView("forgot-sent");
  };

  const switchMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setView("auth");
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[52%] bg-neutral-50 relative overflow-hidden flex-col justify-between p-14 border-r border-neutral-200">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.1)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(249,115,22,0.06)_0%,_transparent_50%)]" />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] border border-orange-500/[0.08] rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] border border-orange-500/[0.05] rounded-full translate-x-1/4 translate-y-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="https://pub-599d1182afd34ef9bba864fbaca57854.r2.dev/logotipodrovenfy.png" alt="Drovenfy" className="h-8 w-auto" />
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-orange-500 text-[11px] uppercase tracking-[0.25em] font-semibold mb-5">
            Gere renda extra
          </p>
          <h2 className="text-neutral-900 text-[2.75rem] font-bold leading-[1.1] tracking-tight">
            Crie cardápios.
            <br />
            <span className="text-orange-500">Venda para negócios.</span>
          </h2>
          <p className="text-neutral-500 mt-6 text-[15px] leading-relaxed max-w-sm">
            Monte cardápios digitais profissionais de graça e venda para lanchonetes, açaiterias e restaurantes da sua cidade.
          </p>

          <div className="mt-12 flex items-center gap-8">
            <div>
              <p className="text-orange-500 text-2xl font-bold">R$80+</p>
              <p className="text-neutral-400 text-xs mt-1">Por cardápio vendido</p>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div>
              <p className="text-orange-500 text-2xl font-bold">5min</p>
              <p className="text-neutral-400 text-xs mt-1">Para criar um cardápio</p>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div>
              <p className="text-orange-500 text-2xl font-bold">∞</p>
              <p className="text-neutral-400 text-xs mt-1">Cardápios ilimitados</p>
            </div>
          </div>
        </div>

        <div className="relative z-10" />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(249,115,22,0.06)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(249,115,22,0.04)_0%,_transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] border border-orange-500/[0.06] rounded-full -translate-x-1/3 -translate-y-1/3" />
        <div className="absolute top-0 left-0 w-[280px] h-[280px] border border-orange-500/[0.04] rounded-full -translate-x-1/4 -translate-y-1/4" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[380px] relative z-10"
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex justify-center mb-12">
            <img src="https://pub-599d1182afd34ef9bba864fbaca57854.r2.dev/logotipodrovenfy.png" alt="Drovenfy" className="h-14 w-auto" />
          </div>

          <AnimatePresence mode="wait">
            {/* ── Forgot Password: sent confirmation ── */}
            {view === "forgot-sent" ? (
              <motion.div
                key="forgot-sent"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center text-center py-8">
                  <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle size={28} weight="fill" className="text-orange-500" />
                  </div>
                  <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                    E-mail enviado
                  </h1>
                  <p className="text-neutral-500 text-[13px] mt-2 max-w-[280px] leading-relaxed">
                    Se uma conta existir com <span className="text-orange-500 font-medium">{resetEmail}</span>, você receberá um link para redefinir sua senha.
                  </p>
                  <button
                    onClick={() => { setView("auth"); setResetEmail(""); }}
                    className="mt-8 text-[13px] font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft size={14} weight="bold" />
                    Voltar para o login
                  </button>
                </div>
              </motion.div>

            /* ── Forgot Password: form ── */
            ) : view === "forgot" ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => setView("auth")}
                  className="flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-700 transition-colors mb-8"
                >
                  <ArrowLeft size={14} weight="bold" />
                  Voltar
                </button>

                <div className="mb-8">
                  <div className="w-11 h-11 bg-neutral-100 rounded-lg flex items-center justify-center mb-5">
                    <EnvelopeSimple size={20} weight="duotone" className="text-orange-500" />
                  </div>
                  <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                    Esqueceu a senha?
                  </h1>
                  <p className="text-neutral-500 text-[13px] mt-1.5 leading-relaxed">
                    Informe seu e-mail e enviaremos um link para redefinir sua senha.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.08em] mb-2">
                      E-mail da conta
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
                      placeholder="nome@empresa.com"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  >
                    Enviar link de recuperação
                    <ArrowRight size={16} weight="bold" />
                  </button>
                </form>
              </motion.div>

            /* ── Auth: Login / Register ── */
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {/* Tabs */}
                <div className="flex p-1 mb-10 bg-neutral-100 rounded-lg">
                  <button
                    onClick={() => { if (isRegistering) switchMode(); }}
                    className={`flex-1 py-2.5 text-[13px] font-semibold rounded-md transition-all ${
                      !isRegistering
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-transparent text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => { if (!isRegistering) switchMode(); }}
                    className={`flex-1 py-2.5 text-[13px] font-semibold rounded-md transition-all ${
                      isRegistering
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-transparent text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    Criar conta
                  </button>
                </div>

                {/* Heading */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isRegistering ? "register-h" : "login-h"}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="mb-8"
                  >
                    <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                      {isRegistering ? "Crie sua conta" : "Bem-vindo de volta"}
                    </h1>
                    <p className="text-neutral-400 text-[13px] mt-1.5">
                      {isRegistering
                        ? "Preencha os dados abaixo para começar."
                        : "Entre com suas credenciais para continuar."}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Google Button */}
                <div className="flex justify-center mb-6">
                  <button
                    type="button"
                    disabled
                    className="w-11 h-11 bg-neutral-50 border border-neutral-200 rounded-full flex items-center justify-center cursor-not-allowed hover:bg-neutral-100 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">ou</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.08em] mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
                      placeholder="nome@empresa.com"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.08em]">
                        Senha
                      </label>
                      {!isRegistering && (
                        <button
                          type="button"
                          onClick={() => { setResetEmail(email); setView("forgot"); }}
                          className="text-[11px] font-medium text-neutral-400 hover:text-orange-500 transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 px-3.5 pr-11 bg-neutral-50 border border-neutral-200 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start gap-2.5 text-red-500 bg-red-50 border border-red-200 p-3 rounded-md">
                          <WarningCircle size={16} weight="fill" className="mt-0.5 flex-shrink-0" />
                          <p className="text-[13px] leading-snug">{error}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 mt-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2.5 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {isRegistering ? "Criar conta" : "Entrar na conta"}
                        <ArrowRight size={16} weight="bold" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
                  <p className="text-neutral-400 text-[13px]">
                    {isRegistering ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
                    <button
                      onClick={switchMode}
                      className="text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                    >
                      {isRegistering ? "Entrar" : "Criar conta"}
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
