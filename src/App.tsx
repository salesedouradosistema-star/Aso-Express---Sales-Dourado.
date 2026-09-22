/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Company, Doctor, ASORecord, SessionStats, JobRoleTemplate, AppUserSession } from './types';
import {
  getActiveCompany,
  setActiveCompany as persistActiveCompany,
  getSavedCompanies,
  getActiveDoctor,
  setActiveDoctor as persistActiveDoctor,
  getLastCity,
  setLastCity as persistLastCity,
  getASOHistory,
  getSessionStats,
  saveASO,
  getSavedJobRoles,
  generateNextASOCode,
  initFirestoreSync,
} from './services/storageService';
import {
  onConnectionStatusChange,
  onAuthChange,
  logoutUser,
  isMasterAdminEmail,
  checkIfEmailIsAuthorized,
  subscribeToAuthorizedUsers,
  checkRedirectLogin,
} from './services/firebase';
import { Header } from './components/Header';
import { ConfigModal } from './components/ConfigModal';
import { AttendanceFlow } from './components/AttendanceFlow';
import { ASOPrintView } from './components/ASOPrintView';
import { HistoryList } from './components/HistoryList';
import { LoginScreen } from './components/LoginScreen';
import { UnauthorizedScreen } from './components/UnauthorizedScreen';
import { AccessManagementModal } from './components/AccessManagementModal';
import { DEFAULT_RISKS } from './data/defaultData';

