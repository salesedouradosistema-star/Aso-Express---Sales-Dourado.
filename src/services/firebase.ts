import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Company, Doctor, JobRoleTemplate, ASORecord, AuthorizedUser, MASTER_ADMIN_EMAIL, AppUserSession } from '../types';

// Initialize Firebase App
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Safe, Lazy Firebase Auth Initialization to prevent race conditions during component registration
let _auth: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    try {
      _auth = getAuth(app);
    } catch {
      _auth = getAuth();
    }
    // Configure local persistence to avoid session drops across browser reloads
    try {
      setPersistence(_auth, browserLocalPersistence).catch((err) => {
        console.warn('[Auth] Aviso ao aplicar browserLocalPersistence:', err);
      });
    } catch (e) {
      console.warn('[Auth] Erro ao configurar persistência:', e);
    }
  }
  return _auth;
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getFirebaseAuth();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Checks if the application is currently running inside an iframe (like AI Studio preview).
 * When in an iframe, browser third-party storage & COOP restrictions block popup-to-opener communication,
 * causing Google sign-in to trigger 'auth/popup-closed-by-user'.
 */
export function isAppInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Standard Google Login using popup (ideal for top-level browser tabs).
 */
export async function loginWithGoogle(): Promise<User> {
  const authInstance = getFirebaseAuth();
  const result = await signInWithPopup(authInstance, googleProvider);
  return result.user;
}

/**
 * Fallback Google Login using direct redirect (ideal when popup blockers or browser cross-site tracking blocks popups).
 */
export async function loginWithGoogleRedirect(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await signInWithRedirect(authInstance, googleProvider);
}

/**
 * Checks for incoming redirect result when the page loads following a signInWithRedirect flow.
 */
export async function checkRedirectLogin(): Promise<User | null> {
  try {
    const authInstance = getFirebaseAuth();
    const result = await getRedirectResult(authInstance);
    if (result && result.user) {
      console.log('[Auth] Login via redirect concluído com sucesso:', result.user.email);
      return result.user;
    }
  } catch (err: any) {
    console.warn('[Auth] Erro ao checar resultado de redirect:', err);
  }
  return null;
}

const SESSION_STORAGE_KEY = 'aso_app_user_session_v2';

export function getStoredUserSession(): AppUserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Auth] Erro ao recuperar sessão salva:', e);
  }
  return null;
}

export function saveCustomSession(session: AppUserSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('[Auth] Erro ao salvar sessão:', e);
  }
}

export function clearCustomSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('[Auth] Erro ao remover sessão:', e);
  }
}

let authListeners: ((user: AppUserSession | null) => void)[] = [];
let currentAppSession: AppUserSession | null = getStoredUserSession();

function notifyAuthListeners(user: AppUserSession | null) {
  currentAppSession = user;
  authListeners.forEach((fn) => {
    try {
      fn(user);
    } catch (e) {
      console.warn('[Auth] Erro em listener de autenticação:', e);
    }
  });
}

export async function logoutUser(): Promise<void> {
  clearCustomSession();
  try {
    await signOut(getFirebaseAuth());
  } catch (e) {
    console.warn('[Auth] Erro ao deslogar do Firebase Auth:', e);
  }
  notifyAuthListeners(null);
}

export function onAuthChange(callback: (user: AppUserSession | null) => void): () => void {
  authListeners.push(callback);
  // Emit active session immediately
  callback(currentAppSession);

  const unsubFirebase = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
    if (firebaseUser) {
      const isMaster = isMasterAdminEmail(firebaseUser.email);
      const session: AppUserSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
        photoURL: firebaseUser.photoURL,
        authProvider: 'google',
        role: isMaster ? 'admin' : (currentAppSession?.role || 'user'),
      };
      saveCustomSession(session);
      notifyAuthListeners(session);
    } else {
      // If no Firebase user and no custom session in localStorage
      if (!getStoredUserSession()) {
        notifyAuthListeners(null);
      }
    }
  });

  return () => {
    authListeners = authListeners.filter((l) => l !== callback);
    unsubFirebase();
  };
}

// Initialize Firestore with specific database ID if configured and force long-polling
// to prevent streaming WebChannel connection drops in container / iframe / proxy environments
const dbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

export const db: Firestore = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      dbId
    );
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
})();

