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
} from 'lucide-react';
import {
  subscribeToAuthorizedUsers,
  addAuthorizedUser,
  removeAuthorizedUser,
  normalizeEmail,
} from '../services/firebase';
import { AuthorizedUser, MASTER_ADMIN_EMAIL } from '../types';

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
}

export const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [usersList, setUsersList] = useState<AuthorizedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
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

  // Extra safety check: only master admin can see and use this modal
  const isMaster = normalizeEmail(currentUserEmail) === normalizeEmail(MASTER_ADMIN_EMAIL);
  if (!isMaster) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-xl">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Acesso Restrito</h3>
          <p className="text-xs text-slate-600 mt-2 mb-4">
            Apenas o e-mail administrador master ({MASTER_ADMIN_EMAIL}) possui autorização para gerenciar permissões de acesso.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
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

    const cleanEmail = normalizeEmail(newEmail);
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (cleanEmail === normalizeEmail(MASTER_ADMIN_EMAIL)) {
      setErrorMessage('Este e-mail é o Administrador Master permanente do sistema.');
      return;
    }

    // Check if already in list
    const alreadyExists = usersList.some((u) => normalizeEmail(u.email) === cleanEmail);
    if (alreadyExists) {
      setErrorMessage('Este e-mail já possui permissão de acesso cadastrada.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAuthorizedUser(cleanEmail, newName, newNotes, currentUserEmail);
      setSuccessMessage(`E-mail ${cleanEmail} autorizado com sucesso!`);
      setNewEmail('');
      setNewName('');
      setNewNotes('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[Auth] Erro ao adicionar e-mail:', err);
      setErrorMessage(err?.message || 'Falha ao salvar permissão no banco de dados.');
    } finally {
      setIsSubmitting(false);
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
      setSuccessMessage(`Permissão de ${user.email} revogada com sucesso.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('[Auth] Erro ao remover e-mail:', err);
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Gerenciamento de Permissões de Acesso
              </h2>
              <p className="text-xs text-slate-500">
                Módulo exclusivo do Administrador Master para cadastrar e revogar acessos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Master Admin Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {MASTER_ADMIN_EMAIL}
                  </span>
                  <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                    Proprietário Master
                  </span>
                </div>
                <div className="text-[11px] text-amber-900/80 mt-0.5">
                  Acesso irrestrito permanente. Único usuário com permissão de gerenciar acessos.
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form to Add New User */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-teal-600" />
              Cadastrar Nova Permissão de E-mail
            </h3>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    E-mail do Google (Gmail ou Google Workspace) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="exemplo@gmail.com"
                      className="w-full pl-8.5 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nome / Cargo / Identificação
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Dra. Ana / Médico Examinador"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Unidade Centro / Plantonista"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Salvando no Banco...' : 'Autorizar E-mail'}
                </button>
              </div>
            </form>
          </div>

          {/* List of Authorized Users */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  E-mails Autorizados no Sistema
                </h3>
                <span className="text-[11px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                  {usersList.length} cadastrado{usersList.length !== 1 ? 's' : ''}
                </span>
              </div>
              {usersList.length > 3 && (
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Filtrar por e-mail ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              )}
            </div>

            {usersList.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">
                  Nenhum usuário adicional cadastrado ainda
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cadastre acima os e-mails do Google dos colaboradores autorizados a emitir ASOs.
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
                Nenhum e-mail encontrado com o termo informado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {user.email}
                        </span>
                        {user.name && (
                          <span className="text-[11px] font-medium text-slate-600 truncate bg-slate-100 px-2 py-0.5 rounded">
                            {user.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                        <span>
                          Autorizado em:{' '}
                          {new Date(user.addedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        {user.notes && (
                          <span className="text-slate-500 italic truncate max-w-xs">
                            • {user.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user)}
                      disabled={deletingId === user.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title={`Revogar acesso de ${user.email}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Alterações são sincronizadas imediatamente no banco de dados.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
