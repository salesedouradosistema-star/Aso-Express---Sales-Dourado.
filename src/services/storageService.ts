import { Company, Doctor, ASORecord, SessionStats, TimbradoConfig, JobRoleTemplate } from '../types';
import { DEFAULT_COMPANY, DEFAULT_DOCTOR, INITIAL_COMPANIES, SAMPLE_INITIAL_ASOS, INITIAL_JOB_ROLES } from '../data/defaultData';
import {
  syncCompanyToFirestore,
  deleteCompanyFromFirestore,
  syncDoctorToFirestore,
  syncJobRoleToFirestore,
  deleteJobRoleFromFirestore,
  syncASOToFirestore,
  deleteASOFromFirestore,
  subscribeToCompanies,
  subscribeToDoctors,
  subscribeToJobRoles,
  subscribeToASOHistory,
} from './firebase';

export const DEFAULT_TIMBRADO_URL = '/timbrado.jpg';
export const REMOTE_TIMBRADO_FALLBACK = 'https://raw.githubusercontent.com/Gasmonkin/IMG/ac2bfa5d00f1d20b01a4a270310df5a289093844/sales%20e%20dourado%20timbrado%20final.jpg';

const STORAGE_KEYS = {
  ACTIVE_COMPANY: 'aso_active_company_v3',
  COMPANIES_LIST: 'aso_companies_list_v3',
  ACTIVE_DOCTOR: 'aso_active_doctor_v3',
  ASO_HISTORY: 'aso_records_history_v3',
  LAST_CITY: 'aso_last_city_v3',
  TIMBRADO_CONFIG: 'aso_timbrado_config_v1',
  JOB_ROLES: 'aso_job_roles_list_v3',
  DELETED_ASO_IDS: 'aso_deleted_ids_v1',
};

// Purge legacy mock data from previous sessions
try {
  const legacyKeys = [
    'aso_firebase_config_v1',
    'aso_active_company_v1',
    'aso_companies_list_v1',
    'aso_active_doctor_v1',
    'aso_job_roles_list_v1',
    'aso_last_city_v1',
    'aso_records_history_v1',
    'aso_active_company_v2',
    'aso_companies_list_v2',
    'aso_active_doctor_v2',
    'aso_job_roles_list_v2',
    'aso_last_city_v2',
    'aso_records_history_v2',
  ];
  legacyKeys.forEach((key) => localStorage.removeItem(key));
} catch (e) {
  // Ignore in environments without localStorage
}

// --- Active Company ---
export function getActiveCompany(): Company {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse active company', err);
  }
  return DEFAULT_COMPANY;
}

export function setActiveCompany(company: Company): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, JSON.stringify(company));
  if (company.name.trim() || company.cnpj.trim()) {
    saveCompanyToList(company);
  }
  syncCompanyToFirestore(company);
  dispatchUpdateEvent();
}

// --- Companies List ---
export function getSavedCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to parse companies list', err);
  }
  return INITIAL_COMPANIES;
}

export function saveCompanyToList(company: Company): void {
  if (!company.name.trim() && !company.cnpj.trim()) return;
  const companies = getSavedCompanies();
  const index = companies.findIndex((c) => (c.id && c.id === company.id) || (c.cnpj && c.cnpj === company.cnpj));
  if (index >= 0) {
    companies[index] = company;
  } else {
    companies.unshift(company);
  }
  localStorage.setItem(STORAGE_KEYS.COMPANIES_LIST, JSON.stringify(companies));
  syncCompanyToFirestore(company);
}

export function deleteCompanyFromList(id: string): void {
  const companies = getSavedCompanies().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.COMPANIES_LIST, JSON.stringify(companies));
  deleteCompanyFromFirestore(id);
  dispatchUpdateEvent();
}

// --- Job Roles / Cargos e Funções List ---
export function getSavedJobRoles(): JobRoleTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.JOB_ROLES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse job roles list', err);
  }
  return INITIAL_JOB_ROLES;
}

export function saveJobRole(role: JobRoleTemplate): void {
  const roles = getSavedJobRoles();
  const index = roles.findIndex((r) => r.id === role.id);
  const updatedRole = {
    ...role,
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) {
    roles[index] = updatedRole;
  } else {
    roles.unshift(updatedRole);
  }
  localStorage.setItem(STORAGE_KEYS.JOB_ROLES, JSON.stringify(roles));
  syncJobRoleToFirestore(updatedRole);
  dispatchUpdateEvent();
}

