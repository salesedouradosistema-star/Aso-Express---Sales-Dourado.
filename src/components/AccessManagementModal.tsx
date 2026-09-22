import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  X,
  Search,
  Mail,
  Crown,
  CheckCircle2,
  AlertCircle,
  Users,
  Key,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Edit3,
} from 'lucide-react';
import {
  subscribeToAuthorizedUsers,
  addAuthorizedUser,
  removeAuthorizedUser,
  updateUserPassword,
  normalizeEmail,
} from '../services/firebase';
import { AuthorizedUser, MASTER_ADMIN_EMAIL } from '../types';

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
  currentUserRole?: 'admin' | 'user';
}

export const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  currentUserRole = 'admin',
}) => {
  const [usersList, setUsersList] = useState<AuthorizedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Mode: 'password' (Login Direto sem Google) or 'google' (E-mail Google)
  const [registerMode, setRegisterMode] = useState<'password' | 'google'>('password');

  // Form Fields
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newNotes, setNewNotes] = useState('');

  // Password editing sub-state
  const [editingPasswordUser, setEditingPasswordUser] = useState<AuthorizedUser | null>(null);
  const [updatedPasswordValue, setUpdatedPasswordValue] = useState('');
  const [showUpdatedPassword, setShowUpdatedPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Real-time synchronization of authorized users
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAuthorizedUsers((list) => {
      setUsersList(list);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  // Authorization check: strictly salesedourado (master admin)
  const isMaster = normalizeEmail(currentUserEmail) === normalizeEmail(MASTER_ADMIN_EMAIL);

  if (!isMaster) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full text-center shadow-xl border border-slate-200 dark:border-slate-700">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Acesso Exclusivo</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-4 leading-relaxed">
            Apenas a conta administradora da Sales e Dourado ({MASTER_ADMIN_EMAIL}) possui permissão para gerenciar cadastros e permissões de acesso.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanIdentifier = normalizeEmail(newIdentifier);
    if (!cleanIdentifier) {
      setErrorMessage('Por favor, informe o e-mail ou nome de usuário de acesso.');
      return;
    }

    if (cleanIdentifier === normalizeEmail(MASTER_ADMIN_EMAIL)) {
      setErrorMessage('Este e-mail é o Administrador Master permanente do sistema.');
      return;
    }

    // Validation for password mode
    if (registerMode === 'password') {
      if (!newPassword || newPassword.length < 6) {
        setErrorMessage('A senha de acesso deve possuir pelo menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('A confirmação de senha não confere com a senha digitada.');
        return;
      }
    } else {
      // Google mode validation
      if (!cleanIdentifier.includes('@') || !cleanIdentifier.includes('.')) {
        setErrorMessage('Para autenticação Google, informe um e-mail válido (ex: usuario@gmail.com).');
        return;
      }
    }

    // Check if already in list
    const alreadyExists = usersList.some((u) => normalizeEmail(u.email) === cleanIdentifier);
    if (alreadyExists) {
      setErrorMessage('Este usuário/e-mail já possui cadastro no sistema.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAuthorizedUser(
        cleanIdentifier,
        newName,
        newNotes,
        currentUserEmail,
        'user', // Always standard user ("todas as contas sera usuario padrão e apenas a salesedourado como administradora")
        registerMode === 'password' ? newPassword : '',
        registerMode === 'password' ? 'password' : 'google'
      );

      const modeLabel = registerMode === 'password' ? 'Login direto com senha' : 'Conta Google';
      setSuccessMessage(`Usuário "${cleanIdentifier}" cadastrado com sucesso como Usuário Padrão (${modeLabel})!`);

      // Reset form
      setNewIdentifier('');
      setNewName('');
      setNewPassword('');
      setConfirmPassword('');
      setNewNotes('');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('[Auth] Erro ao cadastrar usuário:', err);
      setErrorMessage(err?.message || 'Falha ao salvar usuário no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordUser) return;
    if (!updatedPasswordValue || updatedPasswordValue.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsUpdatingPassword(true);
    setErrorMessage(null);
    try {
      await updateUserPassword(editingPasswordUser.id, updatedPasswordValue);
      setSuccessMessage(`Senha de "${editingPasswordUser.name || editingPasswordUser.email}" alterada com sucesso!`);
      setEditingPasswordUser(null);
      setUpdatedPasswordValue('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao atualizar senha.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRemoveUser = async (user: AuthorizedUser) => {
    if (normalizeEmail(user.email) === normalizeEmail(MASTER_ADMIN_EMAIL)) {
      alert('O Administrador Master não pode ser removido.');
      return;
    }

    const confirmRemove = window.confirm(
      `Deseja realmente revogar o acesso do usuário "${user.name ? `${user.name} (${user.email})` : user.email}"? Esta pessoa não poderá mais acessar o sistema.`
    );
    if (!confirmRemove) return;

    setDeletingId(user.id);
    try {
      await removeAuthorizedUser(user.id);
      setSuccessMessage(`Acesso de ${user.email} revogado com sucesso.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('[Auth] Erro ao remover usuário:', err);
      setErrorMessage(err?.message || 'Falha ao revogar permissão.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.notes && u.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Permissões de Acesso e Cadastro de Usuários
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre novos usuários com login direto (sem Google) ou autorize e-mails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {/* Master Admin Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-amber-200 font-mono">
                    {MASTER_ADMIN_EMAIL}
                  </span>
                  <span className="text-[10px] font-semibold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    Administrador do Sistema
                  </span>
                </div>
                <div className="text-[11px] text-amber-900/80 dark:text-amber-400/80 mt-0.5">
                  Conta administradora exclusiva com acesso irrestrito ao sistema e controle de permissões. Todas as demais contas operam como Usuário Padrão.
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form to Add New User */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-4.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Cadastrar Novo Usuário
              </h3>

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-700/60 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setRegisterMode('password')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    registerMode === 'password'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Login com Senha (sem Google)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterMode('google')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    registerMode === 'google'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Conta Google</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Identifier: Email / Username */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {registerMode === 'password' ? 'E-mail ou Usuário de Acesso *' : 'E-mail do Google (Gmail ou Workspace) *'}
                  </label>
                  <div className="relative">
                    {registerMode === 'password' ? (
                      <Key className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    ) : (
                      <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    )}
                    <input
                      type={registerMode === 'google' ? 'email' : 'text'}
                      required
                      value={newIdentifier}
                      onChange={(e) => setNewIdentifier(e.target.value)}
                      placeholder={registerMode === 'password' ? 'Ex: usuario@clinica.com ou roberto' : 'exemplo@gmail.com'}
                      className="w-full pl-8.5 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo do Colaborador *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Dra. Ana Paula / Dr. Carlos"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Password Fields (when password mode is active) */}
              {registerMode === 'password' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Senha de Acesso (Mínimo 6 dígitos) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        className="w-full pl-8.5 pr-9 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirmar Senha de Acesso *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        className="w-full pl-8.5 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Observações / Unidade */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Unidade de Atendimento (Opcional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Médico Examinador / Unidade Centro / Recepção"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Salvando no Banco...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>

          {/* Edit Password Modal / Inline Box */}
          {editingPasswordUser && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-700" />
                  Alterar Senha de {editingPasswordUser.name || editingPasswordUser.email}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingPasswordUser(null)}
                  className="text-amber-800 hover:text-amber-950 dark:hover:text-amber-100 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <form onSubmit={handleUpdatePassword} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type={showUpdatedPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={updatedPasswordValue}
                    onChange={(e) => setUpdatedPasswordValue(e.target.value)}
                    placeholder="Nova senha (mínimo 6 dígitos)"
                    className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-amber-300 bg-white dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUpdatedPassword(!showUpdatedPassword)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showUpdatedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {isUpdatingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </form>
            </div>
          )}

          {/* List of Registered Users */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Usuários e Acessos Cadastrados
                </h3>
                <span className="text-[11px] font-semibold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full">
                  {usersList.length} cadastrado{usersList.length !== 1 ? 's' : ''}
                </span>
              </div>
              {usersList.length > 2 && (
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Filtrar por e-mail ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {usersList.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nenhum usuário adicional cadastrado ainda
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Cadastre acima novos usuários com senha ou autorize e-mails Google para emitir ASOs.
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
                Nenhum usuário encontrado com o termo informado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                {filteredUsers.map((user) => {
                  const isPasswordLogin = user.authProvider === 'password' || !!user.password;

                  return (
                    <div
                      key={user.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                            {user.email}
                          </span>

                          {user.name && (
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {user.name}
                            </span>
                          )}

                          {/* Role Badge */}
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3 text-teal-600" />
                            Usuário Padrão
                          </span>

                          {/* Login Method Badge */}
                          {isPasswordLogin ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60 px-2 py-0.5 rounded-full" title="Login com usuário e senha direto">
                              <Key className="w-3 h-3 text-teal-600" />
                              Senha Direta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 px-2 py-0.5 rounded-full" title="Login autenticado via Google">
                              <Mail className="w-3 h-3 text-blue-600" />
                              Conta Google
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                          <span>
                            Cadastrado em:{' '}
                            {new Date(user.addedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                          {user.notes && (
                            <span className="text-slate-500 dark:text-slate-400 italic truncate max-w-xs">
                              • {user.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isPasswordLogin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPasswordUser(user);
                              setUpdatedPasswordValue('');
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                            title={`Alterar senha de ${user.email}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user)}
                          disabled={deletingId === user.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title={`Revogar acesso de ${user.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Alterações são sincronizadas imediatamente na nuvem.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
