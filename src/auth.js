import { auth, googleProvider } from './firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

/**
 * 구글 소셜 로그인 팝업을 엽니다.
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("로그인 에러:", error);
    alert("로그인 중 문제가 발생했습니다.");
    throw error;
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
 * 현재 로그인된 사용자 객체를 반환합니다. 
 * (주의: 페이지 로드 직후에는 null일 수 있으므로 listenAuthState 사용 권장)
 */
export function getCurrentUser() {
  return auth.currentUser;
}