export function deleteJobRole(id: string): void {
  const roles = getSavedJobRoles().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.JOB_ROLES, JSON.stringify(roles));
  deleteJobRoleFromFirestore(id);
  dispatchUpdateEvent();
}

export function getJobRoleById(id: string): JobRoleTemplate | undefined {
  return getSavedJobRoles().find((r) => r.id === id);
}

// --- Active Doctor ---
export function getActiveDoctor(): Doctor {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_DOCTOR);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse active doctor', err);
  }
  return DEFAULT_DOCTOR;
}

export function setActiveDoctor(doctor: Doctor): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_DOCTOR, JSON.stringify(doctor));
  syncDoctorToFirestore(doctor);
  dispatchUpdateEvent();
}

// --- City ---
export function getLastCity(): string {
  return localStorage.getItem(STORAGE_KEYS.LAST_CITY) || '';
}

export function setLastCity(city: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_CITY, city);
}

// --- Reset / Wipe All System Data ---
export function resetAllSystemData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_COMPANY);
    localStorage.removeItem(STORAGE_KEYS.COMPANIES_LIST);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_DOCTOR);
    localStorage.removeItem(STORAGE_KEYS.JOB_ROLES);
    localStorage.removeItem(STORAGE_KEYS.LAST_CITY);
    localStorage.removeItem(STORAGE_KEYS.ASO_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.DELETED_ASO_IDS);
  } catch (err) {
    console.error('Failed to reset all system data', err);
  }
  dispatchUpdateEvent();
}

// --- Tracking Deleted ASOs to Prevent Zombie Resurrections ---
export function getDeletedASOIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_ASO_IDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markASOAsDeleted(id: string): void {
  try {
    const current = getDeletedASOIds();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(STORAGE_KEYS.DELETED_ASO_IDS, JSON.stringify(current.slice(-200)));
    }
  } catch (e) {
    console.warn('Failed to record deleted ASO id', e);
  }
}

export function removeDeletedASOId(id: string): void {
  try {
    const current = getDeletedASOIds();
    const updated = current.filter((item) => item !== id);
    localStorage.setItem(STORAGE_KEYS.DELETED_ASO_IDS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to remove deleted ASO id', e);
  }
}

// --- ASO History ---
export function getASOHistory(): ASORecord[] {
  try {
    // Clear legacy mock history if still present in client
    if (localStorage.getItem('aso_records_history_v1')) {
      localStorage.removeItem('aso_records_history_v1');
    }
    if (localStorage.getItem('aso_records_history_v2')) {
      localStorage.removeItem('aso_records_history_v2');
    }

    const raw = localStorage.getItem(STORAGE_KEYS.ASO_HISTORY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const deleted = new Set(getDeletedASOIds());
        return list.filter((item) => item && item.id && !deleted.has(item.id));
      }
    }
  } catch (err) {
    console.error('Failed to load ASO history', err);
  }
  return [];
}

export function clearASOHistory(): void {
  try {
    localStorage.removeItem('aso_records_history_v1');
    localStorage.removeItem('aso_records_history_v2');
    localStorage.setItem(STORAGE_KEYS.ASO_HISTORY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear ASO history', err);
  }
  dispatchUpdateEvent();
}

export function saveASO(aso: ASORecord): ASORecord {
  try {
    removeDeletedASOId(aso.id);
    const list = getASOHistory();
    const existingIdx = list.findIndex((a) => a.id === aso.id);
    if (existingIdx >= 0) {
      list[existingIdx] = aso;
    } else {
      list.unshift(aso);
    }
    localStorage.setItem(STORAGE_KEYS.ASO_HISTORY, JSON.stringify(list));
    dispatchUpdateEvent();
  } catch (err) {
    console.error('Failed to save ASO locally:', err);
  }

  // Sync to Firestore in background
  syncASOToFirestore(aso).catch((err) => {
    console.error('[Firestore] Erro ao sincronizar ASO:', err);
  });

  return aso;
}

export function deleteASO(id: string): void {
  try {
    markASOAsDeleted(id);
    const list = getASOHistory().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ASO_HISTORY, JSON.stringify(list));
    dispatchUpdateEvent();
  } catch (err) {
    console.error('Failed to delete ASO locally:', err);
  }
  deleteASOFromFirestore(id).catch((err) => {
    console.warn('[Firestore] Erro ao excluir ASO na nuvem:', err);
  });
}

