/**
 * Types and interfaces for ASO Express - Occupational Health System (NR-7)
 */

export type ExamType =
  | 'admissional'
  | 'periodico'
  | 'retorno_trabalho'
  | 'mudanca_risco'
  | 'demissional'
  | 'em_branco';

export type ExamFitness = 'apto' | 'inapto' | 'apto_com_restricoes' | 'em_branco';

export interface Company {
  id: string;
  name: string; // Razão Social
  fantasyName?: string; // Nome Fantasia
  cnpj: string;
  address: string;
  responsible: string; // Nome do responsável/contato
  cnae?: string;
  riskGrade?: string; // Grau de risco ('1' a '4', 'indeterminado', 'em_branco')
  phone?: string;
  email?: string;
}

export interface Doctor {
  id: string;
  name: string;
  crm: string;
  crmUf: string;
  specialty: string;
  rqe?: string;
  phone?: string;
  email?: string;
  isCoordinator?: boolean;
}

export interface OccupationalRisks {
  physical: boolean; // Ruído, calor, frio, etc.
  physicalDetails?: string;
  physicalSubItems?: string[];

  chemical: boolean; // Poeiras, vapores, etc.
  chemicalDetails?: string;
  chemicalSubItems?: string[];

  biological: boolean; // Bactérias, vírus, etc.
  biologicalDetails?: string;
  biologicalSubItems?: string[];

  ergonomic: boolean; // Esforço repetitivo, postura, etc.
  ergonomicDetails?: string;
  ergonomicSubItems?: string[];

  accidental: boolean; // Queda, choque elétrico, corte, etc.
  accidentalDetails?: string;
  accidentalSubItems?: string[];

  psychosocial?: boolean; // Sobrecarga, pressão, assédio, etc.
  psychosocialDetails?: string;
  psychosocialSubItems?: string[];

  noneSpecific: boolean; // Ausência de riscos ocupacionais específicos
  printAllOptionsForManualCheck?: boolean; // Deixar todas as opções no documento para serem marcadas depois de impresso (NR-7 Item 7.5.19)
}

export interface Anamnesis {
  generalCondition: 'bom' | 'regular' | 'alterado';
  chronicDiseases: string[]; // ex: Hipertensão, Diabetes, etc.
  currentComplaints: string;
  continuousMedication: string;
  previousSurgeries: string;
  smoker: boolean;
  smokerStatus?: 'sim' | 'nao' | 'em_branco';
  smokerDetails?: string;
  alcohol: boolean;
  alcoholStatus?: 'sim' | 'nao' | 'em_branco';
  alcoholDetails?: string;
  bloodPressure: string; // ex: 120x80
  heartRate: string; // ex: 76 bpm
  weight: string; // kg
  height: string; // cm
  imc?: string;
  clinicalObservations: string;
}

export interface ComplementaryExam {
  id: string;
  name: string;
  date: string;
  result: 'normal' | 'alterado' | 'estavel' | 'pendente' | 'em_branco';
}

export interface Employee {
  name: string;
  cpf: string;
  rg?: string;
  birthDate: string;
  age?: number;
  gender: 'M' | 'F' | 'Outro';
  role: string; // Cargo / Função
  department: string; // Setor
  employeeCode?: string; // Matrícula
}

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  answer?: 'sim' | 'nao';
  selectedForPrint?: boolean; // Define se a pergunta deve aparecer no questionário impresso
  hasDetail?: boolean;
  detailLabel?: string;
  detailValue?: string;
  isCustom?: boolean; // Pergunta customizada adicionada pelo examinador
  roleSpecific?: string; // Nome da categoria profissional ou função vinculada
}

export interface QuestionnaireCategory {
  id: string;
  title: string;
  active: boolean;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireData {
  enabled: boolean;
  categories: QuestionnaireCategory[];
  printBlankForPaper?: boolean;
}

export interface ASORecord {
  id: string;
  asoCode: string;
  issueDate: string; // YYYY-MM-DD
  issueCity: string;
  company: Company;
  doctor: Doctor;
  employee: Employee;
  examType: ExamType;
  risks: OccupationalRisks;
  anamnesis: Anamnesis;
  questionnaire?: QuestionnaireData;
  complementaryExams: ComplementaryExam[];
  fitness: ExamFitness;
  restrictionsNote?: string;
  notes?: string;
  createdAt: string;
}

export interface SessionStats {
  total: number;
  aptos: number;
  inaptos: number;
  comRestricoes: number;
  emBranco?: number;
}

export interface TimbradoConfig {
  enabled: boolean;
  imageUrl: string;
  clinicName: string;
}

export interface JobRoleTemplate {
  id: string;
  name: string; // Nome do cargo / função
  department?: string; // Setor sugerido / padrão
  cbo?: string; // Código CBO (ex: 7822-20)
  description?: string; // Descrição sumária das atividades
  risks: OccupationalRisks; // Riscos ocupacionais específicos do cargo (NR-7)
  questionnaireCategories?: QuestionnaireCategory[]; // Questionário Clínico-Ocupacional pré-definido
  complementaryExams?: string[]; // Exames complementares sugeridos (opcional)
  createdAt?: string;
  updatedAt?: string;
}

export const MASTER_ADMIN_EMAIL = 'salesedouradosistema@gmail.com';

export interface AuthorizedUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  addedBy: string;
  addedAt: string;
  notes?: string;
  password?: string;
  authProvider?: 'password' | 'google' | 'both';
}

export interface AppUserSession {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: 'admin' | 'user';
  authProvider?: 'password' | 'google';
}
