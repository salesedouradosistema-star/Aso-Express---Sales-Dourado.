import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Company,
  Doctor,
  Employee,
  ExamType,
  ExamFitness,
  OccupationalRisks,
  Anamnesis,
  ComplementaryExam,
  ASORecord,
  QuestionnaireCategory,
  QuestionnaireData,
  JobRoleTemplate,
} from '../types';
import {
  DEFAULT_RISKS,
  DEFAULT_ANAMNESIS,
  EXAM_TYPE_LABELS,
  getFreshQuestionnaireCategories,
} from '../data/defaultData';
import { OCCUPATIONAL_RISK_CATEGORIES } from '../data/riskDefinitions';
import {
  maskCPF,
  maskDateBR,
  formatDateBR,
  calculateAge,
  calculateIMC,
} from '../utils/formatters';
import { generateNextASOCode, saveASO, getSavedJobRoles, saveJobRole } from '../services/storageService';
import { QuestionnaireSection } from './QuestionnaireSection';
import {
  User,
  Activity,
  ClipboardList,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Stethoscope,
  Heart,
  FileCheck,
  Zap,
  RotateCcw,
  Sparkles,
  ChevronDown,
  FileEdit,
  FileText,
  PenTool,
  Printer,
  Check,
  Save,
} from 'lucide-react';

interface AttendanceFlowProps {
  activeCompany: Company;
  activeDoctor: Doctor;
  issueCity: string;
  onASOGenerated: (aso: ASORecord) => void;
  onOpenSettings: (tab?: 'company' | 'doctor' | 'roles' | 'timbrado') => void;
  initialASOToEdit?: ASORecord | null;
  externalRoleTrigger?: { role: JobRoleTemplate; timestamp: number } | null;
  currentSelectedRoleId?: string;
  onRoleChangeInFlow?: (roleId: string) => void;
  newAttendanceTrigger?: number;
}