// Error handling per Firebase Integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const currentAuth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth.currentUser?.uid,
      email: currentAuth.currentUser?.email,
      emailVerified: currentAuth.currentUser?.emailVerified,
      isAnonymous: currentAuth.currentUser?.isAnonymous,
      tenantId: currentAuth.currentUser?.tenantId,
      providerInfo:
        currentAuth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// Connection status tracker
let isConnected = true;
let connectionListeners: ((connected: boolean) => void)[] = [];

export function onConnectionStatusChange(listener: (connected: boolean) => void): () => void {
  connectionListeners.push(listener);
  listener(isConnected);
  return () => {
    connectionListeners = connectionListeners.filter((l) => l !== listener);
  };
}

function setConnectionStatus(status: boolean) {
  if (isConnected !== status) {
    isConnected = status;
    connectionListeners.forEach((l) => l(status));
  }
}

// Test connection on startup per Firebase Integration guidelines
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

export async function testFirestoreConnection(): Promise<boolean> {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    setConnectionStatus(true);
    return true;
  } catch (error: any) {
    // If the doc doesn't exist or is permission-denied, connection reached backend successfully
    if (
      error?.code === 'not-found' ||
      error?.code === 'permission-denied' ||
      error?.message?.includes('not exist')
    ) {
      setConnectionStatus(true);
      return true;
    }

    // When backend is temporarily unreachable or offline
    if (
      error?.code === 'unavailable' ||
      (error instanceof Error && error.message.includes('the client is offline'))
    ) {
      console.warn('[Firestore] Cliente em modo offline ou reconectando...');
      setConnectionStatus(false);
      // Automatically retry in 5 seconds
      retryTimeout = setTimeout(() => {
        testFirestoreConnection();
      }, 5000);
      return false;
    }

    setConnectionStatus(true);
    return true;
  }
}

// Listen to browser network changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    testFirestoreConnection();
  });
  window.addEventListener('offline', () => {
    setConnectionStatus(false);
  });
}

// Boot connection test smoothly after initialization
setTimeout(() => {
  testFirestoreConnection();
}, 500);

// --- Firestore Sync Helpers ---

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  return JSON.parse(JSON.stringify(data));
}

// 1. Companies
export async function syncCompanyToFirestore(company: Company): Promise<void> {
  try {
    if (!company.id) return;
    const sanitized = sanitizeForFirestore({
      ...company,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'companies', company.id), sanitized);
  } catch (err) {
    console.warn('[Firestore] Falha ao sincronizar empresa:', err);
  }
}

export async function deleteCompanyFromFirestore(companyId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'companies', companyId));
  } catch (err) {
    console.warn('[Firestore] Falha ao excluir empresa:', err);
  }
}

// 2. Doctors
export async function syncDoctorToFirestore(doctor: Doctor): Promise<void> {
  try {
    if (!doctor.id) return;
    const sanitized = sanitizeForFirestore({
      ...doctor,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'doctors', doctor.id), sanitized);
  } catch (err) {
    console.warn('[Firestore] Falha ao sincronizar médico:', err);
  }
}

export async function deleteDoctorFromFirestore(doctorId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'doctors', doctorId));
  } catch (err) {
    console.warn('[Firestore] Falha ao excluir médico:', err);
  }
}

// 3. Job Roles
export async function syncJobRoleToFirestore(role: JobRoleTemplate): Promise<void> {
  try {
    if (!role.id) return;
    const sanitized = sanitizeForFirestore({
      ...role,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'job_roles', role.id), sanitized);
  } catch (err) {
    console.warn('[Firestore] Falha ao sincronizar cargo:', err);
  }
}

export async function deleteJobRoleFromFirestore(roleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'job_roles', roleId));
  } catch (err) {
    console.warn('[Firestore] Falha ao excluir cargo:', err);
  }
}

// 4. ASO Records
export async function syncASOToFirestore(aso: ASORecord): Promise<void> {
  try {
    if (!aso.id) return;
    const sanitized = sanitizeForFirestore({
      ...aso,
      syncedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'aso_records', aso.id), sanitized);
    console.log('[Firestore] ASO salvo com sucesso no Firestore:', aso.asoCode || aso.id);
  } catch (err) {
    console.error('[Firestore] Falha crítica ao sincronizar ASO:', err);
  }
}

export async function deleteASOFromFirestore(asoId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'aso_records', asoId));
  } catch (err) {
    console.warn('[Firestore] Falha ao excluir ASO do Firestore:', err);
  }
}

