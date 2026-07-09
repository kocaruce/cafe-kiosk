// ┌─────────────────────────────────────────────────────────────┐
// │  Firebase 설정 — 오로라 주스 가게 (카페놀이)                          │
// │  이 값들은 공개돼도 안전합니다. 접근 제어는 데이터베이스 규칙으로 합니다.    │
// └─────────────────────────────────────────────────────────────┘
// 직원 페이지(주문현황·주문내역)에 로그인 잠금을 걸지 여부.
// 로그인 계정 준비가 끝나면 true 로 바꿉니다. (키오스크는 영향 없음)
window.REQUIRE_LOGIN = true;

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDN_SfYDOumAV4WME74Aj9jT1Ja_e2r4s",
  authDomain: "aurorajuice-cafe.firebaseapp.com",
  databaseURL: "https://aurorajuice-cafe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aurorajuice-cafe",
  storageBucket: "aurorajuice-cafe.firebasestorage.app",
  messagingSenderId: "1015329905358",
  appId: "1:1015329905358:web:13669743833683069ece9f"
};
