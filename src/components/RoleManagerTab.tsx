import React, { useState } from 'react';
import { JobRoleTemplate, OccupationalRisks, QuestionnaireCategory, QuestionnaireQuestion } from '../types';
import {
  OCCUPATIONAL_RISK_CATEGORIES,
} from '../data/riskDefinitions';
import {
  DEFAULT_RISKS,
  getFreshQuestionnaireCategories,
} from '../data/defaultData';
import {
  getSavedJobRoles,
  saveJobRole,
  deleteJobRole,
} from '../services/storageService';
import {
  Briefcase,
  Plus,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  ClipboardList,
  Sparkles,
  CheckSquare,
  Square,
  ArrowLeft,
  Info,
  Tag,
} from 'lucide-react';

interface RoleManagerTabProps {
  onRoleSelected?: (role: JobRoleTemplate) => void;
  onNotice: (msg: string) => void;
}

const COMMON_COMPLEMENTARY_EXAMS = [
  'Audiometria Tonal Ocupacional',
  'Acuidade Visual (Snellen)',
  'Espirometria Ocupacional',
  'Raio-X de Tórax OIT',
  'Eletrocardiograma (ECG)',
  'Eletroencefalograma (EEG)',
  'Glicemia de Jejum',
  'Hemograma Completo',
  'Avaliação Psicossocial',
];

