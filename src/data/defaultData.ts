import { Company, Doctor, OccupationalRisks, Anamnesis, ASORecord, QuestionnaireCategory, JobRoleTemplate } from '../types';

export const DEFAULT_DOCTOR: Doctor = {
  id: 'doc-default',
  name: '',
  crm: '',
  crmUf: '',
  specialty: '',
  rqe: '',
  phone: '',
  email: '',
  isCoordinator: false,
};

export const DEFAULT_QUESTIONNAIRE_CATEGORIES: QuestionnaireCategory[] = [
  {
    id: 'antecedentes',
    title: 'ANTECEDENTES PESSOAIS E ANAMNESE OCUPACIONAL',
    active: false,
    questions: [
      { id: 'ant_1', text: 'Possui alguma doença crônica?', hasDetail: true, detailLabel: 'Qual?' },
      { id: 'ant_2', text: 'Faz uso contínuo de medicamentos?', hasDetail: true, detailLabel: 'Quais?' },
      { id: 'ant_3', text: 'Já sofreu acidentes de trabalho ou fora do trabalho?', hasDetail: true, detailLabel: 'Qual(is)?' },
      { id: 'ant_4', text: 'Tem histórico de alergias, convulsões ou desmaios?', hasDetail: true, detailLabel: 'Especificar:' },
      { id: 'ant_5', text: 'Já foi submetido a cirurgias ou internações?', hasDetail: true, detailLabel: 'Qual(is)?' },
      { id: 'ant_6', text: 'Já teve afastamento pelo INSS?', hasDetail: true, detailLabel: 'Quais?' },
      { id: 'ant_7', text: 'Já sofreu alguma fratura?', hasDetail: true, detailLabel: 'Qual(is)?' },
      { id: 'ant_8', text: 'Já exerceu atividades administrativas ou jurídicas?', hasDetail: false },
      { id: 'ant_9', text: 'Já trabalhou com computador por períodos prolongados?', hasDetail: false },
      { id: 'ant_10', text: 'Já foi considerado inapto em exame ocupacional?', hasDetail: false },
    ],
  },
  {
    id: 'saude_mental',
    title: 'SAÚDE MENTAL',
    active: false,
    questions: [
      { id: 'sm_1', text: 'Já realizou tratamento psicológico?', hasDetail: false },
      { id: 'sm_2', text: 'Já consultou psiquiatra?', hasDetail: false },
      { id: 'sm_3', text: 'Já recebeu diagnóstico de depressão, ansiedade ou outro transtorno mental?', hasDetail: true, detailLabel: 'Qual?' },
      { id: 'sm_4', text: 'Faz uso de antidepressivos ou ansiolíticos?', hasDetail: true, detailLabel: 'Quais?' },
      { id: 'sm_5', text: 'Já precisou de afastamento por motivo psicológico?', hasDetail: false },
    ],
  },
  {
    id: 'osteomuscular',
    title: 'SISTEMA OSTEOMUSCULAR',
    active: false,
    questions: [
      { id: 'ost_1', text: 'Tem dor nos ombros?', hasDetail: false },
      { id: 'ost_2', text: 'Apresenta dor ou formigamento nos braços ou mãos?', hasDetail: false },
      { id: 'ost_3', text: 'Já teve diagnóstico de LER/DORT?', hasDetail: false },
      { id: 'ost_4', text: 'Possui limitação para digitar ou escrever?', hasDetail: false },
      { id: 'ost_5', text: 'Já fez ou faz fisioterapia?', hasDetail: false },
      { id: 'ost_6', text: 'Sente dores na coluna cervical, dorsal ou lombar?', hasDetail: false },
    ],
  },
  {
    id: 'visual_auditivo_habitos',
    title: 'SISTEMA VISUAL, AUDITIVO E HÁBITOS DE VIDA',
    active: false,
    questions: [
      { id: 'vis_1', text: 'Usa óculos ou lentes de contato?', hasDetail: false },
      { id: 'vis_2', text: 'Apresenta dificuldade para enxergar (mesmo com correção)?', hasDetail: false },
      { id: 'vis_3', text: 'Apresenta dificuldade auditiva?', hasDetail: false },
      { id: 'vis_4', text: 'Sente zumbidos com frequência?', hasDetail: false },
      { id: 'vis_5', text: 'Fuma ou faz uso de bebidas alcoólicas (etilismo)?', hasDetail: false },
      { id: 'vis_6', text: 'Considera seu sono adequado?', hasDetail: false },
      { id: 'vis_7', text: 'Pratica atividade física regular?', hasDetail: true, detailLabel: 'Qual(is)?' },
    ],
  },
];

export function getFreshQuestionnaireCategories(): QuestionnaireCategory[] {
  return JSON.parse(JSON.stringify(DEFAULT_QUESTIONNAIRE_CATEGORIES));
}

export function createRoleQuestionnaire(selectedQuestionIds: string[]): QuestionnaireCategory[] {
  const base = getFreshQuestionnaireCategories();
  return base.map((cat) => {
    let hasSelected = false;
    const questions = cat.questions.map((q) => {
      const isSelected = selectedQuestionIds.includes(q.id);
      if (isSelected) hasSelected = true;
      return {
        ...q,
        selectedForPrint: isSelected,
      };
    });
    return {
      ...cat,
      active: hasSelected,
      questions,
    };
  });
}

export const DEFAULT_COMPANY: Company = {
  id: 'comp-default',
  name: '',
  fantasyName: '',
  cnpj: '',
  address: '',
  responsible: '',
  cnae: '',
  riskGrade: '',
  phone: '',
  email: '',
};

export const INITIAL_COMPANIES: Company[] = [];

export const DEFAULT_RISKS: OccupationalRisks = {
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
  printAllOptionsForManualCheck: false,
};

export const DEFAULT_ANAMNESIS: Anamnesis = {
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
};

export const SAMPLE_INITIAL_ASOS: ASORecord[] = [];

export const EXAM_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  admissional: {
    label: 'Admissional',
    desc: 'Antes que o empregado inicie suas atividades profissionais',
  },
  periodico: {
    label: 'Periódico',
    desc: 'Avaliação da saúde em intervalos previstos no PCMSO',
  },
  retorno_trabalho: {
    label: 'Retorno ao Trabalho',
    desc: 'Após afastamento por período igual ou superior a 30 dias',
  },
  mudanca_risco: {
    label: 'Mudança de Riscos',
    desc: 'Antes de alteração de função ou setor que implique novos riscos',
  },
  demissional: {
    label: 'Demissional',
    desc: 'Até 10 dias após término do contrato de trabalho',
  },
  em_branco: {
    label: 'Em Branco (Preencher no Papel)',
    desc: 'Deixar desmarcado para assinalar à caneta na folha impressa',
  },
};

export const INITIAL_JOB_ROLES: JobRoleTemplate[] = [];


