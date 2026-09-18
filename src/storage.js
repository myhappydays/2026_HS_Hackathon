import { db } from './firebase.js';
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch, query, where } from "firebase/firestore";

const REPORTS_COLLECTION = 'reports';
const CLUSTERS_COLLECTION = 'clusters';

const LOCAL_KEYS = {
  REPORTS: 'reports',
  CLUSTERS: 'clusters',
};

function getLocalReports() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEYS.REPORTS) || '[]');
  } catch {
    return [];
  }
}

function setLocalReports(reports) {
  try {
    localStorage.setItem(LOCAL_KEYS.REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.warn('[storage] localStorage setItem failed', e);
  }
}

function getLocalClusters() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEYS.CLUSTERS) || '[]');
  } catch {
    return [];
  }
}

function setLocalClusters(clusters) {
  try {
    localStorage.setItem(LOCAL_KEYS.CLUSTERS, JSON.stringify(clusters));
  } catch (e) {
    console.warn('[storage] localStorage setItem failed', e);
  }
}

/** localStorage 사용량 (호환성 유지) */
export function getStorageUsage() {
  return 0;
}

/** 4MB 초과 여부 */
export function isStorageFull() {
  return false;
}

// ── Reports ─────────────────────────────────────────────

export async function getReports() {
  try {
    const snapshot = await getDocs(collection(db, REPORTS_COLLECTION));
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => d.data());
      setLocalReports(list);
      return list;
    }
  } catch (e) {
    console.warn("Firestore getReports Error, using local cache:", e);
  }
  return getLocalReports();
}

export async function getReportsByUserId(userId) {
  if (!userId) return [];
  try {
    const q = query(collection(db, REPORTS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(d => d.data());
    }
  } catch (e) {
    console.warn("Firestore getReportsByUserId Error, checking local cache:", e);
  }
  return getLocalReports().filter(r => r.userId === userId);
}

export async function saveReports(reports) {
  setLocalReports(reports);
  try {
    const batch = writeBatch(db);
    reports.forEach(report => {
      const docRef = doc(db, REPORTS_COLLECTION, String(report.id));
      batch.set(docRef, report);
    });
    await batch.commit();
  } catch (e) {
    console.error("Firestore saveReports Error:", e);
  }
}

export async function addReport(report) {
  const local = getLocalReports();
  local.push(report);
  setLocalReports(local);

  try {
    await setDoc(doc(db, REPORTS_COLLECTION, String(report.id)), report);
  } catch (e) {
    console.error("Firestore addReport Error:", e);
  }
}

export async function getReportById(id) {
  const reports = await getReports();
  return reports.find(r => r.id === id);
}

export async function updateReport(updated) {
  const local = getLocalReports().map(r => r.id === updated.id ? updated : r);
  setLocalReports(local);

  try {
    await setDoc(doc(db, REPORTS_COLLECTION, String(updated.id)), updated);
  } catch (e) {
    console.error("Firestore updateReport Error:", e);
  }
}

export async function deleteReport(id) {
  const local = getLocalReports().filter(r => r.id !== id);
  setLocalReports(local);

  try {
    await deleteDoc(doc(db, REPORTS_COLLECTION, String(id)));
  } catch (e) {
    console.error("Firestore deleteReport Error:", e);
  }
}

// ── Clusters ─────────────────────────────────────────────

export async function getClusters() {
  try {
    const snapshot = await getDocs(collection(db, CLUSTERS_COLLECTION));
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => d.data());
      setLocalClusters(list);
      return list;
    }
  } catch (e) {
    console.warn("Firestore getClusters Error, using local cache:", e);
  }
  return getLocalClusters();
}

export async function saveClusters(clusters) {
  setLocalClusters(clusters);
  try {
    const batch = writeBatch(db);
    clusters.forEach(cluster => {
      const docRef = doc(db, CLUSTERS_COLLECTION, String(cluster.id));
      batch.set(docRef, cluster);
    });
    await batch.commit();
  } catch (e) {
    console.error("Firestore saveClusters Error:", e);
  }
}

export async function addCluster(cluster) {
  const local = getLocalClusters();
  local.push(cluster);
  setLocalClusters(local);

  try {
    await setDoc(doc(db, CLUSTERS_COLLECTION, String(cluster.id)), cluster);
  } catch (e) {
    console.error("Firestore addCluster Error:", e);
  }
}

export async function updateCluster(updated) {
  const local = getLocalClusters().map(c => c.id === updated.id ? updated : c);
  setLocalClusters(local);

  try {
    await setDoc(doc(db, CLUSTERS_COLLECTION, String(updated.id)), updated);
  } catch (e) {
    console.error("Firestore updateCluster Error:", e);
  }
}

export async function getClusterById(id) {
  const clusters = await getClusters();
  return clusters.find(c => c.id === id);
}

export async function deleteCluster(id) {
  const local = getLocalClusters().filter(c => c.id !== id);
  setLocalClusters(local);

  try {
    await deleteDoc(doc(db, CLUSTERS_COLLECTION, String(id)));
  } catch (e) {
    console.error("Firestore deleteCluster Error:", e);
  }
}
