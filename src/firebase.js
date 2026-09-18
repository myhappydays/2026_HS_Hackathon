import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// 사용자의 웹 앱 Firebase 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyCLtVWK9MfL4aWewx_AACZ4bC0spHm2Veo",
  authDomain: "fermata-67c69.firebaseapp.com",
  projectId: "fermata-67c69",
  storageBucket: "fermata-67c69.firebasestorage.app",
  messagingSenderId: "309341804660",
  appId: "1:309341804660:web:fec7eedbc1b4d9cba75921",
  measurementId: "G-G5TZZM8Y9X"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 다른 파일에서 쓸 수 있도록 앱과 db를 내보냅니다.
export { app, db, auth, googleProvider };
