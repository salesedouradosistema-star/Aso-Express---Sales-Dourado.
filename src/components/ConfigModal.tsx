import React, { useState, useEffect } from 'react';
import { Company, Doctor, TimbradoConfig, JobRoleTemplate } from '../types';
import { maskCNPJ, maskPhone } from '../utils/formatters';
import {
  X,
  Building2,
  UserCheck,
  Briefcase,
  Plus,
  Trash2,
  Save,
  Check,
  FileText,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  deleteCompanyFromList,
  getTimbradoConfig,
  setTimbradoConfig,
  DEFAULT_TIMBRADO_URL,
  REMOTE_TIMBRADO_FALLBACK,
} from '../services/storageService';
import { RoleManagerTab } from './RoleManagerTab';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompany: Company;
  setActiveCompany: (c: Company) => void;
  savedCompanies: Company[];
  activeDoctor: Doctor;
  setActiveDoctor: (d: Doctor) => void;
  issueCity: string;
  setIssueCity: (city: string) => void;
  initialTab?: 'company' | 'doctor' | 'roles' | 'timbrado';
  onRoleSelected?: (role: JobRoleTemplate) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  activeCompany,
  setActiveCompany,
  savedCompanies,
  activeDoctor,
  setActiveDoctor,
  issueCity,
  setIssueCity,
  initialTab = 'company',
  onRoleSelected,
}) => {
  const [tab, setTab] = useState<'company' | 'doctor' | 'roles' | 'timbrado'>(initialTab);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setTab(initialTab);
      }
      setCompanyForm({ ...activeCompany });
      setDoctorForm({ ...activeDoctor });
      setCityInput(issueCity);
    }
  }, [isOpen, initialTab, activeCompany, activeDoctor, issueCity]);

  // Company Form State
  const [companyForm, setCompanyForm] = useState<Company>({ ...activeCompany });
  const [isCreatingNewCompany, setIsCreatingNewCompany] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState('');

  // Doctor Form State
  const [doctorForm, setDoctorForm] = useState<Doctor>({ ...activeDoctor });

  // Timbrado State
  const [timbradoForm, setTimbradoForm] = useState<TimbradoConfig>(getTimbradoConfig);

  // City state
  const [cityInput, setCityInput] = useState(issueCity);
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string; name: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim()) return;
    const finalCompany: Company = {
      ...companyForm,
      id: isCreatingNewCompany ? `comp-${Date.now()}` : companyForm.id,
    };
    setActiveCompany(finalCompany);
    setIsCreatingNewCompany(false);
    showNotice('Empresa contratante salva com sucesso!');
  };

  const handleSelectExistingCompany = (company: Company) => {
    setCompanyForm({ ...company });
    setActiveCompany(company);
    setIsCreatingNewCompany(false);
    showNotice(`Empresa ativa alternada para "${company.fantasyName || company.name}"`);
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.name.trim() || !doctorForm.crm.trim()) return;
    setActiveDoctor(doctorForm);
    setIssueCity(cityInput);
    showNotice('Dados do médico examinador atualizados!');
  };

  const showNotice = (msg: string) => {
    setSavedSuccessMsg(msg);
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] transition-all cursor-default ${tab === 'roles' ? 'max-w-4xl' : 'max-w-2xl'}`}
      >
        
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Configurações da Sessão e Dados Fixos
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500">
                Defina os dados da empresa cliente, médico e cargos para preenchimento automático.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Banco de Dados Conectado
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar configurações (Esc)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer text-xs font-semibold"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Fechar</span>
          </button>
        </div>

        {/* Success toast notification */}
        {savedSuccessMsg && (
          <div className="shrink-0 mx-6 mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            {savedSuccessMsg}
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="shrink-0 flex border-b border-slate-200 px-6 bg-slate-50/40 overflow-x-auto">
          <button
            onClick={() => setTab('company')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              tab === 'company'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empresa Contratante
          </button>
          <button
            onClick={() => setTab('doctor')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              tab === 'doctor'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Médico Examinador
          </button>
          <button
            onClick={() => setTab('roles')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              tab === 'roles'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Cargos & Funções (NR-7)
          </button>
          <button
            onClick={() => setTab('timbrado')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              tab === 'timbrado'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Papel Timbrado
          </button>
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="overflow-y-auto flex-1 min-h-0">

        {/* Tab 1: Company Configuration */}
        {tab === 'company' && (
          <div className="p-6 space-y-5">
            {/* Quick selector of saved companies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Empresas Salvas ({savedCompanies.length})
                </label>
                {!isCreatingNewCompany && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCompany(true);
                      setCompanyForm({
                        id: `comp-${Date.now()}`,
                        name: '',
                        fantasyName: '',
                        cnpj: '',
                        address: '',
                        responsible: '',
                        cnae: '',
                        riskGrade: '2',
                        phone: '',
                        email: '',
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Cadastrar Nova Empresa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {savedCompanies.length === 0 ? (
                  <div className="col-span-1 sm:col-span-2 p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Nenhuma empresa cadastrada no catálogo. Preencha os campos abaixo para cadastrar a primeira empresa.
                  </div>
                ) : (
                  savedCompanies.map((c) => {
                    const isSelected = activeCompany.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectExistingCompany(c)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/60 ring-1 ring-teal-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {c.fantasyName || c.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            CNPJ: {c.cnpj} • GR: {c.riskGrade === 'indeterminado' ? 'Indeterminado' : c.riskGrade === 'em_branco' ? 'Manuscrito' : `Grau ${c.riskGrade || '2'}`}
                          </p>
                          {isSelected && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-teal-700 bg-teal-100/70 px-1.5 py-0.5 rounded">
                              Ativa no momento
                            </span>
                          )}
                        </div>
                        {savedCompanies.length > 1 && !isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompanyToDelete({ id: c.id, name: c.fantasyName || c.name });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Excluir empresa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Edit / New Company Form */}
            <form onSubmit={handleSaveCompany} className="space-y-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {isCreatingNewCompany ? 'Nova Empresa Cliente' : 'Editar Dados da Empresa Ativa'}
                </h4>
                {isCreatingNewCompany && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCompany(false);
                      setCompanyForm({ ...activeCompany });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Ex: Indústria Metalúrgica Progresso S/A"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={companyForm.fantasyName || ''}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, fantasyName: e.target.value })
                    }
                    placeholder="Ex: Metalúrgica Progresso"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.cnpj}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, cnpj: maskCNPJ(e.target.value) })
                    }
                    placeholder="00.000.000/0000-00"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, address: e.target.value })
                    }
                    placeholder="Rua, número, bairro, cidade - UF, CEP"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsável / Contato
                  </label>
                  <input
                    type="text"
                    value={companyForm.responsible}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, responsible: e.target.value })
                    }
                    placeholder="Ex: Mariana Silveira (Gerente de RH)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CNAE (NR-7)
                    </label>
                    <input
                      type="text"
                      value={companyForm.cnae || ''}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, cnae: e.target.value })
                      }
                      placeholder="Ex: 25.39-0-01"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Grau de Risco
                    </label>
                    <select
                      value={companyForm.riskGrade || '2'}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, riskGrade: e.target.value })
                      }
                      className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="1">Grau 1 (Mínimo)</option>
                      <option value="2">Grau 2 (Médio)</option>
                      <option value="3">Grau 3 (Alto)</option>
                      <option value="4">Grau 4 (Máximo)</option>
                      <option value="indeterminado">Grau de risco - indeterminado</option>
                      <option value="em_branco">Em branco (preenchimento no papel)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar e Definir como Ativa
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Doctor Configuration */}
        {tab === 'doctor' && (
          <form onSubmit={handleSaveDoctor} className="p-6 space-y-4">
            <p className="text-xs text-slate-500 mb-3">
              Estes dados serão injetados automaticamente no rodapé e no carimbo digital de todos os ASOs emitidos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Médico *
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  placeholder="Ex: Dr. Roberto Martins de Castro"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CRM *
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.crm}
                  onChange={(e) => setDoctorForm({ ...doctorForm, crm: e.target.value })}
                  placeholder="Ex: 124.580"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UF do CRM *
                </label>
                <select
                  value={doctorForm.crmUf}
                  onChange={(e) => setDoctorForm({ ...doctorForm, crmUf: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecione...</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Especialidade Médica
                </label>
                <input
                  type="text"
                  value={doctorForm.specialty}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  placeholder="Ex: Medicina do Trabalho"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RQE (Registro de Qualificação)
                </label>
                <input
                  type="text"
                  value={doctorForm.rqe || ''}
                  onChange={(e) => setDoctorForm({ ...doctorForm, rqe: e.target.value })}
                  placeholder="Ex: 38.412"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cidade Padrão da Emissão (A4)
                </label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Ex: Campinas - SP"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone para Contato
                </label>
                <input
                  type="text"
                  value={doctorForm.phone || ''}
                  onChange={(e) =>
                    setDoctorForm({ ...doctorForm, phone: maskPhone(e.target.value) })
                  }
                  placeholder="(00) 00000-0000"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Perfil do Médico
              </button>
            </div>
          </form>
        )}

        {/* Tab: Cargos & Funções (NR-7) */}
        {tab === 'roles' && (
          <RoleManagerTab
            onRoleSelected={(role) => {
              if (onRoleSelected) {
                onRoleSelected(role);
              }
            }}
            onNotice={showNotice}
          />
        )}

        {/* Tab 3: Papel Timbrado de Fundo */}
        {tab === 'timbrado' && (
          <div className="p-6 space-y-5 text-xs text-slate-600">
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-900 font-bold mb-1 text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                Papel Timbrado Oficial: Sales & Dourado Medicina e Segurança do Trabalho
              </div>
              <p className="text-slate-600 leading-relaxed">
                A imagem oficial do papel timbrado da <strong>Sales & Dourado</strong> foi integrada como plano de fundo de todos os Atestados de Saúde Ocupacional (1ª e 2ª via) e documentos gerados.
              </p>
            </div>

            {/* Timbrado Switch and Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    Status do Timbrado nos Documentos
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Quando ativo, os ASOs serão impressos ou salvos em PDF com o cabeçalho, rodapé e marca oficial Sales & Dourado.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timbradoForm.enabled}
                    onChange={(e) => {
                      const updated = { ...timbradoForm, enabled: e.target.checked };
                      setTimbradoForm(updated);
                      setTimbradoConfig(updated);
                      setSavedSuccessMsg('Configuração do papel timbrado atualizada com sucesso!');
                      setTimeout(() => setSavedSuccessMsg(''), 4000);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {/* Preview Box */}
              <div className="pt-2">
                <span className="block font-bold text-slate-700 mb-2">
                  Pré-visualização do Papel Timbrado:
                </span>
                <div className="max-w-[280px] mx-auto border-2 border-slate-300 rounded-lg overflow-hidden shadow-md relative bg-white aspect-[1/1.414] max-h-[380px] flex items-center justify-center">
                  <img
                    src={timbradoForm.imageUrl || DEFAULT_TIMBRADO_URL}
                    alt="Papel Timbrado Sales & Dourado"
                    className="w-full h-full object-contain pointer-events-none"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (e.currentTarget.src !== REMOTE_TIMBRADO_FALLBACK) {
                        e.currentTarget.src = REMOTE_TIMBRADO_FALLBACK;
                      }
                    }}
                  />
                  {!timbradoForm.enabled && (
                    <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white p-4 text-center">
                      <span className="font-bold text-sm">Timbrado Desativado</span>
                      <span className="text-xs text-slate-200 mt-1">Os documentos serão impressos em fundo branco comum.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Arquivo: <code className="font-mono text-slate-700">/public/timbrado.jpg</code> (1241 × 1754 px - A4)</span>
                <button
                  type="button"
                  onClick={() => {
                    const reset = {
                      enabled: true,
                      imageUrl: DEFAULT_TIMBRADO_URL,
                      clinicName: 'Sales & Dourado Medicina e Segurança do Trabalho',
                    };
                    setTimbradoForm(reset);
                    setTimbradoConfig(reset);
                    setSavedSuccessMsg('Papel timbrado padrão restaurado!');
                    setTimeout(() => setSavedSuccessMsg(''), 4000);
                  }}
                  className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Redefinir Padrão
                </button>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* Modal Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">Esc</kbd> ou clique fora para fechar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            Fechar Janela
          </button>
        </div>
      </div>

      {/* In-app Company Delete Confirmation Modal (no confirm()) */}
      {companyToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Excluir Empresa</h4>
                <p className="text-xs text-slate-500">Remover da lista de empresas salvas.</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              Deseja realmente remover a empresa <strong className="font-semibold text-slate-900">"{companyToDelete.name}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCompanyFromList(companyToDelete.id);
                  setCompanyToDelete(null);
                  showNotice(`Empresa "${companyToDelete.name}" removida.`);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
