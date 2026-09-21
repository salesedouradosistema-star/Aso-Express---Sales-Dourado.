import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { loginWithGoogle, loginWithGoogleRedirect } from '../services/firebase';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRedirectOption, setShowRedirectOption] = useState<boolean>(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
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
          'A janela de autenticação do Google foi fechada antes de concluir. Você pode tentar novamente ou usar o login direto abaixo.'
        );
      } else if (error?.code === 'auth/popup-blocked') {
        setErrorMessage(
          'O navegador bloqueou a janela de login. Por favor, permita popups para este site ou utilize o login direto abaixo.'
        );
      } else if (error?.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else if (error?.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          `O domínio atual (${window.location.hostname}) precisa ser adicionado na lista de Domínios Autorizados no Firebase Console (Authentication > Configurações > Domínios Autorizados).`
        );
      } else {
        setErrorMessage(error?.message || 'Falha ao autenticar com o Google. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
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
      {/* Subtle Background Accent */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#0c1d5c_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-700/25 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-8 sm:p-10">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-200 text-white shadow-lg shadow-teal-700/20 mb-4 ring-4 ring-teal-50 relative">
              <img
                src="/logo-express.jpg"
                alt="Logo Sales e Dourado"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  const githubUrl = "https://raw.githubusercontent.com/salesedouradosistema-star/Aso-Express---Sales-dOURADO/54ec3fb23e0b82b81222d2570162af8b93625324/logo-express.jpg";
                  if (target.src !== githubUrl && !target.dataset.triedGithub) {
                    target.dataset.triedGithub = "true";
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Sales e Dourado
            </h1>
            <p className="text-sm font-medium text-teal-700 mt-1">
              Medicina e Segurança do Trabalho
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Emissão de Atestados de Saúde Ocupacional em Conformidade com a NR-7
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 mb-6 text-xs text-slate-600 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 block mb-0.5">
                Acesso Restrito e Seguro
              </span>
              O acesso a esta aplicação é restrito a e-mails previamente autorizados via autenticação oficial Google.
            </div>
          </div>

          {/* Error Feedback */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Google Sign-in Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || isRedirecting}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm shadow-sm hover:shadow transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span>Conectando ao Google...</span>
                </div>
              ) : (
                <>
                  {/* Official Google G Icon */}
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

            {/* Fallback Direct Redirect Option (No Popup, immune to popup blockers) */}
            {showRedirectOption && (
              <button
                type="button"
                onClick={handleRedirectLogin}
                disabled={isRedirecting || isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                {isRedirecting ? (
                  <div className="flex items-center gap-2 text-teal-700">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Redirecionando para o Google...</span>
                  </div>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tentar Login Direto (Redirecionamento sem Popup)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
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