export const AttendanceFlow: React.FC<AttendanceFlowProps> = ({
  activeCompany,
  activeDoctor,
  issueCity,
  onASOGenerated,
  onOpenSettings,
  initialASOToEdit,
  externalRoleTrigger,
  currentSelectedRoleId,
  onRoleChangeInFlow,
  newAttendanceTrigger,
}) => {
  // --- Step 1: Colaborador State ---
  const [employee, setEmployee] = useState<Employee>({
    name: '',
    cpf: '',
    rg: '',
    birthDate: '',
    age: undefined,
    gender: 'M',
    role: '',
    department: '',
    employeeCode: '',
  });

  // --- Step 2: Tipo de Exame ---
  const [examType, setExamType] = useState<ExamType>('em_branco');

  // --- Riscos Ocupacionais (NR-7) ---
  const [risks, setRisks] = useState<OccupationalRisks>({ ...DEFAULT_RISKS });

  // --- Step 3: Anamnese Dinâmica ---
  const [anamnesis, setAnamnesis] = useState<Anamnesis>({ ...DEFAULT_ANAMNESIS });

  // --- Tópicos de Perguntas Clínico-Ocupacionais (Opcional - entre Passo 3 e Passo 4) ---
  const [questionnaireCategories, setQuestionnaireCategories] = useState<QuestionnaireCategory[]>(
    getFreshQuestionnaireCategories
  );

  // --- Complementary Exams ---
  const [complementaryExams, setComplementaryExams] = useState<ComplementaryExam[]>([
    { id: 'c1', name: 'Avaliação Clínica Ocupacional', date: new Date().toISOString().slice(0, 10), result: 'normal' },
  ]);

  // --- Step 4: Conclusão Médica ---
  const [fitness, setFitness] = useState<ExamFitness>('em_branco');
  const [restrictionsNote, setRestrictionsNote] = useState('');
  const [notes, setNotes] = useState('');

  // --- Catálogo de Cargos e Funções pré-definidos (NR-7) ---
  const [savedRoles, setSavedRoles] = useState<JobRoleTemplate[]>(getSavedJobRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [roleFeedbackMsg, setRoleFeedbackMsg] = useState<string>('');
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Form Validation & UI Feedback
  const [validationError, setValidationError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Handle click outside role dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync roles when storage is updated
  useEffect(() => {
    const handleStorageUpdate = () => {
      setSavedRoles(getSavedJobRoles());
    };
    window.addEventListener('aso_storage_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('aso_storage_updated', handleStorageUpdate);
    };
  }, []);

  // Helper for normalizing role strings (case, accents, extra whitespace)
  const normalizeRoleText = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Find matching role from saved roles list
  const findMatchingRole = useCallback(
    (roleName: string, roleList: JobRoleTemplate[] = savedRoles) => {
      const normalized = normalizeRoleText(roleName);
      if (!normalized) return null;
      return (
        roleList.find((r) => normalizeRoleText(r.name) === normalized) ||
        null
      );
    },
    [savedRoles]
  );

  // Track the last role id that was auto-applied to avoid redundant loops
  const [appliedRoleTemplateId, setAppliedRoleTemplateId] = useState<string | null>(null);

  // Apply pre-defined Job Role Template (Risks + Questionnaire)
  const applyJobRoleTemplate = useCallback(
    (
      role: JobRoleTemplate,
      options?: { updateRoleText?: boolean; showFeedback?: boolean; force?: boolean; notifyParent?: boolean }
    ) => {
      const shouldUpdateRoleText = options?.updateRoleText !== false;
      const shouldShowFeedback = options?.showFeedback !== false;
      const shouldNotifyParent = options?.notifyParent !== false;

      setEmployee((prev) => ({
        ...prev,
        role: shouldUpdateRoleText ? role.name : prev.role,
        department:
          prev.department && prev.department.trim() !== ''
            ? prev.department
            : role.department || '',
      }));

      // Apply pre-defined risks
      setRisks({
        ...role.risks,
        printAllOptionsForManualCheck: role.risks.printAllOptionsForManualCheck ?? false,
      });

      // Apply pre-defined questionnaire
      if (role.questionnaireCategories && role.questionnaireCategories.length > 0) {
        setQuestionnaireCategories(JSON.parse(JSON.stringify(role.questionnaireCategories)));
      }

      // Apply suggested complementary exams if present
      if (role.complementaryExams && role.complementaryExams.length > 0) {
        setComplementaryExams((prev) => {
          const existingNames = new Set(prev.map((e) => e.name.trim().toLowerCase()));
          const newExams = role.complementaryExams!
            .filter((examName) => !existingNames.has(examName.trim().toLowerCase()))
            .map((examName, idx) => ({
              id: `c-role-${Date.now()}-${idx}`,
              name: examName,
              date: new Date().toISOString().slice(0, 10),
              result: 'normal' as const,
            }));
          return [...prev, ...newExams];
        });
      }

      const activeRisksCount = OCCUPATIONAL_RISK_CATEGORIES.filter((c) => !!role.risks[c.key]).length;
      const questionsCount =
        role.questionnaireCategories?.reduce(
          (acc, cat) => acc + cat.questions.filter((q) => !!q.selectedForPrint).length,
          0
        ) || 0;

      setSelectedRoleId(role.id);
      setAppliedRoleTemplateId(role.id);
      if (shouldNotifyParent) {
        onRoleChangeInFlow?.(role.id);
      }

      if (shouldShowFeedback) {
        setRoleFeedbackMsg(
          `Cargo "${role.name}" aplicado! ${
            role.risks.noneSpecific ? 'Ausência de riscos específicos' : `${activeRisksCount} riscos`
          } e ${questionsCount} perguntas do questionário ajustados automaticamente.`
        );
        setTimeout(() => {
          setRoleFeedbackMsg('');
        }, 6000);
      }
    },
    [onRoleChangeInFlow]
  );

  // Computed matching role based on current employee role text
  const matchedRole = useMemo(() => {
    return findMatchingRole(employee.role);
  }, [employee.role, findMatchingRole]);

  // Filtered roles for the dropdown list inside the role field
  const filteredDropdownRoles = useMemo(() => {
    if (!savedRoles || savedRoles.length === 0) return [];
    const search = normalizeRoleText(employee.role);
    if (!search) return savedRoles;
    return savedRoles.filter(
      (r) =>
        normalizeRoleText(r.name).includes(search) ||
        (r.department && normalizeRoleText(r.department).includes(search))
    );
  }, [savedRoles, employee.role]);

  // Sync when role is pulled from external trigger (e.g. from header or initial selection)
  useEffect(() => {
    if (externalRoleTrigger?.role) {
      applyJobRoleTemplate(externalRoleTrigger.role, { updateRoleText: true, showFeedback: true, notifyParent: false });
    }
  }, [externalRoleTrigger, applyJobRoleTemplate]);

  // Sync external role selection changes
  useEffect(() => {
    if (currentSelectedRoleId !== undefined && currentSelectedRoleId !== selectedRoleId) {
      setSelectedRoleId(currentSelectedRoleId);
      const found = savedRoles.find((r) => r.id === currentSelectedRoleId);
      if (found && found.id !== appliedRoleTemplateId) {
        applyJobRoleTemplate(found, { updateRoleText: true, showFeedback: true, notifyParent: false });
      }
    }
  }, [currentSelectedRoleId, selectedRoleId, savedRoles, appliedRoleTemplateId, applyJobRoleTemplate]);

  // Save current role, risks, and questionnaire as a new template in the catalog
  const saveCurrentAsJobRoleTemplate = () => {
    if (!employee.role.trim()) {
      setValidationError('Por favor, informe a Função / Cargo do colaborador antes de salvar no catálogo.');
      return;
    }
    const newTemplate: JobRoleTemplate = {
      id: `role-${Date.now()}`,
      name: employee.role.trim(),
      department: employee.department.trim() || undefined,
      risks: { ...risks },
      questionnaireCategories: JSON.parse(JSON.stringify(questionnaireCategories)),
      complementaryExams: complementaryExams.map((e) => e.name).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveJobRole(newTemplate);
    setSavedRoles(getSavedJobRoles());
    setSelectedRoleId(newTemplate.id);
    onRoleChangeInFlow?.(newTemplate.id);
    setRoleFeedbackMsg(`Cargo "${newTemplate.name}" salvo no Catálogo de Cargos com os riscos e questionário atuais!`);
    setTimeout(() => {
      setRoleFeedbackMsg('');
    }, 6000);
  };

  // Pre-load if editing existing ASO
  useEffect(() => {
    if (initialASOToEdit) {
      setEmployee({ ...initialASOToEdit.employee });
      setExamType(initialASOToEdit.examType);
      setRisks({
        ...initialASOToEdit.risks,
        printAllOptionsForManualCheck: initialASOToEdit.risks.printAllOptionsForManualCheck ?? true,
      });
      setAnamnesis({ ...initialASOToEdit.anamnesis });
      if (initialASOToEdit.questionnaire?.categories) {
        setQuestionnaireCategories(initialASOToEdit.questionnaire.categories);
      } else {
        setQuestionnaireCategories(getFreshQuestionnaireCategories());
      }
      setComplementaryExams([...initialASOToEdit.complementaryExams]);
      setFitness(initialASOToEdit.fitness);
      setRestrictionsNote(initialASOToEdit.restrictionsNote || '');
      setNotes(initialASOToEdit.notes || '');
    }
  }, [initialASOToEdit]);

  // Auto calculate age whenever birth date changes
  const handleBirthDateChange = (dateStr: string) => {
    const age = calculateAge(dateStr);
    setEmployee((prev) => ({
      ...prev,
      birthDate: dateStr,
      age,
    }));
  };

  // Auto calculate IMC whenever weight or height changes
  const handleWeightHeightChange = (weight: string, height: string) => {
    const imc = calculateIMC(weight, height);
    setAnamnesis((prev) => ({
      ...prev,
      weight,
      height,
      imc,
    }));
  };

  // Ultra-fast "Normal / Sem Queixas" Button (Huge time saver for occupational doctors!)
  const applyAllNormalAnamnesis = () => {
    setAnamnesis({
      generalCondition: 'bom',
      chronicDiseases: ['Nega doenças crônicas'],
      currentComplaints: 'Nega queixas álgicas, respiratórias ou osteomusculares no momento.',
      continuousMedication: 'Nega uso de medicação contínua.',
      previousSurgeries: 'Nega cirurgias ou internações prévias.',
      smoker: false,
      alcohol: false,
      bloodPressure: '120/80',
      heartRate: '72',
      weight: anamnesis.weight || '72',
      height: anamnesis.height || '172',
      imc: anamnesis.imc || '24.3',
      clinicalObservations:
        'Aparelho cardiovascular e respiratório sem anormalidades à ausculta. Acuidade visual preservada. Sistema osteomuscular com amplitude de movimentos livre.',
    });

    // Also mark all questionnaire topics as "Não" (Negativo / Sem queixas)
    setQuestionnaireCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        questions: cat.questions.map((q) => ({
          ...q,
          answer: 'nao' as const,
          selectedForPrint: true,
          detailValue: '',
        })),
      }))
    );
  };

  // Leave Anamnesis blank with empty spaces/lines for manual writing on paper
  const applyBlankAnamnesisForPaper = () => {
    setAnamnesis({
      generalCondition: 'bom',
      chronicDiseases: [],
      currentComplaints: '',
      continuousMedication: '',
      previousSurgeries: '',
      smoker: false,
      alcohol: false,
      bloodPressure: '',
      heartRate: '',
      weight: '',
      height: '',
      imc: '',
      clinicalObservations: '',
    });
  };

  // Reset form for next employee while keeping Company and Doctor intact
  const resetForm = useCallback(() => {
    setEmployee({
      name: '',
      cpf: '',
      rg: '',
      birthDate: '',
      age: undefined,
      gender: 'M',
      role: '',
      department: '',
      employeeCode: '',
    });
    setExamType('em_branco');
    setRisks({ ...DEFAULT_RISKS });
    setAnamnesis({ ...DEFAULT_ANAMNESIS });
    setQuestionnaireCategories(getFreshQuestionnaireCategories());
    setComplementaryExams([
      { id: `c-${Date.now()}`, name: 'Avaliação Clínica Ocupacional', date: new Date().toISOString().slice(0, 10), result: 'normal' },
    ]);
    setFitness('em_branco');
    setRestrictionsNote('');
    setNotes('');
    setSelectedRoleId('');
    onRoleChangeInFlow?.('');
    setRoleFeedbackMsg('');
    setValidationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onRoleChangeInFlow]);

  // When parent signals a New Attendance, reset all fields cleanly
  useEffect(() => {
    if (newAttendanceTrigger) {
      resetForm();
    }
  }, [newAttendanceTrigger, resetForm]);

  // Occupational Risks Subtopics Handlers
  const toggleRiskSubTopic = (
    catKey: 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'accidental' | 'psychosocial',
    subItemsKey: 'physicalSubItems' | 'chemicalSubItems' | 'biologicalSubItems' | 'ergonomicSubItems' | 'accidentalSubItems' | 'psychosocialSubItems',
    subTopic: string
  ) => {
    setRisks((prev) => {
      const currentList = (prev[subItemsKey] as string[]) || [];
      const isPresent = currentList.includes(subTopic);
      const newList = isPresent
        ? currentList.filter((item) => item !== subTopic)
        : [...currentList, subTopic];

      return {
        ...prev,
        [catKey]: true,
        noneSpecific: false,
        [subItemsKey]: newList,
      };
    });
  };

  const selectAllSubTopics = (
    catKey: 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'accidental' | 'psychosocial',
    subItemsKey: 'physicalSubItems' | 'chemicalSubItems' | 'biologicalSubItems' | 'ergonomicSubItems' | 'accidentalSubItems' | 'psychosocialSubItems',
    subTopics: string[]
  ) => {
    setRisks((prev) => ({
      ...prev,
      [catKey]: true,
      noneSpecific: false,
      [subItemsKey]: [...subTopics],
    }));
  };

  const clearSubTopics = (
    subItemsKey: 'physicalSubItems' | 'chemicalSubItems' | 'biologicalSubItems' | 'ergonomicSubItems' | 'accidentalSubItems' | 'psychosocialSubItems'
  ) => {
    setRisks((prev) => ({
      ...prev,
      [subItemsKey]: [],
    }));
  };

  const clearAllRisks = () => {
    setRisks({
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
      noneSpecific: false,
      printAllOptionsForManualCheck: risks.printAllOptionsForManualCheck,
    });
  };

  const setNoneSpecificRisks = () => {
    setRisks({
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
      printAllOptionsForManualCheck: risks.printAllOptionsForManualCheck,
    });
  };

  // Finalize and generate ASO
  const handleSubmit = (e: React.FormEvent, proceedToNext = false) => {
    e.preventDefault();

    if (!employee.name.trim()) {
      setValidationError('Por favor, informe o Nome Completo do colaborador.');
      return;
    }
    if (!employee.cpf.trim() || employee.cpf.length < 14) {
      setValidationError('Por favor, informe um CPF válido.');
      return;
    }
    if (!employee.role.trim()) {
      setValidationError('Por favor, informe a Função/Cargo do colaborador.');
      return;
    }
    if (!employee.department.trim()) {
      setValidationError('Por favor, informe o Setor de trabalho.');
      return;
    }
    if (fitness === 'apto_com_restricoes' && !restrictionsNote.trim()) {
      setValidationError('Por favor, descreva as restrições médicas no parecer.');
      return;
    }

    setValidationError('');

    // Always attach questionnaire by default in all attendances
    const questionnaireData: QuestionnaireData = {
      enabled: true,
      categories: questionnaireCategories,
    };

    const asoRecord: ASORecord = {
      id: initialASOToEdit?.id || `aso-${Date.now()}`,
      asoCode: initialASOToEdit?.asoCode || generateNextASOCode(),
      issueDate: new Date().toISOString().slice(0, 10),
      issueCity,
      company: {
        ...activeCompany,
        riskGrade: initialASOToEdit?.company.riskGrade || activeCompany.riskGrade || '2',
      },
      doctor: activeDoctor,
      employee,
      examType,
      risks,
      anamnesis,
      questionnaire: questionnaireData,
      complementaryExams,
      fitness,
      restrictionsNote: fitness === 'apto_com_restricoes' ? restrictionsNote : undefined,
      notes: notes.trim() || undefined,
      createdAt: initialASOToEdit?.createdAt || new Date().toISOString(),
    };

    saveASO(asoRecord);

    if (proceedToNext) {
      resetForm();
      setSuccessNotice(`ASO ${asoRecord.asoCode} emitido e salvo com sucesso! Formulário limpo e pronto para o próximo paciente.`);
      setTimeout(() => setSuccessNotice(''), 6000);
    } else {
      onASOGenerated(asoRecord);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 pb-20">
      
      {/* Context Bar: Empresa & Médico Ativos (Click to change) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span className="text-slate-500 font-medium">Empresa:</span>
            <span className="font-bold text-slate-800">
              {activeCompany.fantasyName || activeCompany.name || 'Em branco (Não definida)'}
            </span>
            {activeCompany.cnpj && (
              <span className="text-slate-400 font-mono">({activeCompany.cnpj})</span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span className="text-slate-500 font-medium">Médico:</span>
            <span className="font-bold text-slate-800">
              {activeDoctor.name || 'Em branco (Não definido)'}
            </span>
            {(activeDoctor.crm || activeDoctor.crmUf) && (
              <span className="text-slate-500">
                CRM {activeDoctor.crm}{activeDoctor.crmUf ? `/${activeDoctor.crmUf}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
            title="Limpar formulário e iniciar novo atendimento"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Limpar Atendimento
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Alterar dados fixos
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Validation alert banner */}
      {validationError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* PASSO 1: Identificação do Colaborador */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                Identificação do Colaborador
              </h3>
              <p className="text-xs text-slate-500">
                Dados pessoais, cadastrais e função exercida na empresa contratante (obrigatoriamente preenchidos).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Limpar todos os campos e iniciar novo atendimento em branco"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Tela
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Nome Completo */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome Completo do Trabalhador *
            </label>
            <input
              id="employee-name-input"
              type="text"
              required
              value={employee.name}
              onChange={(e) => setEmployee({ ...employee, name: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              CPF *
            </label>
            <input
              type="text"
              required
              value={employee.cpf}
              onChange={(e) =>
                setEmployee({ ...employee, cpf: maskCPF(e.target.value) })
              }
              maxLength={14}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>

          {/* RG (Opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              RG / Órgão Emissor
            </label>
            <input
              type="text"
              value={employee.rg || ''}
              onChange={(e) => setEmployee({ ...employee, rg: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Data de Nascimento
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={employee.birthDate ? (employee.birthDate.includes('-') ? formatDateBR(employee.birthDate) : employee.birthDate) : ''}
                onChange={(e) => {
                  const masked = maskDateBR(e.target.value);
                  handleBirthDateChange(masked);
                }}
                maxLength={10}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
              />
              {employee.age !== undefined && (
                <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {employee.age} anos
                </span>
              )}
            </div>
          </div>

          {/* Feedback message when role is applied from the top bar */}
          {roleFeedbackMsg && (
            <div className="sm:col-span-2 lg:col-span-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{roleFeedbackMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setRoleFeedbackMsg('')}
                className="text-emerald-700 hover:text-emerald-950 text-xs ml-2 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Sexo Biológico */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Sexo Biológico
            </label>
            <select
              value={employee.gender}
              onChange={(e) =>
                setEmployee({
                  ...employee,
                  gender: e.target.value as 'M' | 'F' | 'Outro',
                })
              }
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Função / Cargo com Lista Suspensa Integrada */}
          <div className="relative" ref={roleDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Função / Cargo *
              </label>
              {matchedRole && (
                <span className="inline-flex items-center gap-1 text-[11px] text-teal-800 font-bold bg-teal-100/90 border border-teal-300 px-2 py-0.5 rounded-md shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                  Cargo Pré-cadastrado
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={employee.role}
                onFocus={() => {
                  if (savedRoles.length > 0) setIsRoleDropdownOpen(true);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmployee((prev) => ({ ...prev, role: val }));
                  if (!isRoleDropdownOpen && savedRoles.length > 0) {
                    setIsRoleDropdownOpen(true);
                  }

                  // Auto-match pre-registered role immediately when typing or selecting
                  const matched = findMatchingRole(val);
                  if (matched) {
                    if (matched.id !== appliedRoleTemplateId) {
                      applyJobRoleTemplate(matched, { updateRoleText: false, showFeedback: true });
                    }
                  } else {
                    if (appliedRoleTemplateId) {
                      setAppliedRoleTemplateId(null);
                      setSelectedRoleId('');
                      onRoleChangeInFlow?.('');
                    }
                  }
                }}
                onBlur={() => {
                  const matched = findMatchingRole(employee.role);
                  if (matched) {
                    setEmployee((prev) => ({ ...prev, role: matched.name }));
                    if (matched.id !== appliedRoleTemplateId) {
                      applyJobRoleTemplate(matched, { updateRoleText: true, showFeedback: true });
                    }
                  }
                }}
                className={`w-full text-sm pl-3.5 pr-10 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 font-medium transition-all ${
                  matchedRole
                    ? 'border-teal-500 bg-teal-50/20 text-slate-900 focus:ring-teal-500'
                    : 'border-slate-300 bg-white text-slate-800 focus:ring-teal-500'
                }`}
              />

              {/* Botão para alternar a Lista Suspensa */}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                title={isRoleDropdownOpen ? 'Fechar lista suspensa' : 'Abrir lista suspensa de cargos'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-teal-700 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isRoleDropdownOpen ? 'rotate-180 text-teal-600' : ''
                  }`}
                />
              </button>

              {/* Menu da Lista Suspensa (Dropdown) */}
              {isRoleDropdownOpen && savedRoles.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between bg-slate-50/70">
                    <span>Lista Suspensa de Cargos</span>
                    <span>{savedRoles.length} cadastrados</span>
                  </div>
                  {filteredDropdownRoles.length > 0 ? (
                    filteredDropdownRoles.map((r) => {
                      const isSelected = matchedRole?.id === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyJobRoleTemplate(r, { updateRoleText: true, showFeedback: true });
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 hover:bg-teal-50 transition-colors flex items-center justify-between group cursor-pointer ${
                            isSelected ? 'bg-teal-50/80 font-semibold text-teal-900' : 'text-slate-800'
                          }`}
                        >
                          <div className="pr-2 truncate">
                            <div className="text-sm font-medium text-slate-800 group-hover:text-teal-900 flex items-center gap-1.5 truncate">
                              <span className="truncate">{r.name}</span>
                              {isSelected && (
                                <span className="text-[10px] shrink-0 text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded font-bold">
                                  Ativo
                                </span>
                              )}
                            </div>
                            {r.department && (
                              <div className="text-xs text-slate-500 truncate">
                                Setor: {r.department}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-teal-600 font-semibold shrink-0 group-hover:underline">
                            Selecionar
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-3 text-xs text-slate-500 text-center">
                      Nenhum cargo no catálogo corresponde à pesquisa.
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Você pode continuar digitando para usar um cargo novo livremente.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Alerta de Cargo Reconhecido e Botão de Reaplicar */}
            {matchedRole && (
              <div className="mt-1.5 p-2 bg-teal-50/90 border border-teal-200 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-teal-900 font-medium truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">
                    Riscos e questionário vinculados a <strong>{matchedRole.name}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    applyJobRoleTemplate(matchedRole, {
                      updateRoleText: true,
                      showFeedback: true,
                      force: true,
                    })
                  }
                  title="Recarregar os riscos e questionário padrão deste cargo"
                  className="text-[11px] text-teal-800 hover:text-teal-950 font-bold hover:underline flex items-center gap-1 shrink-0 cursor-pointer bg-white px-2 py-0.5 rounded border border-teal-200 shadow-2xs"
                >
                  <RotateCcw className="w-3 h-3 text-teal-700" />
                  Reaplicar
                </button>
              </div>
            )}
          </div>

          {/* Setor / Departamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Setor / Departamento *
            </label>
            <input
              type="text"
              required
              value={employee.department}
              onChange={(e) =>
                setEmployee({ ...employee, department: e.target.value })
              }
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
            />
          </div>

          {/* Matrícula (Opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Matrícula / Cód. Funcional
            </label>
            <input
              type="text"
              value={employee.employeeCode || ''}
              onChange={(e) =>
                setEmployee({ ...employee, employeeCode: e.target.value })
              }
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>
        </div>

        {/* Perigos e Riscos Ocupacionais (NR-7) */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between mb-2.5 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Riscos Ocupacionais Avaliados (NR-7 Item 7.5.19)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={clearAllRisks}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 underline cursor-pointer"
              >
                Desmarcar todos
              </button>
              <button
                type="button"
                onClick={saveCurrentAsJobRoleTemplate}
                title="Salva os riscos e questionário atuais como um novo modelo no catálogo de cargos"
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md border border-teal-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Save className="w-3.5 h-3.5 text-teal-600" />
                Salvar como Cargo
              </button>
            </div>
          </div>

          {/* Categorias Principais de Riscos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {OCCUPATIONAL_RISK_CATEGORIES.map((cat) => {
              const isChecked = !!risks[cat.key];
              const subItemsCount = ((risks[cat.subItemsKey] as string[]) || []).length;

              return (
                <label
                  key={cat.key}
                  className={`flex flex-col justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-teal-600 border-teal-500 text-white font-semibold shadow-xs ring-2 ring-teal-400/40'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRisks((prev) => ({
                          ...prev,
                          [cat.key]: checked,
                          noneSpecific: false,
                        }));
                      }}
                      className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 shrink-0 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    />
                    <span className="leading-tight">{cat.label}</span>
                  </div>

                  {isChecked && subItemsCount > 0 && (
                    <span className="mt-1.5 text-[10px] font-bold text-white bg-teal-800/80 dark:bg-teal-950/80 px-1.5 py-0.5 rounded-md self-start border border-teal-400/30">
                      {subItemsCount} subtópico{subItemsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
              );
            })}

            {/* Ausência de Riscos Ocupacionais Específicos */}
            <label
              className={`flex flex-col justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                risks.noneSpecific
                  ? 'bg-emerald-600 dark:bg-emerald-700 border-emerald-500 text-white font-semibold shadow-xs ring-2 ring-emerald-400/40'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!risks.noneSpecific}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNoneSpecificRisks();
                    } else {
                      setRisks((prev) => ({ ...prev, noneSpecific: false }));
                    }
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
                <span className="leading-tight">Ausência de Riscos</span>
              </div>
              {risks.noneSpecific && (
                <span className="mt-1.5 text-[10px] font-bold text-white bg-emerald-800/80 px-1.5 py-0.5 rounded-md self-start border border-emerald-400/30">
                  Conforme PGR
                </span>
              )}
            </label>
          </div>

          {/* Subtópicos dos Riscos Marcados */}
          {OCCUPATIONAL_RISK_CATEGORIES.some((cat) => !!risks[cat.key]) && (
            <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Subtópicos de Riscos por Função
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Marque os agentes ou fatores específicos aos quais o colaborador está exposto
                </span>
              </div>

              {OCCUPATIONAL_RISK_CATEGORIES.map((cat) => {
                if (!risks[cat.key]) return null;

                const currentSubItems = (risks[cat.subItemsKey] as string[]) || [];

                return (
                  <div
                    key={cat.key}
                    className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-slate-800/80 text-xs shadow-2xs space-y-2.5 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 dark:border-slate-700 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          Subtópicos: {cat.label}
                        </span>
                        <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">
                          {currentSubItems.length} de {cat.subTopics.length} marcados
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectAllSubTopics(cat.key, cat.subItemsKey, cat.subTopics)}
                          className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline cursor-pointer"
                        >
                          Marcar todos
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => clearSubTopics(cat.subItemsKey)}
                          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline cursor-pointer"
                        >
                          Limpar subtópicos
                        </button>
                      </div>
                    </div>

                    {/* Chips de seleção dos subtópicos */}
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subTopics.map((sub) => {
                        const isSubSelected = currentSubItems.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleRiskSubTopic(cat.key, cat.subItemsKey, sub)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none border ${
                              isSubSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs font-semibold ring-1 ring-teal-400/30'
                                : 'bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] border ${
                                isSubSelected ? 'border-white bg-white text-teal-700' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {isSubSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{sub}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Campo opcional de detalhes adicionais */}
                    <div className="pt-1">
                      <input
                        type="text"
                        value={risks[cat.detailsKey] || ''}
                        onChange={(e) =>
                          setRisks((prev) => ({
                            ...prev,
                            [cat.detailsKey]: e.target.value,
                          }))
                        }
                        placeholder={`Outras especificações / observações de riscos ${cat.shortLabel.toLowerCase()} (opcional)`}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}


        </div>
      </div>

      {/* PASSO 2: Tipo de Exame Ocupacional (NR-7) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Tipo de Exame Ocupacional (NR-7)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecione a modalidade ou deixe desmarcado para assinalar à mão no papel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {examType !== 'em_branco' ? (
              <button
                type="button"
                onClick={() => setExamType('em_branco')}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 underline cursor-pointer"
              >
                Deixar em branco
              </button>
            ) : (
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                Em branco (preencher no papel)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(
            [
              'admissional',
              'periodico',
              'retorno_trabalho',
              'mudanca_risco',
              'demissional',
            ] as ExamType[]
          ).map((type) => {
            const isSelected = examType === type;
            const meta = EXAM_TYPE_LABELS[type];
            return (
              <button
                type="button"
                key={type}
                onClick={() => setExamType(isSelected ? 'em_branco' : type)}
                className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/90 dark:bg-teal-950/60 dark:border-teal-400 ring-2 ring-teal-600/30 text-teal-950 dark:text-teal-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    {meta.label}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-teal-600 bg-teal-600 dark:border-teal-400 dark:bg-teal-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                  {meta.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* PASSO 3: Anamnese Dinâmica (Questionário de Saúde Rápido) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-teal-600" />
                Anamnese Dinâmica & Avaliação Clínica
              </h3>
              <p className="text-xs text-slate-500">
                Sinais vitais, histórico médico, queixas atuais e observações do exame físico.
              </p>
            </div>
          </div>

          {/* Action buttons for Anamnesis: Normal vs Em Branco */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={applyBlankAnamnesisForPaper}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-300"
              title="Limpa todos os campos da anamnese para deixar o espaço em branco para preenchimento manual no papel"
            >
              <PenTool className="w-3.5 h-3.5 text-slate-600" />
              Deixar em Branco (Papel)
            </button>

            <button
              type="button"
              onClick={applyAllNormalAnamnesis}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all hover:shadow-sm"
              title="Preenche sinais vitais saudáveis e anamnese sem queixas em 1 clique"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Tudo Normal (1 Clique)
            </button>
          </div>
        </div>

        {/* Vital Signs (PA, FC, Peso, Altura, IMC) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 mb-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              PA (Pressão Arterial)
            </label>
            <input
              type="text"
              value={anamnesis.bloodPressure}
              onChange={(e) =>
                setAnamnesis({ ...anamnesis, bloodPressure: e.target.value })
              }
              className="w-full text-xs px-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">mmHg</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              FC (Frequência Cardíaca)
            </label>
            <input
              type="text"
              value={anamnesis.heartRate}
              onChange={(e) =>
                setAnamnesis({ ...anamnesis, heartRate: e.target.value })
              }
              className="w-full text-xs px-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">bpm</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              Peso (kg)
            </label>
            <input
              type="text"
              value={anamnesis.weight}
              onChange={(e) =>
                handleWeightHeightChange(e.target.value, anamnesis.height)
              }
              className="w-full text-xs px-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">kg</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              Altura (cm)
            </label>
            <input
              type="text"
              value={anamnesis.height}
              onChange={(e) =>
                handleWeightHeightChange(anamnesis.weight, e.target.value)
              }
              className="w-full text-xs px-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">cm</span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              IMC Calculado
            </label>
            <div className="text-xs px-2.5 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white flex items-center justify-between shadow-2xs">
              <span className="text-teal-700 dark:text-teal-300">{anamnesis.imc || '--'}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">kg/m²</span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold min-h-[15px] block mt-0.5">
              {!anamnesis.imc || parseFloat(anamnesis.imc) <= 0
                ? ''
                : parseFloat(anamnesis.imc) < 18.5
                ? 'Baixo peso'
                : parseFloat(anamnesis.imc) < 25
                ? 'Eutrófico'
                : parseFloat(anamnesis.imc) < 30
                ? 'Sobrepeso'
                : 'Obesidade'}
            </span>
          </div>
        </div>

        {/* Fast Questions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Queixas Atuais / Sintomas
            </label>
            <input
              type="text"
              value={anamnesis.currentComplaints}
              onChange={(e) =>
                setAnamnesis({ ...anamnesis, currentComplaints: e.target.value })
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Uso de Medicamentos Contínuos
            </label>
            <input
              type="text"
              value={anamnesis.continuousMedication}
              onChange={(e) =>
                setAnamnesis({ ...anamnesis, continuousMedication: e.target.value })
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Histórico Cirúrgico / Internações
            </label>
            <input
              type="text"
              value={anamnesis.previousSurgeries}
              onChange={(e) =>
                setAnamnesis({ ...anamnesis, previousSurgeries: e.target.value })
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Doenças Crônicas / Comorbidades */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Doenças Crônicas / Comorbidades
              </label>
              {anamnesis.chronicDiseases && anamnesis.chronicDiseases.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAnamnesis({ ...anamnesis, chronicDiseases: [] })}
                  className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <input
              type="text"
              value={
                Array.isArray(anamnesis.chronicDiseases)
                  ? anamnesis.chronicDiseases.join(', ')
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                setAnamnesis({
                  ...anamnesis,
                  chronicDiseases: val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [],
                });
              }}
              className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500"
            />

            {/* Chips de seleção rápida */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[
                'Nega doenças crônicas',
                'Hipertensão (HAS)',
                'Diabetes Mellitus',
                'Asma / Bronquite',
                'Dislipidemia',
                'Cardiopatia',
                'Tireoidopatia',
                'Depressão / Ansiedade',
                'Epilepsia / Convulsão',
                'Problemas de Coluna',
              ].map((chip) => {
                const isSelected =
                  Array.isArray(anamnesis.chronicDiseases) &&
                  anamnesis.chronicDiseases.some(
                    (d) => d.toLowerCase() === chip.toLowerCase()
                  );

                return (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => {
                      let current = Array.isArray(anamnesis.chronicDiseases)
                        ? [...anamnesis.chronicDiseases]
                        : [];

                      if (chip === 'Nega doenças crônicas') {
                        if (isSelected) {
                          current = [];
                        } else {
                          current = ['Nega doenças crônicas'];
                        }
                      } else {
                        current = current.filter(
                          (c) => c.toLowerCase() !== 'nega doenças crônicas'
                        );
                        if (isSelected) {
                          current = current.filter(
                            (c) => c.toLowerCase() !== chip.toLowerCase()
                          );
                        } else {
                          current.push(chip);
                        }
                      }

                      setAnamnesis({ ...anamnesis, chronicDiseases: current });
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 dark:bg-teal-600 border-teal-600 text-white font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {isSelected ? `✓ ${chip}` : `+ ${chip}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabagismo / Etilismo */}
          <div className="flex items-center gap-6 pt-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={anamnesis.smoker}
                onChange={(e) =>
                  setAnamnesis({ ...anamnesis, smoker: e.target.checked })
                }
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
              <span>Tabagista</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={anamnesis.alcohol}
                onChange={(e) =>
                  setAnamnesis({ ...anamnesis, alcohol: e.target.checked })
                }
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
              <span>Etilista social</span>
            </label>
          </div>

          {/* Observações Clínicas Livres */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Observações Clínicas / Exame Físico Dirigido
            </label>
            <textarea
              rows={2}
              value={anamnesis.clinicalObservations}
              onChange={(e) =>
                setAnamnesis({ ...anamnesis, clinicalObservations: e.target.value })
              }
              className="w-full text-xs p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Exames Complementares Rápidos */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Procedimentos / Exames Complementares (NR-7)
            </span>
            <button
              type="button"
              onClick={() => {
                setComplementaryExams([
                  ...complementaryExams,
                  {
                    id: `ex-${Date.now()}`,
                    name: 'Audiometria Ocupacional',
                    date: new Date().toISOString().slice(0, 10),
                    result: 'normal',
                  },
                ]);
              }}
              className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold cursor-pointer"
            >
              + Adicionar Exame
            </button>
          </div>

          <div className="space-y-2">
            {complementaryExams.map((ex, idx) => (
              <div
                key={ex.id}
                className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
              >
                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => {
                    const copy = [...complementaryExams];
                    copy[idx].name = e.target.value;
                    setComplementaryExams(copy);
                  }}
                  className="flex-1 min-w-[200px] px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                  placeholder="Nome do exame complementar"
                />
                <input
                  type="date"
                  value={ex.date}
                  onChange={(e) => {
                    const copy = [...complementaryExams];
                    copy[idx].date = e.target.value;
                    setComplementaryExams(copy);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                />
                <select
                  value={ex.result}
                  onChange={(e) => {
                    const copy = [...complementaryExams];
                    copy[idx].result = e.target.value as any;
                    setComplementaryExams(copy);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="normal">Normal</option>
                  <option value="alterado">Alterado</option>
                  <option value="estavel">Alterado Estável</option>
                  <option value="pendente">Pendente</option>
                </select>
                {complementaryExams.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setComplementaryExams(
                        complementaryExams.filter((_, i) => i !== idx)
                      );
                    }}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 px-1 cursor-pointer"
                  >
                    remover
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TÓPICOS DE PERGUNTAS CLÍNICO-OCUPACIONAIS (OPCIONAL - ENTRE 3 E 4) */}
      <QuestionnaireSection
        categories={questionnaireCategories}
        onChangeCategories={setQuestionnaireCategories}
        employeeRole={employee.role}
      />

      {/* PASSO 4: Conclusão Médica e Emissão */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Conclusão Médica Ocupacional (NR-7)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seleção do parecer de aptidão para a função ou opção em branco para preenchimento manual no papel.
              </p>
            </div>
          </div>
        </div>

        {/* Parecer Buttons: APTO vs INAPTO vs APTO COM RESTRIÇÕES vs EM BRANCO (PAPEL) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
          
          {/* APTO */}
          <button
            type="button"
            onClick={() => setFitness('apto')}
            className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
              fitness === 'apto'
                ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                fitness === 'apto'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold tracking-wide uppercase text-slate-900 dark:text-white">
                APTO
              </span>
              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                Sem restrições
              </span>
            </div>
          </button>

          {/* INAPTO */}
          <button
            type="button"
            onClick={() => setFitness('inapto')}
            className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
              fitness === 'inapto'
                ? 'border-rose-600 bg-rose-50/90 dark:bg-rose-950/70 text-rose-950 dark:text-rose-100 shadow-sm ring-2 ring-rose-500/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                fitness === 'inapto'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
              }`}
            >
              <XCircle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold tracking-wide uppercase text-slate-900 dark:text-white">
                INAPTO
              </span>
              <span className="block text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                Temporário ou definitivo
              </span>
            </div>
          </button>

          {/* APTO COM RESTRIÇÕES */}
          <button
            type="button"
            onClick={() => setFitness('apto_com_restricoes')}
            className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
              fitness === 'apto_com_restricoes'
                ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                fitness === 'apto_com_restricoes'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold tracking-wide uppercase text-slate-900 dark:text-white">
                COM RESTRIÇÕES
              </span>
              <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                Com limitações
              </span>
            </div>
          </button>

          {/* EM BRANCO (PAPEL) */}
          <button
            type="button"
            onClick={() => setFitness('em_branco')}
            className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
              fitness === 'em_branco'
                ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 shadow-sm ring-2 ring-indigo-500/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                fitness === 'em_branco'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
              }`}
            >
              <FileEdit className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold tracking-wide uppercase text-slate-900 dark:text-white">
                EM BRANCO (PAPEL)
              </span>
              <span className="block text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                Preencher na folha
              </span>
            </div>
          </button>
        </div>


        {/* Restrictions detail field if selected */}
        {fitness === 'apto_com_restricoes' && (
          <div className="mb-4 p-3.5 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
            <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
              Descreva as Restrições Médicas Ocupacionais *
            </label>
            <textarea
              rows={2}
              required
              value={restrictionsNote}
              onChange={(e) => setRestrictionsNote(e.target.value)}
              placeholder="Ex: Restrição para levantamento manual de peso superior a 10 kg e trabalho em altura."
              className="w-full text-xs p-2.5 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        )}

        {/* General Observações do ASO */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Observações Adicionais para Impressão no ASO (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações complementares a serem impressas..."
            className="w-full text-xs px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Floating Bottom Actions Bar for maximum speed */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
          {/* Reset / Limpar */}
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Limpar formulário atual"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar
          </button>

          {/* Finalizar e Gerar ASO (Abre visualização de impressão A4) */}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            Finalizar e Gerar ASO (A4)
          </button>
        </div>
      </div>
    </form>
  );
};