// 5. Settings / General
export async function syncSettingsToFirestore(settings: Record<string, any>): Promise<void> {
  try {
    const sanitized = sanitizeForFirestore({
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'settings', 'general'), sanitized, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Falha ao sincronizar configurações:', err);
  }
}

// Subscriptions for Real-time Cloud Synchronization
export function subscribeToCompanies(callback: (companies: Company[]) => void): () => void {
  return onSnapshot(
    collection(db, 'companies'),
    (snapshot) => {
      const list: Company[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Company);
      });
      if (list.length > 0) {
        callback(list);
      }
    },
    (err) => console.warn('[Firestore] Erro no listener de empresas:', err)
  );
}

export function subscribeToDoctors(callback: (doctors: Doctor[]) => void): () => void {
  return onSnapshot(
    collection(db, 'doctors'),
    (snapshot) => {
      const list: Doctor[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Doctor);
      });
      if (list.length > 0) {
        callback(list);
      }
    },
    (err) => console.warn('[Firestore] Erro no listener de médicos:', err)
  );
}

export function subscribeToJobRoles(callback: (roles: JobRoleTemplate[]) => void): () => void {
  return onSnapshot(
    collection(db, 'job_roles'),
    (snapshot) => {
      const list: JobRoleTemplate[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as JobRoleTemplate);
      });
      if (list.length > 0) {
        callback(list);
      }
    },
    (err) => console.warn('[Firestore] Erro no listener de cargos:', err)
  );
}

export function subscribeToASOHistory(callback: (records: ASORecord[]) => void): () => void {
  return onSnapshot(
    collection(db, 'aso_records'),
    (snapshot) => {
      const list: ASORecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ASORecord);
      });
      // Sort newest first by issueDate or createdAt
      list.sort((a, b) => new Date(b.createdAt || b.issueDate).getTime() - new Date(a.createdAt || a.issueDate).getTime());
      callback(list);
    },
    (err) => console.warn('[Firestore] Erro no listener de ASO:', err)
  );
}

// --- Authorized Users / Access Control Module ---

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toEmailDocId(email: string): string {
  return normalizeEmail(email).replace(/[^a-z0-9_.-]/g, '_');
}

export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return normalizeEmail(email) === normalizeEmail(MASTER_ADMIN_EMAIL);
}

export function subscribeToAuthorizedUsers(callback: (users: AuthorizedUser[]) => void): () => void {
  return onSnapshot(
    collection(db, 'authorized_users'),
    (snapshot) => {
      const list: AuthorizedUser[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AuthorizedUser);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      callback(list);
    },
    (err) => console.warn('[Firestore] Erro no listener de usuários autorizados:', err)
  );
}

export async function addAuthorizedUser(
  emailOrUser: string,
  name?: string,
  notes?: string,
  addedBy?: string,
  role: 'admin' | 'user' = 'user',
  password?: string,
  authProvider: 'password' | 'google' = 'password'
): Promise<void> {
  const cleanIdentifier = normalizeEmail(emailOrUser);
  if (!cleanIdentifier) {
    throw new Error('Identificador de acesso inválido. Por favor, insira um e-mail ou nome de usuário.');
  }

  // If password provided and has email format, attempt secondary Firebase Auth registration in background
  if (password && cleanIdentifier.includes('@')) {
    try {
      const secAppName = 'SecondaryAuthAdmin';
      const secApp = getApps().find((a) => a.name === secAppName) || initializeApp(firebaseConfig, secAppName);
      const secAuth = getAuth(secApp);
      await createUserWithEmailAndPassword(secAuth, cleanIdentifier, password);
      await signOut(secAuth);
    } catch (err: any) {
      console.log('[Auth] Criação no Firebase Auth secundário:', err?.code || err?.message);
    }
  }

  const isMaster = isMasterAdminEmail(cleanIdentifier);
  const docId = toEmailDocId(cleanIdentifier);
  const newUser: AuthorizedUser = {
    id: docId,
    email: cleanIdentifier,
    name: name?.trim() || '',
    role: isMaster ? 'admin' : 'user', // strictly salesedourado is admin, all other accounts are user
    password: password || '',
    authProvider: authProvider || (password ? 'password' : 'google'),
    addedBy: addedBy ? normalizeEmail(addedBy) : MASTER_ADMIN_EMAIL,
    addedAt: new Date().toISOString(),
    notes: notes?.trim() || '',
  };

  await setDoc(doc(db, 'authorized_users', docId), newUser);
}