export function getASOById(id: string): ASORecord | undefined {
  return getASOHistory().find((a) => a.id === id);
}

export function generateNextASOCode(): string {
  const history = getASOHistory();
  const year = new Date().getFullYear();
  const count = history.length + 1;
  return `ASO-${year}-${String(count).padStart(4, '0')}`;
}

export function getSessionStats(): SessionStats {
  const history = getASOHistory();
  return {
    total: history.length,
    aptos: history.filter((a) => a.fitness === 'apto').length,
    inaptos: history.filter((a) => a.fitness === 'inapto').length,
    comRestricoes: history.filter((a) => a.fitness === 'apto_com_restricoes').length,
    emBranco: history.filter((a) => a.fitness === 'em_branco').length,
  };
}

// --- CSV Export (HR Batch Handover) ---
export function exportBatchCSV(): string {
  const history = getASOHistory();
  const headers = [
    'Código ASO',
    'Data Emissão',
    'Empresa',
    'CNPJ Empresa',
    'Colaborador',
    'CPF',
    'Cargo/Função',
    'Setor',
    'Tipo de Exame',
    'Parecer Médico',
    'Médico Examinador',
    'CRM',
  ];

  const rows = history.map((item) => [
    `"${item.asoCode}"`,
    `"${item.issueDate}"`,
    `"${item.company.name.replace(/"/g, '""')}"`,
    `"${item.company.cnpj}"`,
    `"${item.employee.name.replace(/"/g, '""')}"`,
    `"${item.employee.cpf}"`,
    `"${item.employee.role.replace(/"/g, '""')}"`,
    `"${(item.employee.department || '').replace(/"/g, '""')}"`,
    `"${item.examType.toUpperCase()}"`,
    `"${item.fitness === 'em_branco' ? 'EM BRANCO (PAPEL)' : item.fitness.toUpperCase()}"`,
    `"${item.doctor.name.replace(/"/g, '""')}"`,
    `"${item.doctor.crm}/${item.doctor.crmUf}"`,
  ]);

  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
}

export function downloadBatchCSV(filename = 'lote_atendimentos_aso.csv'): void {
  const csv = exportBatchCSV();
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportFullBackupJSON(): string {
  const data = {
    activeCompany: getActiveCompany(),
    companiesList: getSavedCompanies(),
    activeDoctor: getActiveDoctor(),
    jobRolesList: getSavedJobRoles(),
    asoHistory: getASOHistory(),
    exportedAt: new Date().toISOString(),
    version: '1.1.0',
  };
  return JSON.stringify(data, null, 2);
}

export function importFullBackupJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.activeCompany) localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, JSON.stringify(data.activeCompany));
    if (data.companiesList) localStorage.setItem(STORAGE_KEYS.COMPANIES_LIST, JSON.stringify(data.companiesList));
    if (data.activeDoctor) localStorage.setItem(STORAGE_KEYS.ACTIVE_DOCTOR, JSON.stringify(data.activeDoctor));
    if (data.jobRolesList) localStorage.setItem(STORAGE_KEYS.JOB_ROLES, JSON.stringify(data.jobRolesList));
    if (data.asoHistory) localStorage.setItem(STORAGE_KEYS.ASO_HISTORY, JSON.stringify(data.asoHistory));
    dispatchUpdateEvent();
    return true;
  } catch (e) {
    console.error('Failed to import backup', e);
    return false;
  }
}

// --- Timbrado (Papel Timbrado de Fundo) ---
export function getTimbradoConfig(): TimbradoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMBRADO_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse timbrado config', err);
  }
  return {
    enabled: true,
    imageUrl: DEFAULT_TIMBRADO_URL,
    clinicName: 'Sales & Dourado Medicina e Segurança do Trabalho',
  };
}

