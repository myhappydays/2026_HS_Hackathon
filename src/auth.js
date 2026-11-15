import { auth, db, googleProvider } from './firebase.js';
import { doc, getDoc } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

/**
 * 구글 소셜 로그인 팝업을 엽니다.
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
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
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    console.warn("관리자 권한 확인 실패:", error);
    return false;
  }
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