export default function App() {
  // Authentication & Access Authorization State
  const [currentUser, setCurrentUser] = useState<AppUserSession | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'attendance' | 'history' | 'preview'>('attendance');
  const [activeCompany, setActiveCompanyState] = useState<Company>(getActiveCompany);
  const [savedCompanies, setSavedCompaniesState] = useState<Company[]>(getSavedCompanies);
  const [activeDoctor, setActiveDoctorState] = useState<Doctor>(getActiveDoctor);
  const [savedRoles, setSavedRolesState] = useState<JobRoleTemplate[]>(getSavedJobRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [appliedRoleTrigger, setAppliedRoleTrigger] = useState<{ role: JobRoleTemplate; timestamp: number } | null>(null);
  const [issueCity, setIssueCityState] = useState<string>(getLastCity);
  const [history, setHistoryState] = useState<ASORecord[]>(getASOHistory);
  const [stats, setStatsState] = useState<SessionStats>(getSessionStats);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configModalTab, setConfigModalTab] = useState<'company' | 'doctor' | 'roles' | 'timbrado'>('company');

  // Dark Mode state: default to TRUE as requested ("Ative o tema escuro na pagina")
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('aso_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return true; // Default dark
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aso_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aso_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Monitor Authentication and Whitelist Permissions
  useEffect(() => {
    // Process redirect sign-in if returning from Google redirect
    checkRedirectLogin().catch((err) => {
      console.warn('[Auth] Erro ao recuperar resultado de redirect:', err);
    });

    let unsubWhitelist: (() => void) | null = null;

    const unsubAuth = onAuthChange(async (user) => {
      setCurrentUser(user);

      if (!user || !user.email) {
        setIsAuthorized(false);
        setAuthLoading(false);
        if (unsubWhitelist) {
          unsubWhitelist();
          unsubWhitelist = null;
        }
        return;
      }

      const cleanEmail = user.email.toLowerCase().trim();
      const isMaster = isMasterAdminEmail(cleanEmail);

      // ONLY master admin bypasses whitelist.
      // Every other user (including previous password sessions) MUST be explicitly listed in authorized_users.
      if (isMaster) {
        setIsAuthorized(true);
        user.role = 'admin';
        setAuthLoading(false);
      } else {
        // Check whitelist
        try {
          const authResult = await checkIfEmailIsAuthorized(cleanEmail);
          setIsAuthorized(authResult.authorized);
          user.role = authResult.role || 'user';
          if (!authResult.authorized) {
            console.warn(`[Auth] Usuário não autorizado detectado: ${cleanEmail}. Encerrando sessão.`);
            await logoutUser();
          }
        } catch (err) {
          console.warn('[Auth] Erro ao verificar whitelist:', err);
          setIsAuthorized(false);
        } finally {
          setAuthLoading(false);
        }
      }

      // Realtime listener to permissions updates
      if (unsubWhitelist) {
        unsubWhitelist();
      }
      unsubWhitelist = subscribeToAuthorizedUsers((list) => {
        const emailNow = user.email?.toLowerCase().trim() || '';
        const isMasterNow = isMasterAdminEmail(emailNow);
        const match = list.find((item) => item.email.toLowerCase().trim() === emailNow);
        const allowed = isMasterNow || !!match;

        if (!allowed) {
          console.warn(`[Auth] Acesso revogado em tempo real para: ${emailNow}`);
          setIsAuthorized(false);
          logoutUser();
        } else {
          setIsAuthorized(true);
          user.role = isMasterNow ? 'admin' : (match?.role || 'user');
        }
      });
    });

    return () => {
      unsubAuth();
      if (unsubWhitelist) unsubWhitelist();
    };
  }, []);

  const handleOpenSettings = (tab: 'company' | 'doctor' | 'roles' | 'timbrado' = 'company') => {
    setConfigModalTab(tab);
    setIsConfigModalOpen(true);
  };
  const [currentASOForPreview, setCurrentASOForPreview] = useState<ASORecord | null>(() => {
    const list = getASOHistory();
    return list.length > 0 ? list[0] : null;
  });
  const [asoToEdit, setAsoToEdit] = useState<ASORecord | null>(null);
  const [newAttendanceTrigger, setNewAttendanceTrigger] = useState<number>(0);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  // Initialize Firestore realtime sync and status monitoring ONLY when authenticated & authorized
  useEffect(() => {
    if (!currentUser || !isAuthorized) return;

    const unsubSync = initFirestoreSync();
    const unsubStatus = onConnectionStatusChange((status) => {
      setIsDbConnected(status);
    });
    return () => {
      unsubSync();
      unsubStatus();
    };
  }, [currentUser, isAuthorized]);


  // Sync state whenever storage changes
  const reloadFromStorage = useCallback(() => {
    setActiveCompanyState(getActiveCompany());
    setSavedCompaniesState(getSavedCompanies());
    setActiveDoctorState(getActiveDoctor());
    setSavedRolesState(getSavedJobRoles());
    setIssueCityState(getLastCity());
    setHistoryState(getASOHistory());
    setStatsState(getSessionStats());
  }, []);

  useEffect(() => {
    window.addEventListener('aso_storage_updated', reloadFromStorage);
    return () => {
      window.removeEventListener('aso_storage_updated', reloadFromStorage);
    };
  }, [reloadFromStorage]);

  const handleSelectRoleFromHeader = (roleId: string) => {
    setSelectedRoleId(roleId);
    if (!roleId) return;
    const currentRoles = getSavedJobRoles();
    const role = currentRoles.find((r) => r.id === roleId) || savedRoles.find((r) => r.id === roleId);
    if (role) {
      setAppliedRoleTrigger({ role, timestamp: Date.now() });
      setActiveTab('attendance');
    }
  };

  const handleUpdateActiveCompany = (company: Company) => {
    persistActiveCompany(company);
    setActiveCompanyState(company);
  };

  const handleUpdateActiveDoctor = (doctor: Doctor) => {
    persistActiveDoctor(doctor);
    setActiveDoctorState(doctor);
  };

  const handleUpdateIssueCity = (city: string) => {
    persistLastCity(city);
    setIssueCityState(city);
  };

  const [attendanceKey, setAttendanceKey] = useState<number>(() => Date.now());

  const handleRoleChangeInFlow = useCallback((id: string) => {
    setSelectedRoleId(id);
  }, []);

  const handleResetFormInFlow = useCallback(() => {
    setAsoToEdit(null);
    setSelectedRoleId('');
    setAppliedRoleTrigger(null);
  }, []);

  const handleASOGenerated = (aso: ASORecord) => {
    setCurrentASOForPreview(aso);
    setActiveTab('preview');
    // Clear editing / prefilled demo state so subsequent attendances are clean
    setAsoToEdit(null);
    setSelectedRoleId('');
    setAppliedRoleTrigger(null);
    setAttendanceKey(Date.now());
  };

  const handleSelectASOToPrint = (aso: ASORecord) => {
    setCurrentASOForPreview(aso);
    setActiveTab('preview');
  };

  const handleNewAttendance = useCallback(() => {
    setAsoToEdit(null);
    setSelectedRoleId('');
    setAppliedRoleTrigger(null);
    setNewAttendanceTrigger((prev) => prev + 1);
    setAttendanceKey(Date.now());
    setActiveTab('attendance');
  }, []);

  const demoIndexRef = useRef<number>(0);

  // Demo pre-fill generator for lightning-fast testing during evaluation
  const handleQuickDemoFill = () => {
    const currentRoles = getSavedJobRoles();

    const baseDemoEmployees = [
      {
        name: 'Juliana Beatriz Santos',
        cpf: '284.912.438-19',
        birthDate: '1995-08-22',
        gender: 'F' as const,
        role: 'Técnica de Segurança do Trabalho',
        department: 'SESMT Corporativo',
        employeeCode: 'FUN-9012',
      },
      {
        name: 'Marcos Vinícius de Alencar',
        cpf: '192.834.756-02',
        birthDate: '1988-11-14',
        gender: 'M' as const,
        role: 'Mecânico de Manutenção Industrial',
        department: 'Manutenção Geral',
        employeeCode: 'FUN-3450',
      },
      {
        name: 'Camila Fernandes Lima',
        cpf: '350.218.490-88',
        birthDate: '1999-03-30',
        gender: 'F' as const,
        role: 'Assistente de Logística e Expedição',
        department: 'Almoxarifado Central',
        employeeCode: 'FUN-7821',
      },
      {
        name: 'Rodrigo Mendonça Silva',
        cpf: '419.673.820-54',
        birthDate: '1992-06-18',
        gender: 'M' as const,
        role: 'Eletricista de Manutenção',
        department: 'Instalações Elétricas',
        employeeCode: 'FUN-5120',
      },
      {
        name: 'Patrícia Souza Rocha',
        cpf: '582.149.308-72',
        birthDate: '1997-12-05',
        gender: 'F' as const,
        role: 'Operadora de Produção',
        department: 'Linha Operacional',
        employeeCode: 'FUN-6401',
      },
    ];

    // Pick cyclically so every click on "Exemplo Rápido" always changes to a new employee
    const idx = demoIndexRef.current % baseDemoEmployees.length;
    demoIndexRef.current += 1;
    const chosen = { ...baseDemoEmployees[idx] };

    // If custom saved roles exist in the system, allow demonstrating them
    let matchedSavedRole: JobRoleTemplate | undefined = undefined;
    if (currentRoles.length > 0) {
      matchedSavedRole = currentRoles.find(
        (r) => r.name.toLowerCase().trim() === chosen.role.toLowerCase().trim()
      );
      if (!matchedSavedRole && idx % 2 === 1) {
        const sr = currentRoles[(idx >> 1) % currentRoles.length];
        chosen.role = sr.name;
        if (sr.department) chosen.department = sr.department;
        matchedSavedRole = sr;
      }
    }

    const demoRisks = matchedSavedRole?.risks || { ...DEFAULT_RISKS };
    const demoQuestions =
      matchedSavedRole?.questionnaireCategories && matchedSavedRole.questionnaireCategories.length > 0
        ? JSON.parse(JSON.stringify(matchedSavedRole.questionnaireCategories))
        : undefined;

    const demoExams =
      matchedSavedRole?.complementaryExams && matchedSavedRole.complementaryExams.length > 0
        ? [
            {
              id: `c-demo-base-${Date.now()}`,
              name: 'Avaliação Clínica Ocupacional',
              date: new Date().toISOString().slice(0, 10),
              result: 'em_branco' as const,
            },
            ...matchedSavedRole.complementaryExams.map((examName, eIdx) => ({
              id: `c-demo-${Date.now()}-${eIdx}`,
              name: examName,
              date: new Date().toISOString().slice(0, 10),
              result: 'em_branco' as const,
            })),
          ]
        : [
            {
              id: `c-demo-base-${Date.now()}`,
              name: 'Avaliação Clínica Ocupacional',
              date: new Date().toISOString().slice(0, 10),
              result: 'em_branco' as const,
            },
            {
              id: `c-demo-audio-${Date.now()}`,
              name: 'Audiometria Tonal Ocupacional',
              date: new Date().toISOString().slice(0, 10),
              result: 'em_branco' as const,
            },
          ];

    const demoASO: ASORecord = {
      id: `demo-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      asoCode: generateNextASOCode(),
      issueDate: new Date().toISOString().slice(0, 10),
      issueCity,
      company: activeCompany,
      doctor: activeDoctor,
      employee: {
        ...chosen,
        age: new Date().getFullYear() - parseInt(chosen.birthDate.slice(0, 4)),
      },
      examType: 'em_branco',
      risks: {
        ...demoRisks,
        printAllOptionsForManualCheck: true,
      },
      anamnesis: {
        generalCondition: 'bom',
        chronicDiseases: [],
        currentComplaints: '',
        continuousMedication: '',
        previousSurgeries: '',
        smoker: false,
        smokerStatus: 'em_branco',
        alcohol: false,
        alcoholStatus: 'em_branco',
        bloodPressure: '',
        heartRate: '',
        weight: '',
        height: '',
        imc: '',
        clinicalObservations: '',
      },
      complementaryExams: demoExams,
      questionnaire: demoQuestions
        ? { enabled: true, categories: demoQuestions }
        : {
            enabled: true,
            categories: [
              {
                id: 'antecedentes',
                title: 'ANTECEDENTES PESSOAIS E ANAMNESE OCUPACIONAL',
                active: true,
                questions: [
                  { id: 'ant_1', text: 'Possui alguma doença crônica?', answer: 'nao', hasDetail: true, detailLabel: 'Qual?' },
                  { id: 'ant_2', text: 'Faz uso contínuo de medicamentos?', answer: 'nao', hasDetail: true, detailLabel: 'Quais?' },
                  { id: 'ant_3', text: 'Já sofreu acidentes de trabalho ou fora do trabalho?', answer: 'nao', hasDetail: true, detailLabel: 'Qual(is)?' },
                  { id: 'ant_4', text: 'Tem histórico de alergias, convulsões ou desmaios?', answer: 'nao', hasDetail: true, detailLabel: 'Especificar:' },
                  { id: 'ant_5', text: 'Já foi submetido a cirurgias ou internações?', answer: 'nao', hasDetail: true, detailLabel: 'Qual(is)?' },
                  { id: 'ant_6', text: 'Já teve afastamento pelo INSS?', answer: 'nao', hasDetail: true, detailLabel: 'Quais?' },
                  { id: 'ant_7', text: 'Já sofreu alguma fratura?', answer: 'nao', hasDetail: true, detailLabel: 'Qual(is)?' },
                  { id: 'ant_8', text: 'Já exerceu atividades administrativas ou jurídicas?', answer: 'sim', hasDetail: false },
                  { id: 'ant_9', text: 'Já trabalhou com computador por períodos prolongados?', answer: 'sim', hasDetail: false },
                  { id: 'ant_10', text: 'Já foi considerado inapto em exame ocupacional?', answer: 'nao', hasDetail: false },
                ],
              },
              {
                id: 'saude_mental',
                title: 'SAÚDE MENTAL',
                active: false,
                questions: [
                  { id: 'sm_1', text: 'Já realizou tratamento psicológico?', answer: 'nao', hasDetail: false },
                  { id: 'sm_2', text: 'Já consultou psiquiatra?', answer: 'nao', hasDetail: false },
                  { id: 'sm_3', text: 'Já recebeu diagnóstico de depressão, ansiedade ou outro transtorno mental?', answer: 'nao', hasDetail: true, detailLabel: 'Qual?' },
                  { id: 'sm_4', text: 'Faz uso de antidepressivos ou ansiolíticos?', answer: 'nao', hasDetail: true, detailLabel: 'Quais?' },
                  { id: 'sm_5', text: 'Já precisou de afastamento por motivo psicológico?', answer: 'nao', hasDetail: false },
                ],
              },
              {
                id: 'osteomuscular',
                title: 'SISTEMA OSTEOMUSCULAR',
                active: false,
                questions: [
                  { id: 'ost_1', text: 'Tem dor nos ombros?', answer: 'nao', hasDetail: false },
                  { id: 'ost_2', text: 'Apresenta dor ou formigamento nos braços ou mãos?', answer: 'nao', hasDetail: false },
                  { id: 'ost_3', text: 'Já teve diagnóstico de LER/DORT?', answer: 'nao', hasDetail: false },
                  { id: 'ost_4', text: 'Possui limitação para digitar ou escrever?', answer: 'nao', hasDetail: false },
                  { id: 'ost_5', text: 'Já fez ou faz fisioterapia?', answer: 'nao', hasDetail: false },
                  { id: 'ost_6', text: 'Sente dores na coluna cervical, dorsal ou lombar?', answer: 'nao', hasDetail: false },
                ],
              },
              {
                id: 'visual_auditivo_habitos',
                title: 'SISTEMA VISUAL, AUDITIVO E HÁBITOS DE VIDA',
                active: false,
                questions: [
                  { id: 'vis_1', text: 'Usa óculos ou lentes de contato?', answer: 'sim', hasDetail: false },
                  { id: 'vis_2', text: 'Apresenta dificuldade para enxergar (mesmo com correção)?', answer: 'nao', hasDetail: false },
                  { id: 'vis_3', text: 'Apresenta dificuldade auditiva?', answer: 'nao', hasDetail: false },
                  { id: 'vis_4', text: 'Sente zumbidos com frequência?', answer: 'nao', hasDetail: false },
                  { id: 'vis_5', text: 'Fuma ou faz uso de bebidas alcoólicas (etilismo)?', answer: 'nao', hasDetail: false },
                  { id: 'vis_6', text: 'Considera seu sono adequado?', answer: 'sim', hasDetail: false },
                  { id: 'vis_7', text: 'Pratica atividade física regular?', answer: 'sim', hasDetail: true, detailLabel: 'Qual(is)?', detailValue: 'Corrida de rua 3x por semana' },
                ],
              },
            ],
          },
      fitness: 'em_branco',
      notes: 'Exame periódico realizado in loco conforme diretrizes da NR-7.',
      createdAt: new Date().toISOString(),
    };

    setAppliedRoleTrigger(null);
    setSelectedRoleId(matchedSavedRole ? matchedSavedRole.id : '');
    setAsoToEdit(demoASO);
    setAttendanceKey(Date.now());
    setActiveTab('attendance');
  };

  const handleRecheckAuth = async () => {
    if (!currentUser?.email) return;
    if (isMasterAdminEmail(currentUser.email)) {
      setIsAuthorized(true);
      return;
    }
    const authResult = await checkIfEmailIsAuthorized(currentUser.email);
    setIsAuthorized(authResult.authorized);
    if (!authResult.authorized) {
      await logoutUser();
    }
  };

  // 1. Loading Authentication State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-4">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-300 font-medium tracking-wide">
          Verificando autenticação e credenciais...
        </p>
      </div>
    );
  }

  // 2. Not Logged In -> Show Google Login Portal
  if (!currentUser) {
    return <LoginScreen />;
  }

  // 3. Authenticated with Google, but NOT authorized in whitelist
  if (!isAuthorized) {
    return (
      <UnauthorizedScreen
        userEmail={currentUser.email || ''}
        userName={currentUser.displayName}
        userPhoto={currentUser.photoURL}
        onRecheck={handleRecheckAuth}
      />
    );
  }

  // 4. Authenticated & Authorized -> Full System Access
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCompany={activeCompany}
        activeDoctor={activeDoctor}
        savedRoles={savedRoles}
        selectedRoleId={selectedRoleId}
        onSelectRole={handleSelectRoleFromHeader}
        stats={stats}
        onOpenSettings={handleOpenSettings}
        onQuickDemoFill={handleQuickDemoFill}
        onNewAttendance={handleNewAttendance}
        isPrintMode={false}
        isDbConnected={isDbConnected}
        currentUserEmail={currentUser.email}
        currentUserName={currentUser.displayName}
        currentUserPhoto={currentUser.photoURL}
        isMasterAdmin={isMasterAdminEmail(currentUser.email)}
        onOpenAccessManagement={() => setIsAccessModalOpen(true)}
        onLogout={() => logoutUser()}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'attendance' && (
          <AttendanceFlow
            key={attendanceKey}
            activeCompany={activeCompany}
            activeDoctor={activeDoctor}
            issueCity={issueCity}
            onASOGenerated={handleASOGenerated}
            onOpenSettings={(tab) => handleOpenSettings(tab || 'company')}
            initialASOToEdit={asoToEdit}
            externalRoleTrigger={appliedRoleTrigger}
            onClearExternalRoleTrigger={() => setAppliedRoleTrigger(null)}
            currentSelectedRoleId={selectedRoleId}
            onRoleChangeInFlow={handleRoleChangeInFlow}
            onResetForm={handleResetFormInFlow}
            onQuickDemoFill={handleQuickDemoFill}
            newAttendanceTrigger={newAttendanceTrigger}
          />
        )}

        {activeTab === 'preview' && currentASOForPreview && (
          <ASOPrintView
            aso={currentASOForPreview}
            onBackToEdit={() => {
              setAsoToEdit(currentASOForPreview);
              setAttendanceKey(Date.now());
              setActiveTab('attendance');
            }}
            onNewAttendance={handleNewAttendance}
          />
        )}

        {activeTab === 'history' && (
          <HistoryList
            history={history}
            stats={stats}
            onSelectASOToPrint={handleSelectASOToPrint}
            onStartNewAttendance={handleNewAttendance}
          />
        )}
      </main>

      {/* Session & Profiles Configuration Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        activeCompany={activeCompany}
        setActiveCompany={handleUpdateActiveCompany}
        savedCompanies={savedCompanies}
        activeDoctor={activeDoctor}
        setActiveDoctor={handleUpdateActiveDoctor}
        issueCity={issueCity}
        setIssueCity={handleUpdateIssueCity}
        initialTab={configModalTab}
        onRoleSelected={(role) => {
          handleSelectRoleFromHeader(role.id);
          setIsConfigModalOpen(false);
        }}
      />

      {/* Access Management Modal (Exclusive to Master Admin salesedourado) */}
      {isMasterAdminEmail(currentUser.email) && (
        <AccessManagementModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          currentUserEmail={currentUser.email || ''}
          currentUserRole={currentUser.role}
        />
      )}
    </div>
  );
}