export function setTimbradoConfig(config: TimbradoConfig): void {
  localStorage.setItem(STORAGE_KEYS.TIMBRADO_CONFIG, JSON.stringify(config));
  dispatchUpdateEvent();
}

// React custom event helper (deferred to next macrotask to avoid re-entrant setState in React Fiber)
let updateEventTimeout: ReturnType<typeof setTimeout> | null = null;
function dispatchUpdateEvent(): void {
  if (updateEventTimeout) {
    clearTimeout(updateEventTimeout);
  }
  updateEventTimeout = setTimeout(() => {
    updateEventTimeout = null;
    window.dispatchEvent(new Event('aso_storage_updated'));
  }, 10);
}

// --- Firestore Realtime Synchronization Controller ---
let isFirestoreInitialized = false;

export function initFirestoreSync(): () => void {
  if (isFirestoreInitialized) return () => {};
  isFirestoreInitialized = true;

  const unsubs: (() => void)[] = [];

  // Seed default items to cloud if needed
  try {
    const currentCompanies = getSavedCompanies();
    if (currentCompanies.length > 0) {
      currentCompanies.forEach((c) => syncCompanyToFirestore(c));
    }
    const currentDoctor = getActiveDoctor();
    if (currentDoctor && currentDoctor.name) {
      syncDoctorToFirestore(currentDoctor);
    }
    const currentRoles = getSavedJobRoles();
    if (currentRoles.length > 0) {
      currentRoles.forEach((r) => syncJobRoleToFirestore(r));
    }
    // Seed any existing local ASOs to cloud as well
    const currentASOs = getASOHistory();
    if (currentASOs.length > 0) {
      currentASOs.forEach((a) => syncASOToFirestore(a));
    }
  } catch (err) {
    console.warn('[Firestore] Seed inicial:', err);
  }

  // 1. Listen to Companies from Firestore
  unsubs.push(
    subscribeToCompanies((remoteCompanies) => {
      if (remoteCompanies.length > 0) {
        localStorage.setItem(STORAGE_KEYS.COMPANIES_LIST, JSON.stringify(remoteCompanies));
        dispatchUpdateEvent();
      }
    })
  );

  // 2. Listen to Doctors from Firestore
  unsubs.push(
    subscribeToDoctors((remoteDoctors) => {
      if (remoteDoctors.length > 0) {
        const docItem = remoteDoctors[0];
        if (docItem) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_DOCTOR, JSON.stringify(docItem));
          dispatchUpdateEvent();
        }
      }
    })
  );

  // 3. Listen to Job Roles from Firestore
  unsubs.push(
    subscribeToJobRoles((remoteRoles) => {
      if (remoteRoles.length > 0) {
        localStorage.setItem(STORAGE_KEYS.JOB_ROLES, JSON.stringify(remoteRoles));
        dispatchUpdateEvent();
      }
    })
  );

  // 4. Listen to ASOs from Firestore (Robust bidirectional reconciliation)
  unsubs.push(
    subscribeToASOHistory((remoteASOs) => {
      const deletedIds = new Set(getDeletedASOIds());
      const validRemote = remoteASOs.filter((r) => r && r.id && !deletedIds.has(r.id));
      const localList = getASOHistory().filter((l) => l && l.id && !deletedIds.has(l.id));

      // If remote returned 0 records, but we have local records, do NOT wipe local history!
      if (validRemote.length === 0 && localList.length > 0) {
        // Upload local records to Firestore
        localList.forEach((item) => syncASOToFirestore(item));
        return;
      }

      // Merge remote and local by id so recent local records are never erased
      const map = new Map<string, ASORecord>();
      validRemote.forEach((r) => map.set(r.id, r));
      localList.forEach((l) => {
        if (!map.has(l.id)) {
          syncASOToFirestore(l);
          map.set(l.id, l);
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(b.createdAt || b.issueDate).getTime();
        const timeB = new Date(a.createdAt || a.issueDate).getTime();
        return timeA - timeB;
      });

      localStorage.setItem(STORAGE_KEYS.ASO_HISTORY, JSON.stringify(merged));
      dispatchUpdateEvent();
    })
  );

  return () => {
    unsubs.forEach((u) => u());
    isFirestoreInitialized = false;
  };
}

