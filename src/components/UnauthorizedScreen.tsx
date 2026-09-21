import React, { useState } from 'react';
import { ShieldAlert, LogOut, RefreshCw, Mail, UserCheck, AlertTriangle } from 'lucide-react';
import { logoutUser } from '../services/firebase';
import { MASTER_ADMIN_EMAIL } from '../types';

interface UnauthorizedScreenProps {
  userEmail: string;
  userName?: string | null;
  userPhoto?: string | null;
  onRecheck: () => void;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({
  userEmail,
  userName,
  userPhoto,
  onRecheck,
}) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleRecheck = async () => {
    setIsChecking(true);
    try {
      await onRecheck();
    } finally {
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-8 sm:p-10 text-center">
          {/* Warning Icon Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm mb-5">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Acesso Não Autorizado
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sales & Dourado Medicina e Segurança do Trabalho
          </p>

          {/* Current User Card */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left flex items-center gap-3.5">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={userName || userEmail}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border border-slate-300 object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-base shrink-0">
                {(userName || userEmail || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 truncate">
                {userName || 'Usuário Google'}
              </div>
              <div className="text-xs text-slate-600 font-mono truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{userEmail}</span>
              </div>
              <div className="mt-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                  <AlertTriangle className="w-3 h-3" />
                  E-mail sem permissão ativa
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Explanation */}
          <div className="text-xs sm:text-sm text-slate-600 space-y-2 text-left bg-amber-50/60 p-4 rounded-xl border border-amber-200/70 mb-6">
            <p className="font-semibold text-amber-950 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-700" />
              Como liberar seu acesso?
            </p>
            <p className="leading-relaxed">
              Sua conta Google foi autenticada, porém este e-mail ainda não está cadastrado na lista de acessos autorizados do sistema.
            </p>
            <p className="leading-relaxed">
              Solicite a autorização ao administrador master através do e-mail:
              <br />
              <strong className="font-mono text-slate-800 bg-amber-100/80 px-1.5 py-0.5 rounded text-[11px] select-all inline-block mt-1">
                {MASTER_ADMIN_EMAIL}
              </strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleRecheck}
              disabled={isChecking}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Verificando...' : 'Verificar Novamente'}
            </button>
            <button
              type="button"
              onClick={() => logoutUser()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs sm:text-sm border border-slate-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
              Trocar de Conta / Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
