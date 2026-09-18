import { db } from './firebase.js';
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch, query, where } from "firebase/firestore";

const REPORTS_COLLECTION = 'reports';
const CLUSTERS_COLLECTION = 'clusters';

/** localStorage 대신 Firestore를 쓰므로 항상 0 반환 */
export function getStorageUsage() {
  return 0;
}

/** 4MB 초과 여부 (항상 false) */
export function isStorageFull() {
  return false;
}

// ── Reports ─────────────────────────────────────────────

export async function getReports() {
  try {
    const snapshot = await getDocs(collection(db, REPORTS_COLLECTION));
    return snapshot.docs.map(doc => doc.data());
  } catch (e) {
    console.error("Firestore getReports Error:", e);
    return [];
  }
}

export async function getReportsByUserId(userId) {
  if (!userId) return [];
  try {
    const q = query(collection(db, REPORTS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (e) {
    console.error("Firestore getReportsByUserId Error:", e);
    return [];
  }
}

export async function saveReports(reports) {
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
  try {
    await setDoc(doc(db, REPORTS_COLLECTION, String(updated.id)), updated);
  } catch (e) {
    console.error("Firestore updateReport Error:", e);
  }
}

export async function deleteReport(id) {
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
    return snapshot.docs.map(doc => doc.data());
  } catch (e) {
    console.error("Firestore getClusters Error:", e);
    return [];
  }
}

export async function saveClusters(clusters) {
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
  try {
    await setDoc(doc(db, CLUSTERS_COLLECTION, String(cluster.id)), cluster);
  } catch (e) {
    console.error("Firestore addCluster Error:", e);
  }
}

export async function updateCluster(updated) {
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
  try {
    await deleteDoc(doc(db, CLUSTERS_COLLECTION, String(id)));
  } catch (e) {
    console.error("Firestore deleteCluster Error:", e);
  }
}