export const RoleManagerTab: React.FC<RoleManagerTabProps> = ({
  onRoleSelected,
  onNotice,
}) => {
  const [roles, setRoles] = useState<JobRoleTemplate[]>(getSavedJobRoles);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentRoleId, setCurrentRoleId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form states for creating / editing a role
  const [formName, setFormName] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formCBO, setFormCBO] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRisks, setFormRisks] = useState<OccupationalRisks>({ ...DEFAULT_RISKS });
  const [formQuestionnaire, setFormQuestionnaire] = useState<QuestionnaireCategory[]>(
    getFreshQuestionnaireCategories
  );
  const [formExams, setFormExams] = useState<string[]>([]);
  const [customExamInput, setCustomExamInput] = useState('');
  const [newRoleQuestionText, setNewRoleQuestionText] = useState('');
  const [targetCategoryOption, setTargetCategoryOption] = useState<'role_specific' | 'existing' | 'new_cat'>('role_specific');
  const [chosenExistingCatId, setChosenExistingCatId] = useState<string>('antecedentes');
  const [customNewCatTitle, setCustomNewCatTitle] = useState('');
  const [newHasDetail, setNewHasDetail] = useState(false);
  const [newDetailLabel, setNewDetailLabel] = useState('Especificar:');
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  const reloadRoles = () => {
    setRoles(getSavedJobRoles());
  };

  const handleStartNewRole = () => {
    setCurrentRoleId(null);
    setFormName('');
    setFormDepartment('');
    setFormCBO('');
    setFormDescription('');
    setFormRisks({ ...DEFAULT_RISKS });
    setFormQuestionnaire(getFreshQuestionnaireCategories());
    setFormExams([]);
    setCustomExamInput('');
    setNewRoleQuestionText('');
    setTargetCategoryOption('role_specific');
    setChosenExistingCatId('antecedentes');
    setCustomNewCatTitle('');
    setNewHasDetail(false);
    setNewDetailLabel('Especificar:');
    setFeedbackNotice('');
    setFormError('');
    setExpandedCatId(null);
    setIsEditing(true);
  };

  const handleStartEditRole = (role: JobRoleTemplate) => {
    setCurrentRoleId(role.id);
    setFormName(role.name);
    setFormDepartment(role.department || '');
    setFormCBO(role.cbo || '');
    setFormDescription(role.description || '');
    setFormRisks({ ...role.risks });
    setFormQuestionnaire(
      role.questionnaireCategories && role.questionnaireCategories.length > 0
        ? JSON.parse(JSON.stringify(role.questionnaireCategories))
        : getFreshQuestionnaireCategories()
    );
    setFormExams(role.complementaryExams || []);
    setCustomExamInput('');
    setNewRoleQuestionText('');
    setTargetCategoryOption('role_specific');
    setChosenExistingCatId('antecedentes');
    setCustomNewCatTitle('');
    setNewHasDetail(false);
    setNewDetailLabel('Especificar:');
    setFeedbackNotice('');
    setFormError('');
    setExpandedCatId(null);
    setIsEditing(true);
  };

  const handleDuplicateRole = (role: JobRoleTemplate) => {
    const duplicated: JobRoleTemplate = {
      ...role,
      id: `role-${Date.now()}`,
      name: `${role.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveJobRole(duplicated);
    reloadRoles();
    onNotice(`Cargo "${duplicated.name}" duplicado com sucesso!`);
  };

  const handleDeleteRole = (id: string, name: string) => {
    setRoleToDelete({ id, name });
  };

  const confirmDeleteRole = () => {
    if (roleToDelete) {
      deleteJobRole(roleToDelete.id);
      reloadRoles();
      onNotice(`Cargo "${roleToDelete.name}" excluído.`);
      setRoleToDelete(null);
    }
  };

  // Subtopics toggle
  const toggleSubTopic = (
    catKey: 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'accidental' | 'psychosocial',
    subItemsKey: 'physicalSubItems' | 'chemicalSubItems' | 'biologicalSubItems' | 'ergonomicSubItems' | 'accidentalSubItems' | 'psychosocialSubItems',
    subTopic: string
  ) => {
    setFormRisks((prev) => {
      const currentList = (prev[subItemsKey] as string[]) || [];
      const exists = currentList.includes(subTopic);
      const updatedList = exists
        ? currentList.filter((item) => item !== subTopic)
        : [...currentList, subTopic];

      return {
        ...prev,
        [catKey]: true,
        [subItemsKey]: updatedList,
        noneSpecific: false,
      };
    });
  };

  const selectAllSubTopics = (
    catKey: 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'accidental' | 'psychosocial',
    subItemsKey: 'physicalSubItems' | 'chemicalSubItems' | 'biologicalSubItems' | 'ergonomicSubItems' | 'accidentalSubItems' | 'psychosocialSubItems',
    allTopics: string[]
  ) => {
    setFormRisks((prev) => ({
      ...prev,
      [catKey]: true,
      [subItemsKey]: [...allTopics],
      noneSpecific: false,
    }));
  };

  const clearSubTopics = (
    subItemsKey: 'physicalSubItems' | 'chemicalSubItems' | 'biologicalSubItems' | 'ergonomicSubItems' | 'accidentalSubItems' | 'psychosocialSubItems'
  ) => {
    setFormRisks((prev) => ({
      ...prev,
      [subItemsKey]: [],
    }));
  };

  const setNoneSpecificRisks = () => {
    setFormRisks({
      physical: false,
      physicalDetails: '',
      physicalSubItems: [],
      chemical: false,
      chemicalDetails: '',
      chemicalSubItems: [],
      biological: false,
      biologicalDetails: '',
      biologicalSubItems: [],
      ergonomic: false,
      ergonomicDetails: '',
      ergonomicSubItems: [],
      accidental: false,
      accidentalDetails: '',
      accidentalSubItems: [],
      psychosocial: false,
      psychosocialDetails: '',
      psychosocialSubItems: [],
      noneSpecific: true,
      printAllOptionsForManualCheck: false,
    });
  };

  // Questionnaire selection
  const toggleQuestionSelection = (catId: string, questionId: string) => {
    setFormQuestionnaire((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const questions = cat.questions.map((q) => {
          if (q.id !== questionId) return q;
          return {
            ...q,
            selectedForPrint: !q.selectedForPrint,
          };
        });
        return {
          ...cat,
          active: questions.some((q) => !!q.selectedForPrint),
          questions,
        };
      })
    );
  };

  const selectAllQuestionsInCategory = (catId: string, select: boolean) => {
    setFormQuestionnaire((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const questions = cat.questions.map((q) => ({
          ...q,
          selectedForPrint: select,
        }));
        return {
          ...cat,
          active: select,
          questions,
        };
      })
    );
  };

  // Registrar nova pergunta personalizada para o cargo com alocação dinâmica de categoria
  const handleAddQuestionToRole = () => {
    const trimmed = newRoleQuestionText.trim();
    if (!trimmed) return;

    const newQId = `q_role_${Date.now()}`;
    const newQuestion: QuestionnaireQuestion = {
      id: newQId,
      text: trimmed,
      selectedForPrint: true,
      isCustom: true,
      hasDetail: newHasDetail,
      detailLabel: newHasDetail ? newDetailLabel.trim() || 'Especificar:' : undefined,
      roleSpecific: formName.trim() || undefined,
    };

    let targetExpandId = 'cat_role_specific';

    setFormQuestionnaire((prev) => {
      let updated = [...prev];

      if (targetCategoryOption === 'role_specific') {
        const specificTitle = formName.trim()
          ? `PERGUNTAS ESPECÍFICAS: ${formName.trim().toUpperCase()}`
          : 'PERGUNTAS ESPECÍFICAS DO CARGO';

        const catIdx = updated.findIndex(
          (c) => c.id === 'cat_role_specific' || c.title.toUpperCase() === specificTitle.toUpperCase()
        );

        if (catIdx >= 0) {
          updated[catIdx] = {
            ...updated[catIdx],
            active: true,
            questions: [...updated[catIdx].questions, newQuestion],
          };
          targetExpandId = updated[catIdx].id;
        } else {
          updated.push({
            id: 'cat_role_specific',
            title: specificTitle,
            active: true,
            questions: [newQuestion],
          });
          targetExpandId = 'cat_role_specific';
        }
      } else if (targetCategoryOption === 'new_cat') {
        const catTitle = customNewCatTitle.trim() || 'PERGUNTAS ADICIONAIS DO CARGO';
        const newCatId = `cat_custom_${Date.now()}`;
        updated.push({
          id: newCatId,
          title: catTitle.toUpperCase(),
          active: true,
          questions: [newQuestion],
        });
        targetExpandId = newCatId;
      } else {
        // Alocar em categoria existente pré-definida
        const targetId = chosenExistingCatId || updated[0]?.id;
        targetExpandId = targetId;
        updated = updated.map((c) => {
          if (c.id === targetId) {
            return {
              ...c,
              active: true,
              questions: [...c.questions, newQuestion],
            };
          }
          return c;
        });
      }

      return updated;
    });

    setExpandedCatId(targetExpandId);
    setNewRoleQuestionText('');
    setCustomNewCatTitle('');
    setNewHasDetail(false);
    setNewDetailLabel('Especificar:');
    setFeedbackNotice(`Pergunta adicionada com sucesso!`);
    setTimeout(() => setFeedbackNotice(''), 3500);
  };

  const handleDeleteQuestionFromRole = (catId: string, qId: string) => {
    setFormQuestionnaire((prev) =>
      prev
        .map((cat) => {
          if (cat.id !== catId) return cat;
          return {
            ...cat,
            questions: cat.questions.filter((q) => q.id !== qId),
          };
        })
        .filter((cat) => {
          if (cat.id === 'cat_role_specific' && cat.questions.length === 0) return false;
          if (cat.id.startsWith('cat_custom_') && cat.questions.length === 0) return false;
          return true;
        })
    );
  };

  // Complementary exams tags
  const toggleExam = (exam: string) => {
    if (formExams.includes(exam)) {
      setFormExams(formExams.filter((e) => e !== exam));
    } else {
      setFormExams([...formExams, exam]);
    }
  };

  const handleAddCustomExam = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customExamInput.trim();
    if (clean && !formExams.includes(clean)) {
      setFormExams([...formExams, clean]);
      setCustomExamInput('');
    }
  };

  // Save Role
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Por favor, preencha o Nome do Cargo / Função.');
      return;
    }

    const newRole: JobRoleTemplate = {
      id: currentRoleId || `role-${Date.now()}`,
      name: formName.trim(),
      department: formDepartment.trim() || undefined,
      cbo: formCBO.trim() || undefined,
      description: formDescription.trim() || undefined,
      risks: formRisks,
      questionnaireCategories: formQuestionnaire,
      complementaryExams: formExams.length > 0 ? formExams : undefined,
      createdAt: currentRoleId
        ? roles.find((r) => r.id === currentRoleId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveJobRole(newRole);
    reloadRoles();
    setIsEditing(false);
    onNotice(`Cargo / Função "${newRole.name}" salvo com sucesso!`);
    if (onRoleSelected) {
      onRoleSelected(newRole);
    }
  };

  const filteredRoles = roles.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.department && r.department.toLowerCase().includes(term)) ||
      (r.cbo && r.cbo.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 space-y-5">
      {!isEditing ? (
        // List View
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-600" />
                Catálogo de Cargos e Funções ({roles.length})
              </h3>
              <p className="text-xs text-slate-500">
                Cadastre cargos com riscos ocupacionais e questionário pré-definidos para preenchimento rápido.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartNewRole}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Novo Cargo
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do cargo, setor ou CBO..."
              className="w-full text-xs pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>

          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredRoles.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                {roles.length === 0
                  ? 'Nenhum cargo cadastrado no catálogo. Clique em "Cadastrar Novo Cargo" acima para adicionar.'
                  : 'Nenhum cargo encontrado para a busca. Clique em "Cadastrar Novo Cargo" para adicionar.'}
              </div>
            ) : (
              filteredRoles.map((role) => {
                const activeRiskCount = OCCUPATIONAL_RISK_CATEGORIES.filter((c) => !!role.risks[c.key]).length;
                const totalQuestionsSelected = role.questionnaireCategories?.reduce(
                  (acc, cat) => acc + cat.questions.filter((q) => !!q.selectedForPrint).length,
                  0
                ) || 0;

                return (
                  <div
                    key={role.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 bg-white hover:bg-slate-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {role.name}
                        </span>
                        {role.cbo && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            CBO {role.cbo}
                          </span>
                        )}
                        {role.department && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            {role.department}
                          </span>
                        )}
                      </div>

                      {role.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {role.description}
                        </p>
                      )}

                      {/* Badges of Risks and Questionnaire */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {role.risks.noneSpecific ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ausência de Riscos (PGR)
                          </span>
                        ) : activeRiskCount > 0 ? (
                          <>
                            {OCCUPATIONAL_RISK_CATEGORIES.map((c) => {
                              if (!role.risks[c.key]) return null;
                              const subs = (role.risks[c.subItemsKey] as string[]) || [];
                              return (
                                <span
                                  key={c.key}
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-100/70 text-teal-900 border border-teal-200"
                                >
                                  {c.shortLabel} {subs.length > 0 ? `(${subs.length})` : ''}
                                </span>
                              );
                            })}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Nenhum risco registrado
                          </span>
                        )}

                        <span className="text-slate-300 text-[10px]">•</span>

                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          {totalQuestionsSelected} perguntas no questionário
                        </span>

                        {role.complementaryExams && role.complementaryExams.length > 0 && (
                          <>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {role.complementaryExams.length} exame(s)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      {onRoleSelected && (
                        <button
                          type="button"
                          onClick={() => onRoleSelected(role)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer mr-1"
                          title="Usar este cargo no atendimento atual"
                        >
                          <Check className="w-3.5 h-3.5 text-teal-600" />
                          Usar Cargo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEditRole(role)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar cargo e riscos"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateRole(role)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Duplicar modelo de cargo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        // Form View (New or Edit)
        <form onSubmit={handleSaveRole} className="space-y-5">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs -mt-6 -mx-6 px-6 py-3 border-b border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Voltar para lista de cargos"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {currentRoleId ? `Editar Cargo: ${formName}` : 'Cadastrar Novo Cargo e Função'}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina os riscos e questionário que serão vinculados a este cargo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Salvar Cargo
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Dados Gerais do Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Cargo / Função *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Soldador Industrial, Operador de Torno, Auxiliar de Cozinha"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CBO (Opcional)
              </label>
              <input
                type="text"
                value={formCBO}
                onChange={(e) => setFormCBO(e.target.value)}
                placeholder="Ex: 7244-40"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Setor / Departamento Sugerido
              </label>
              <input
                type="text"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                placeholder="Ex: Produção, Almoxarifado"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição Sumária das Atividades
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex: Executa soldagem em chapas de aço e cortes com esmerilhadeira"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* SEÇÃO 1: RISCOS OCUPACIONAIS PRÉ-DEFINIDOS (NR-7) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  1. Riscos Ocupacionais Pré-definidos (NR-7)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Marque os riscos e subtópicos característicos deste cargo. Eles serão importados automaticamente ao selecionar o cargo.
                </p>
              </div>

              {/* Botão Ausência de Riscos */}
              <button
                type="button"
                onClick={setNoneSpecificRisks}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  formRisks.noneSpecific
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Ausência de Riscos (PGR)
              </button>
            </div>

            {/* Grid com as Categorias de Risco */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OCCUPATIONAL_RISK_CATEGORIES.map((cat) => {
                const isChecked = !!formRisks[cat.key];
                const subItems = (formRisks[cat.subItemsKey] as string[]) || [];

                return (
                  <label
                    key={cat.key}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-teal-50/80 border-teal-500 text-teal-950 font-semibold shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormRisks((prev) => ({
                            ...prev,
                            [cat.key]: checked,
                            noneSpecific: false,
                          }));
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 shrink-0"
                      />
                      <span className="leading-tight">{cat.label}</span>
                    </div>

                    {isChecked && subItems.length > 0 && (
                      <span className="mt-1.5 text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md self-start">
                        {subItems.length} subtópicos marcados
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Subtópicos dos Riscos Marcados */}
            {OCCUPATIONAL_RISK_CATEGORIES.some((c) => !!formRisks[c.key]) && (
              <div className="space-y-3 pt-2">
                {OCCUPATIONAL_RISK_CATEGORIES.map((cat) => {
                  if (!formRisks[cat.key]) return null;
                  const currentSubItems = (formRisks[cat.subItemsKey] as string[]) || [];

                  return (
                    <div
                      key={cat.key}
                      className="p-3 rounded-xl border border-teal-200 bg-teal-50/30 text-xs space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          Subtópicos de {cat.label}
                        </span>

                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => selectAllSubTopics(cat.key, cat.subItemsKey, cat.subTopics)}
                            className="font-semibold text-teal-700 hover:underline"
                          >
                            Marcar Todos
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => clearSubTopics(cat.subItemsKey)}
                            className="text-slate-500 hover:text-slate-700 hover:underline"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subTopics.map((topic) => {
                          const isSelected = currentSubItems.includes(topic);
                          return (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => toggleSubTopic(cat.key, cat.subItemsKey, topic)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                isSelected
                                  ? 'bg-teal-600 text-white border-teal-600 font-semibold shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-teal-400 hover:bg-teal-50/40'
                              }`}
                            >
                              {topic}
                            </button>
                          );
                        })}
                      </div>

                      {/* Detalhamento específico */}
                      <input
                        type="text"
                        value={(formRisks[cat.detailsKey] as string) || ''}
                        onChange={(e) =>
                          setFormRisks({
                            ...formRisks,
                            [cat.detailsKey]: e.target.value,
                          })
                        }
                        placeholder={`Observações específicas para ${cat.label} (ex: Fontes geradoras, intensidades)`}
                        className="w-full text-xs px-2.5 py-1.5 border border-teal-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEÇÃO 2: QUESTIONÁRIO CLÍNICO-OCUPACIONAL ESPECIALIZADO PRÉ-DEFINIDO */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                  2. Questionário Clínico-Ocupacional Especializado (Pré-definido)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Selecione as perguntas que devem vir ativadas por padrão para os colaboradores deste cargo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormQuestionnaire((prev) =>
                      prev.map((cat) => ({
                        ...cat,
                        active: true,
                        questions: cat.questions.map((q) => ({ ...q, selectedForPrint: true })),
                      }))
                    );
                  }}
                  className="text-[11px] font-semibold text-purple-700 hover:underline"
                >
                  Selecionar Todas
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormQuestionnaire((prev) =>
                      prev.map((cat) => ({
                        ...cat,
                        active: false,
                        questions: cat.questions.map((q) => ({ ...q, selectedForPrint: false })),
                      }))
                    );
                  }}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  Limpar Todas
                </button>
              </div>
            </div>

            {/* CAMPO PARA REGISTRAR NOVAS PERGUNTAS COM ALOCAÇÃO DINÂMICA DE CATEGORIA */}
            <div className="bg-gradient-to-r from-purple-50/70 via-slate-50 to-teal-50/50 border border-purple-200/90 rounded-xl p-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-purple-600 text-white shadow-2xs">
                    <PlusCircle className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Registrar Novas Perguntas a Serem Realizadas
                      {formName.trim() ? (
                        <span className="font-semibold text-purple-800 bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded text-[11px]">
                          Cargo: {formName.trim()}
                        </span>
                      ) : (
                        <span className="font-normal text-slate-500 text-[11px]">(Específica para o Cargo / Função)</span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Cadastre perguntas para este cargo podendo alocá-las em categorias pré-existentes, em seção exclusiva ou criando nova seção. O espaço permanece em branco após o envio para novas perguntas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                  {/* Campo em Branco para Pergunta */}
                  <div className="lg:col-span-7">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Texto da Nova Pergunta a ser Realizada *
                    </label>
                    <input
                      type="text"
                      value={newRoleQuestionText}
                      onChange={(e) => setNewRoleQuestionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuestionToRole();
                        }
                      }}
                      placeholder={
                        formName.trim()
                          ? `Ex: Apresenta vertigem, labirintite ou fobia para a função de ${formName.trim()}?`
                          : "Digite a pergunta a ser realizada para este cargo..."
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-400 font-medium shadow-2xs"
                    />
                  </div>

                  {/* Alocar na Categoria / Seção */}
                  <div className="lg:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Alocar na Categoria / Seção:
                    </label>
                    <select
                      value={
                        targetCategoryOption === 'role_specific'
                          ? 'role_specific'
                          : targetCategoryOption === 'new_cat'
                          ? 'new_cat'
                          : chosenExistingCatId
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'role_specific') {
                          setTargetCategoryOption('role_specific');
                        } else if (val === 'new_cat') {
                          setTargetCategoryOption('new_cat');
                        } else {
                          setTargetCategoryOption('existing');
                          setChosenExistingCatId(val);
                        }
                      }}
                      className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 shadow-2xs cursor-pointer"
                    >
                      <option value="role_specific">
                        ★ Específica do Cargo ({formName.trim() || 'Cargo / Função'})
                      </option>
                      <optgroup label="Categorias Pré-Existentes">
                        {formQuestionnaire.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </optgroup>
                      <option value="new_cat">+ Criar Nova Seção / Categoria...</option>
                    </select>
                  </div>
                </div>

                {targetCategoryOption === 'new_cat' && (
                  <div className="pt-0.5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome da Nova Seção / Categoria:
                    </label>
                    <input
                      type="text"
                      value={customNewCatTitle}
                      onChange={(e) => setCustomNewCatTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuestionToRole();
                        }
                      }}
                      placeholder="Ex: TRABALHO EM ALTURA (NR-35) ou ESPAÇO CONFINADO (NR-33)"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                {/* Opção de detalhe e Botão de Adicionar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newHasDetail}
                        onChange={(e) => setNewHasDetail(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 bg-white border-slate-300 cursor-pointer"
                      />
                      <span>Exigir campo de especificação se a resposta for &quot;Sim&quot;</span>
                    </label>

                    {newHasDetail && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 font-medium">Rótulo:</span>
                        <input
                          type="text"
                          value={newDetailLabel}
                          onChange={(e) => setNewDetailLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddQuestionToRole();
                            }
                          }}
                          placeholder="Ex: Qual(is)?"
                          className="text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-900 w-28 font-medium focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {feedbackNotice && (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {feedbackNotice}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleAddQuestionToRole}
                      disabled={!newRoleQuestionText.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Adicionar Pergunta
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories Accordions */}
            <div className="space-y-2.5">
              {formQuestionnaire.map((cat) => {
                const isExpanded = expandedCatId === cat.id;
                const selectedCount = cat.questions.filter((q) => !!q.selectedForPrint).length;

                return (
                  <div
                    key={cat.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 cursor-pointer select-none transition-colors">
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-800">
                          {cat.title}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {selectedCount} de {cat.questions.length} selecionadas
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => selectAllQuestionsInCategory(cat.id, true)}
                          className="font-semibold text-purple-700 hover:underline"
                        >
                          Marcar Cat.
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => selectAllQuestionsInCategory(cat.id, false)}
                          className="text-slate-400 hover:text-slate-600 hover:underline"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 border-t border-slate-100 space-y-1.5 bg-slate-50/20">
                        {cat.questions.map((q) => {
                          const isSelected = !!q.selectedForPrint;
                          return (
                            <div
                              key={q.id}
                              className={`flex items-center justify-between gap-2 p-2 rounded-lg text-xs transition-colors ${
                                isSelected
                                  ? 'bg-purple-50/70 border border-purple-200 font-medium text-slate-900'
                                  : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                              }`}
                            >
                              <label className="flex items-start gap-2.5 flex-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleQuestionSelection(cat.id, q.id)}
                                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 shrink-0"
                                />
                                <span className="leading-snug">{q.text}</span>
                                {q.isCustom && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold shrink-0">
                                    <Tag className="w-2.5 h-2.5" />
                                    Personalizada
                                  </span>
                                )}
                                {q.hasDetail && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-medium shrink-0" title={`Exige especificação: ${q.detailLabel || 'Especificar'}`}>
                                    Detalhe: {q.detailLabel || 'Especificar'}
                                  </span>
                                )}
                              </label>

                              {q.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestionFromRole(cat.id, q.id)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors cursor-pointer"
                                  title="Excluir pergunta personalizada"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 3: EXAMES COMPLEMENTARES SUGERIDOS (OPCIONAL) */}
          <div className="space-y-2.5 pt-3 border-t border-slate-200">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                3. Exames Complementares Sugeridos (PCMSO)
              </h4>
              <p className="text-[11px] text-slate-500">
                Selecione os exames complementares que costumam ser exigidos para este cargo.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COMMON_COMPLEMENTARY_EXAMS.map((exam) => {
                const isSelected = formExams.includes(exam);
                return (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => toggleExam(exam)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50/40'
                    }`}
                  >
                    {exam}
                  </button>
                );
              })}
            </div>

            {/* Adicionar Exame Personalizado */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customExamInput}
                onChange={(e) => setCustomExamInput(e.target.value)}
                placeholder="Outro exame complementar..."
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 flex-1"
              />
              <button
                type="button"
                onClick={handleAddCustomExam}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
              >
                + Adicionar Exame
              </button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              Salvar Cargo e Função
            </button>
          </div>
        </form>
      )}

      {/* In-app Delete Confirmation Modal (no window.confirm) */}
      {roleToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Excluir Cargo</h4>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              Deseja realmente remover o modelo <strong className="font-semibold text-slate-900">"{roleToDelete.name}"</strong> do catálogo?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteRole}
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
