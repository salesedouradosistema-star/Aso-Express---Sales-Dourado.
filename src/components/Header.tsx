import React from 'react';
import { Company, Doctor, SessionStats, JobRoleTemplate } from '../types';
import {
  Stethoscope,
  Building2,
  UserCheck,
  Briefcase,
  PlusCircle,
  History,
  FileText,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  Crown,
  Moon,
  Sun,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'attendance' | 'history' | 'preview';
  setActiveTab: (tab: 'attendance' | 'history' | 'preview') => void;
  activeCompany: Company;
  activeDoctor: Doctor;
  savedRoles?: JobRoleTemplate[];
  selectedRoleId?: string;
  onSelectRole?: (roleId: string) => void;
  stats: SessionStats;
  onOpenSettings: (tab?: 'company' | 'doctor' | 'roles' | 'timbrado') => void;
  onQuickDemoFill?: () => void;
  onNewAttendance?: () => void;
  isPrintMode?: boolean;
  isDbConnected?: boolean;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  currentUserPhoto?: string | null;
  isMasterAdmin?: boolean;
  onOpenAccessManagement?: () => void;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeCompany,
  activeDoctor,
  savedRoles = [],
  selectedRoleId = '',
  onSelectRole,
  stats,
  onOpenSettings,
  onQuickDemoFill,
  onNewAttendance,
  isPrintMode,
  isDbConnected = true,
  currentUserEmail,
  currentUserName,
  currentUserPhoto,
  isMasterAdmin = false,
  onOpenAccessManagement,
  onLogout,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  if (isPrintMode) return null;


  return (
    <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
      {/* Top Banner: Brand + User & Admin Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 gap-3">
          {/* Logo & System Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs shrink-0 relative">
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
                    const fallback = target.parentElement?.querySelector('.header-logo-fallback');
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="header-logo-fallback hidden absolute inset-0 bg-teal-600 text-white items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                Sales e Dourado
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Medicina Ocupacional
              </p>
            </div>
          </div>

          {/* User & Admin Controls */}
          <div className="flex items-center gap-2">
            {/* Access Management Module (Strictly for Master Admin) */}
            {isMasterAdmin && onOpenAccessManagement && (
              <button
                type="button"
                onClick={onOpenAccessManagement}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                title="Gerenciamento de permissões e e-mails autorizados (Exclusivo Administrador Master)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Permissões de Acesso</span>
                <span className="sm:hidden">Acessos</span>
              </button>
            )}

            {/* Botão de Alternância de Tema (Escuro / Claro) entre Permissões e Nome do Usuário */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 hover:border-slate-600'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={isDarkMode ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}
                aria-label={isDarkMode ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden md:inline">Modo Escuro</span>
                  </>
                )}
              </button>
            )}

            {/* Current Logged User Profile Chip + Logout */}
            {currentUserEmail && (
              <div className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 max-w-[150px] sm:max-w-[200px]"
                  title={`Conectado como: ${currentUserEmail} ${isMasterAdmin ? '(Administrador)' : '(Usuário Padrão)'}`}
                >
                  {currentUserPhoto ? (
                    <img
                      src={currentUserPhoto}
                      alt={currentUserName || currentUserEmail}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {(currentUserName || currentUserEmail).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {currentUserName || currentUserEmail.split('@')[0]}
                    </span>
                  </div>
                  {isMasterAdmin && (
                    <span title="Administrador Master">
                      <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                    </span>
                  )}
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
                    title="Sair / Desconectar da conta Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha Única: Empresa Ativa, Médico Examinador, Cadastro de Cargos (à esquerda) e Novo Atendimento, Histórico de ASOs, Exemplo Rápido (à direita) */}
      <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 py-2 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar py-0.5">
            {/* Bloco à Esquerda: Contextos Cadastrais */}
            <div className="flex items-center gap-2 shrink-0">
              {/* 1. Empresa Ativa */}
              <button
                type="button"
                onClick={() => onOpenSettings('company')}
                title={
                  activeCompany.name || activeCompany.fantasyName
                    ? `Empresa Ativa: ${activeCompany.fantasyName || activeCompany.name} (${activeCompany.cnpj || 'Sem CNPJ'}) - Clique para alterar`
                    : 'Empresa Ativa: Nenhuma cadastrada (Em branco) - Clique para preencher'
                }
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-teal-50/50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 transition-all text-left group cursor-pointer shadow-2xs h-10 min-w-[145px] max-w-[190px] shrink-0"
              >
                <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-900/40 group-hover:bg-teal-100 dark:group-hover:bg-teal-800/60 flex items-center justify-center shrink-0 transition-colors">
                  <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300 group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider truncate">
                    Empresa Ativa
                  </span>
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {activeCompany.fantasyName || activeCompany.name || 'Em branco'}
                  </span>
                </div>
              </button>

              {/* 2. Médico Examinador */}
              <button
                type="button"
                onClick={() => onOpenSettings('doctor')}
                title={
                  activeDoctor.name
                    ? `Médico: ${activeDoctor.name} (CRM ${activeDoctor.crm}/${activeDoctor.crmUf}) - Clique para alterar`
                    : 'Médico Examinador: Nenhum cadastrado (Em branco) - Clique para preencher'
                }
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-teal-50/50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 transition-all text-left group cursor-pointer shadow-2xs h-10 min-w-[145px] max-w-[190px] shrink-0"
              >
                <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-900/40 group-hover:bg-teal-100 dark:group-hover:bg-teal-800/60 flex items-center justify-center shrink-0 transition-colors">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300 group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider truncate">
                    Médico Examinador
                  </span>
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {activeDoctor.name || 'Em branco'}
                  </span>
                </div>
              </button>

              {/* 3. Cadastro de Cargos */}
              <button
                type="button"
                onClick={() => onOpenSettings('roles')}
                title="Cadastro de Cargos - Clique para cadastrar novo cargo ou gerenciar catálogo"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-teal-50/50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 transition-all text-left group cursor-pointer shadow-2xs h-10 min-w-[145px] max-w-[190px] shrink-0"
              >
                <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-900/40 group-hover:bg-teal-100 dark:group-hover:bg-teal-800/60 flex items-center justify-center shrink-0 transition-colors">
                  <Briefcase className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300 group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider truncate">
                    Cadastro de Cargos
                  </span>
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {savedRoles.length > 0
                      ? `${savedRoles.length} no catálogo`
                      : 'Nenhum cadastrado'}
                  </span>
                </div>
              </button>
            </div>

            {/* Bloco à Direita: Novo Atendimento, Histórico de ASOs, Exemplo Rápido */}
            <div className="flex items-center gap-2 ml-auto shrink-0 pl-2">
              {/* 4. Novo Atendimento */}
              <button
                type="button"
                onClick={() => {
                  if (onNewAttendance) {
                    onNewAttendance();
                  } else {
                    setActiveTab('attendance');
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer h-10 shrink-0 ${
                  activeTab === 'attendance'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Novo Atendimento
              </button>

              {/* 5. Histórico de ASOs */}
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer h-10 shrink-0 ${
                  activeTab === 'history'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Histórico de ASOs ({stats.total})
              </button>

              {/* Visualizar ASO (quando estiver em preview) */}
              {activeTab === 'preview' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold bg-teal-600 text-white shadow-xs cursor-pointer h-10 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Visualizar ASO (A4)
                </button>
              )}

              {/* 6. Exemplo Rápido */}
              {onQuickDemoFill && (
                <button
                  type="button"
                  onClick={onQuickDemoFill}
                  className="inline-flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100/80 dark:hover:bg-teal-900/50 px-3 rounded-lg border border-teal-200 dark:border-teal-800/80 transition-colors font-medium cursor-pointer h-10 shrink-0 shadow-2xs"
                  title="Preenche colaborador de teste para demonstração rápida"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Exemplo Rápido
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
