import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Dataset, ChatMessage, AnalysisResult, DashboardWidget, UserPresence } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if provided in config
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Anonymous or Auto-Auth Helper (handles projects with or without anonymous auth enabled)
export async function initFirebaseAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch (err: any) {
          // If anonymous sign-in is disabled in Firebase console, fallback smoothly to guest session
          console.info('Firebase anonymous auth not enabled for this project, operating in open Firestore guest mode.');
          unsubscribe();
          resolve(null);
        }
      }
    });
  });
}

// Google Sign In
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('Google Sign In error:', err);
    throw err;
  }
}

export async function signOutUser() {
  await firebaseSignOut(auth);
}

/* ==========================================================================
   REAL-TIME DATASETS SYNC
   ========================================================================== */

export function subscribeToDatasets(onDatasetsChanged: (datasets: Dataset[]) => void) {
  const datasetsRef = collection(db, 'datasets');
  const q = query(datasetsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const items: Dataset[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        name: data.name || 'Untitled Dataset',
        description: data.description || '',
        rowCount: data.rowCount || (data.data ? data.data.length : 0),
        columnCount: data.columnCount || (data.columns ? data.columns.length : 0),
        columns: data.columns || [],
        data: data.data || [],
        dataQualityScore: data.dataQualityScore || 95,
        createdAt: typeof data.createdAt === 'number' ? new Date(data.createdAt).toLocaleDateString() : (data.createdAt || new Date().toLocaleDateString()),
        sourceType: data.sourceType || 'sample',
      });
    });
    if (items.length > 0) {
      onDatasetsChanged(items);
    }
  }, (err) => {
    console.error('Error subscribing to datasets:', err);
  });
}

export async function saveDatasetToFirebase(dataset: Dataset): Promise<void> {
  const datasetRef = doc(db, 'datasets', dataset.id);
  const user = auth.currentUser;
  await setDoc(datasetRef, {
    ...dataset,
    createdBy: user?.displayName || user?.uid || 'Anonymous',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function deleteDatasetFromFirebase(datasetId: string): Promise<void> {
  await deleteDoc(doc(db, 'datasets', datasetId));
}

/* ==========================================================================
   REAL-TIME CHAT MESSAGES SYNC
   ========================================================================== */

export function subscribeToChatMessages(
  datasetId: string, 
  onMessagesChanged: (messages: ChatMessage[]) => void
) {
  const messagesRef = collection(db, 'chat_messages');
  const q = query(
    messagesRef, 
    where('datasetId', '==', datasetId || 'global'),
    orderBy('createdAtTimestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      msgs.push({
        id: docSnap.id,
        role: data.role || (data.sender === 'user' ? 'user' : 'assistant'),
        text: data.text || '',
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        datasetId: data.datasetId,
        agentSteps: data.agentSteps || undefined,
        resultData: data.resultData || undefined,
      });
    });
    onMessagesChanged(msgs);
  }, (err) => {
    console.error('Error subscribing to chat messages:', err);
  });
}

export async function saveChatMessageToFirebase(datasetId: string, message: ChatMessage): Promise<void> {
  const msgRef = doc(db, 'chat_messages', message.id);
  const user = auth.currentUser;
  
  const cleanData: Record<string, any> = {
    id: message.id,
    datasetId: datasetId || 'global',
    role: message.role,
    text: message.text,
    timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAtTimestamp: Date.now(),
    createdBy: user?.displayName || user?.uid || 'Anonymous User',
  };

  if (message.agentSteps) {
    cleanData.agentSteps = JSON.parse(JSON.stringify(message.agentSteps));
  }
  if (message.resultData) {
    cleanData.resultData = JSON.parse(JSON.stringify(message.resultData));
  }

  await setDoc(msgRef, cleanData, { merge: true });
}

export async function clearChatMessagesFromFirebase(datasetId: string): Promise<void> {
  const messagesRef = collection(db, 'chat_messages');
  const q = query(messagesRef, where('datasetId', '==', datasetId || 'global'));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
}

/* ==========================================================================
   REAL-TIME REPORT SNAPSHOTS SYNC
   ========================================================================== */

export interface FirebaseReportRecord {
  id: string;
  datasetId: string;
  title: string;
  summary: string;
  timestamp: number;
  analysisResult: AnalysisResult;
  createdBy: string;
}

export function subscribeToReports(
  datasetId: string, 
  onReportsChanged: (reports: FirebaseReportRecord[]) => void
) {
  const reportsRef = collection(db, 'reports');
  const q = query(
    reportsRef, 
    where('datasetId', '==', datasetId || 'global'),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const list: FirebaseReportRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        datasetId: data.datasetId,
        title: data.title || 'Analysis Report',
        summary: data.summary || '',
        timestamp: data.timestamp || Date.now(),
        analysisResult: data.analysisResult,
        createdBy: data.createdBy || 'DataMind User',
      });
    });
    onReportsChanged(list);
  }, (err) => {
    console.error('Error subscribing to reports:', err);
  });
}

export async function saveReportToFirebase(
  datasetId: string, 
  title: string, 
  summary: string, 
  analysisResult: AnalysisResult
): Promise<string> {
  const reportsRef = collection(db, 'reports');
  const user = auth.currentUser;
  const id = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reportDoc = doc(reportsRef, id);

  await setDoc(reportDoc, {
    id,
    datasetId: datasetId || 'global',
    title,
    summary,
    timestamp: Date.now(),
    analysisResult: JSON.parse(JSON.stringify(analysisResult)),
    createdBy: user?.displayName || user?.email || 'Anonymous Analyst',
  });

  return id;
}

export async function deleteReportFromFirebase(reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'reports', reportId));
}

/* ==========================================================================
   REAL-TIME PRESENCE & CURSOR COLLABORATION
   ========================================================================== */

export function subscribeToPresence(onPresenceChanged: (presences: UserPresence[]) => void) {
  const presenceRef = collection(db, 'presence');
  const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
  const q = query(presenceRef, where('lastSeen', '>', threeMinutesAgo));

  return onSnapshot(q, (snapshot) => {
    const active: UserPresence[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserPresence;
      active.push(data);
    });
    onPresenceChanged(active);
  }, (err) => {
    console.error('Error subscribing to presence:', err);
  });
}

export async function updateUserPresence(presenceData: UserPresence): Promise<void> {
  const presenceRef = doc(db, 'presence', presenceData.id);
  await setDoc(presenceRef, {
    ...presenceData,
    lastSeen: Date.now(),
  }, { merge: true });
}

export async function removeUserPresence(presenceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'presence', presenceId));
  } catch (e) {
    // ignore
  }
}

/* ==========================================================================
   REAL-TIME DASHBOARD WIDGETS SYNC
   ========================================================================== */

export function subscribeToDashboardWidgets(
  userId: string, 
  onWidgetsChanged: (widgets: DashboardWidget[]) => void
) {
  const dashRef = doc(db, 'dashboards', userId || 'shared_dashboard');
  return onSnapshot(dashRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.widgets)) {
        onWidgetsChanged(data.widgets);
      }
    }
  }, (err) => {
    console.error('Error subscribing to dashboard widgets:', err);
  });
}

export async function saveDashboardWidgetsToFirebase(
  userId: string, 
  widgets: DashboardWidget[]
): Promise<void> {
  const dashRef = doc(db, 'dashboards', userId || 'shared_dashboard');
  await setDoc(dashRef, {
    id: userId || 'shared_dashboard',
    userId: userId || 'shared_dashboard',
    widgets: JSON.parse(JSON.stringify(widgets)),
    updatedAt: Date.now(),
  }, { merge: true });
}