export async function updateUserPassword(docIdOrEmail: string, newPassword: string): Promise<void> {
  const cleanId = docIdOrEmail.includes('@') ? toEmailDocId(docIdOrEmail) : docIdOrEmail;
  if (!newPassword || newPassword.trim().length < 6) {
    throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
  }
  await setDoc(
    doc(db, 'authorized_users', cleanId),
    {
      password: newPassword.trim(),
      authProvider: 'password',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function loginWithCredentials(identifier: string, password: string): Promise<AppUserSession> {
  const cleanId = normalizeEmail(identifier);
  if (!cleanId) {
    throw new Error('Por favor, informe seu e-mail ou usuário de acesso.');
  }
  if (!password) {
    throw new Error('Por favor, digite sua senha de acesso.');
  }

  // 1. Check in Firestore authorized_users collection first
  const docId = toEmailDocId(cleanId);
  let userDoc: AuthorizedUser | null = null;
  try {
    const snap = await getDoc(doc(db, 'authorized_users', docId));
    if (snap.exists()) {
      userDoc = snap.data() as AuthorizedUser;
    }
  } catch (err) {
    console.warn('[Auth] Erro ao buscar usuário no Firestore:', err);
  }

  if (userDoc) {
    if (userDoc.password) {
      if (userDoc.password !== password) {
        throw new Error('Senha incorreta. Verifique os dados digitados ou contate o administrador.');
      }

      // Try background Firebase Auth sign in if it's an email
      if (cleanId.includes('@')) {
        try {
          await signInWithEmailAndPassword(getFirebaseAuth(), cleanId, password);
        } catch {
          // Handled via local session
        }
      }

      const isMaster = isMasterAdminEmail(userDoc.email);
      const session: AppUserSession = {
        uid: userDoc.id,
        email: userDoc.email,
        displayName: userDoc.name || userDoc.email,
        role: isMaster ? 'admin' : 'user',
        authProvider: 'password',
      };
      saveCustomSession(session);
      notifyAuthListeners(session);
      return session;
    } else {
      throw new Error('Este usuário foi cadastrado para acesso com Conta Google. Utilize a aba "Entrar com o Google".');
    }
  }

  // 2. Try direct Firebase Auth signInWithEmailAndPassword as fallback
  if (cleanId.includes('@')) {
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), cleanId, password);
      const isMaster = isMasterAdminEmail(cred.user.email);
      const session: AppUserSession = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email?.split('@')[0],
        role: isMaster ? 'admin' : 'user',
        authProvider: 'password',
      };
      saveCustomSession(session);
      notifyAuthListeners(session);
      return session;
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
        throw new Error('Senha incorreta. Verifique os dados digitados.');
      } else if (fbErr?.code === 'auth/user-not-found') {
        throw new Error('Usuário não encontrado. Solicite o cadastro ao Administrador em "Permissões de Acesso".');
      }
    }
  }

  throw new Error('Usuário ou e-mail não encontrado no sistema. Solicite o cadastro ao Administrador.');
}

export async function removeAuthorizedUser(docIdOrEmail: string): Promise<void> {
  const cleanId = docIdOrEmail.includes('@') ? toEmailDocId(docIdOrEmail) : docIdOrEmail;
  await deleteDoc(doc(db, 'authorized_users', cleanId));
}

export async function checkIfEmailIsAuthorized(email: string): Promise<{ authorized: boolean; role?: 'admin' | 'user' }> {
  const cleanEmail = normalizeEmail(email);
  if (cleanEmail === normalizeEmail(MASTER_ADMIN_EMAIL)) {
    return { authorized: true, role: 'admin' };
  }
  try {
    const docId = toEmailDocId(cleanEmail);
    const snap = await getDoc(doc(db, 'authorized_users', docId));
    if (snap.exists()) {
      return { authorized: true, role: 'user' };
    }
    return { authorized: false };
  } catch (error) {
    console.warn('[Firestore] Erro ao verificar autorização do e-mail:', error);
    return { authorized: false };
  }
}

export function isUserAdmin(
  email?: string | null
): boolean {
  if (!email) return false;
  return isMasterAdminEmail(email);
}


