import React, { useState } from 'react';
import {
  Shield,
  Lock,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Key,
  Mail,
  User,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';
import { loginWithGoogle, loginWithGoogleRedirect, loginWithCredentials } from '../services/firebase';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Tabs: 'credentials' (Login direto sem Google) or 'google'
  const [activeTab, setActiveTab] = useState<'credentials' | 'google'>('credentials');

  // Credentials form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCredentialLoading, setIsCredentialLoading] = useState(false);

  // Google login state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showRedirectOption, setShowRedirectOption] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Por favor, preencha o usuário/e-mail e a senha.');
      return;
    }

    setIsCredentialLoading(true);
    setErrorMessage(null);

    try {
      await loginWithCredentials(identifier.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('[Auth] Erro no login direto:', error);
      setErrorMessage(error?.message || 'Falha ao autenticar. Verifique usuário e senha.');
    } finally {
      setIsCredentialLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setShowRedirectOption(false);

    try {
      await loginWithGoogle();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('[Auth] Erro no login Google:', error);
      setShowRedirectOption(true);

      if (error?.code === 'auth/popup-closed-by-user') {
        setErrorMessage(
          'A janela de autenticação do Google foi fechada antes de concluir. Você pode tentar novamente ou usar o login com usuário e senha.'
        );
      } else if (error?.code === 'auth/popup-blocked') {
        setErrorMessage(
          'O navegador bloqueou o popup do Google. Permita popups para este site ou utilize o login com usuário e senha direto.'
        );
      } else if (error?.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else if (error?.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          `O domínio atual (${window.location.hostname}) precisa ser adicionado na lista de Domínios Autorizados no Firebase Console.`
        );
      } else {
        setErrorMessage(error?.message || 'Falha ao autenticar com o Google. Tente novamente.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRedirectLogin = async () => {
    setIsRedirecting(true);
    setErrorMessage(null);
    try {
      await loginWithGoogleRedirect();
    } catch (err: any) {
      console.error('[Auth] Erro ao redirecionar para Google:', err);
      setErrorMessage(err?.message || 'Falha ao iniciar redirecionamento do Google.');
      setIsRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#0c1d5c_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-700/25 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-7 sm:p-9">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-200 text-white shadow-lg shadow-teal-700/20 mb-3.5 ring-4 ring-teal-50 relative">
              <img
                src="/logo-express.jpg"
                alt="Logo Sales e Dourado"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  const githubUrl =
                    'https://raw.githubusercontent.com/salesedouradosistema-star/Aso-Express---Sales-dOURADO/54ec3fb23e0b82b81222d2570162af8b93625324/logo-express.jpg';
                  if (target.src !== githubUrl && !target.dataset.triedGithub) {
                    target.dataset.triedGithub = 'true';
                    target.src = githubUrl;
                  } else {
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.login-logo-fallback');
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="login-logo-fallback hidden absolute inset-0 bg-gradient-to-br from-teal-600 to-teal-800 text-white items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Sales e Dourado
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-teal-700 mt-0.5">
              Medicina e Segurança do Trabalho
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Emissão e Gerenciamento de Atestados de Saúde Ocupacional (NR-7)
            </p>
          </div>

          {/* Login Mode Selector Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('credentials');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-teal-600" />
              <span>Login com Senha</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('google');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Conta Google</span>
            </button>
          </div>

          {/* Error Feedback */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: Password / Credentials Login */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleCredentialLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  E-mail ou Usuário de Acesso
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Digite seu usuário ou e-mail"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCredentialLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-700/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {isCredentialLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-slate-500">
                  Usuários e senhas são cadastrados pelos Administradores em "Permissões de Acesso".
                </span>
              </div>
            </form>
          )}

          {/* TAB 2: Google Authentication */}
          {activeTab === 'google' && (
            <div className="space-y-3.5">
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
                <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 block mb-0.5">
                    Acesso com Conta Google
                  </span>
                  Faça login com seu Gmail ou conta Google Workspace autorizada no sistema.
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isRedirecting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm shadow-xs hover:shadow transition-all duration-150 disabled:opacity-60 cursor-pointer group"
              >
                {isGoogleLoading ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span>Conectando ao Google...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span className="group-hover:text-slate-900">Entrar com o Google</span>
                  </>
                )}
              </button>

              {/* Direct Redirect Option (fallback) */}
              {showRedirectOption && (
                <button
                  type="button"
                  onClick={handleRedirectLogin}
                  disabled={isRedirecting || isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isRedirecting ? (
                    <div className="flex items-center gap-2 text-teal-700">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Redirecionando para o Google...</span>
                    </div>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
                      <span>Tentar Login Direto (Sem Popup)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-7 pt-5 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Ambiente Seguro com Banco de Dados na Nuvem
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
