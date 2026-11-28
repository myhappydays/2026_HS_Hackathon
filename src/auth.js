import { auth, db, googleProvider } from './firebase.js';
import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, deleteUser, reauthenticateWithPopup } from "firebase/auth";

/**
 * 구글 소셜 로그인 팝업을 엽니다.
 * @param {{ selectAccount?: boolean }} [options]
 */
export async function loginWithGoogle({ selectAccount = false } = {}) {
  try {
    const provider = selectAccount ? new GoogleAuthProvider() : googleProvider;
    if (selectAccount) {
      provider.setCustomParameters({ prompt: 'select_account' });
    }
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    // 사용자가 팝업을 직접 닫은 경우는 오류가 아니다
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.error("로그인 에러:", error);
    alert(error?.code === 'auth/popup-blocked'
      ? "팝업이 차단되어 로그인 창을 열지 못했습니다. 팝업 차단을 해제한 뒤 다시 시도해 주세요."
      : "로그인 중 문제가 발생했습니다.");
    return null;
  }
}

/**
 * 관리자 권한을 서버 기준으로 확인하고 실패 원인까지 함께 반환합니다.
 * Firestore 의 admins/{uid} 문서가 존재하면 관리자입니다.
 *
 * - reason: 'ok' | 'signed-out' | 'not-admin' | 'permission-denied' | 'offline' | 'error'
 *
 * @param {import('firebase/auth').User|null} user
 * @returns {Promise<{ isAdmin: boolean, reason: string, errorCode: string|null }>}
 */
export async function checkAdminAccess(user) {
  if (!user) return { isAdmin: false, reason: 'signed-out', errorCode: null };
  const adminRef = doc(db, 'admins', user.uid);
  try {
    // 콘솔에서 UID를 방금 등록한 직후 캐시된 미존재 응답을 받지 않도록 서버를 우선 조회
    const snap = navigator.onLine
      ? await getDocFromServer(adminRef)
      : await getDoc(adminRef);
    return snap.exists()
      ? { isAdmin: true, reason: 'ok', errorCode: null }
      : { isAdmin: false, reason: 'not-admin', errorCode: null };
  } catch (error) {
    const code = error?.code || null;
    console.warn("관리자 권한 확인 실패:", code, error);
    if (code === 'permission-denied') {
      return { isAdmin: false, reason: 'permission-denied', errorCode: code };
    }
    if (code === 'unavailable' || code === 'failed-precondition' || !navigator.onLine) {
      return { isAdmin: false, reason: 'offline', errorCode: code };
    }
    return { isAdmin: false, reason: 'error', errorCode: code };
  }
}

/**
 * 관리자 여부를 확인합니다.
 * Firestore 의 admins/{uid} 문서가 있으면 관리자입니다. (문서 내용은 보지 않음)
 * 관리자 추가·삭제는 Firebase 콘솔에서 이 문서를 만들거나 지우면 됩니다.
 *
 * 주의: 이 검사는 화면을 가리는 용도입니다. 실제 데이터 보호는
 * Firestore 보안 규칙에서 같은 admins 문서를 기준으로 걸어야 합니다.
 *
 * @param {import('firebase/auth').User|null} user
 * @returns {Promise<boolean>}
 */
export async function isAdminUser(user) {
  const { isAdmin } = await checkAdminAccess(user);
  return isAdmin;
}

/**
 * 로그아웃 합니다.
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 에러:", error);
  }
}

/**
 * 로그인 상태 변화를 감지하여 콜백을 실행합니다.
 * @param {Function} callback (user) => void
 */
export function listenAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * 인증 상태가 확정될 때까지 기다린 뒤 사용자(없으면 null)를 반환합니다.
 * 페이지 로드 직후 "로그인 여부"로 화면을 그려야 할 때 사용합니다.
 * @returns {Promise<import('firebase/auth').User|null>}
 */
export async function waitForAuth() {
  try {
    await auth.authStateReady()
  } catch (error) {
    console.warn("인증 상태 확인 실패:", error);
  }
  return auth.currentUser;
}

/**
 * 현재 로그인된 사용자 객체를 반환합니다.
 * (주의: 페이지 로드 직후에는 null일 수 있으므로 listenAuthState 사용 권장)
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * 현재 로그인된 사용자의 계정을 영구 삭제합니다.
 * 최근 로그인 시간이 오래된 경우(auth/requires-recent-login) Google 재인증 팝업을 자동으로 띄워 재시도합니다.
 * @returns {Promise<{ deleted: boolean, cancelled?: boolean }>}
 */
export async function deleteCurrentAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인된 계정이 없습니다.');

  try {
    await deleteUser(user);
    return { deleted: true };
  } catch (error) {
    if (error?.code === 'auth/requires-recent-login') {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await reauthenticateWithPopup(user, provider);
        await deleteUser(user);
        return { deleted: true };
      } catch (reauthError) {
        if (reauthError?.code === 'auth/popup-closed-by-user' || reauthError?.code === 'auth/cancelled-popup-request') {
          return { deleted: false, cancelled: true };
        }
        throw reauthError;
      }
    }
    throw error;
  }
}
