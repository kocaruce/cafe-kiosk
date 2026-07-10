// Firebase 실시간 주문 연동 모듈.
// 키오스크(index.html): submitOrder()로 주문 전송 (주문번호는 '그날' 기준 1번부터)
// 직원 포스(pos.html): subscribeOrders()로 '오늘' 주문만 실시간 수신
// 주문내역(history.html): fetchOrdersByDate()로 특정 날짜 주문 조회
// 설정값이 없으면 조용히 비활성화되어 키오스크는 단독으로도 동작합니다.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, set, update, get, runTransaction,
  query, orderByChild, equalTo, onChildAdded, onChildChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// 참고: onChildAdded 같은 실시간 리스너는 인덱스 없이 경고만 뜨지만,
// get(query...) 는 인덱스가 없으면 에러가 나므로 조회는 전체를 받아 걸러낸다.

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith("여기에") && cfg.databaseURL;

let db = null, auth = null;
if (configured) {
  try {
    const app = initializeApp(cfg);
    db = getDatabase(app);
    auth = getAuth(app);
  } catch (e) {
    console.error("[orders] Firebase 초기화 실패:", e);
  }
} else {
  console.warn("[orders] Firebase 설정이 아직 없어 실시간 연동이 꺼져 있습니다. (js/firebase-config.js)");
}

// ── 직원 로그인 (인증) ──
window.watchAuth = function (cb) { if (auth) onAuthStateChanged(auth, cb); };
window.signIn = function (email, pw) { return signInWithEmailAndPassword(auth, email, pw); };
window.signInGoogle = function () { return signInWithPopup(auth, new GoogleAuthProvider()); };
window.signOutUser = function () { return signOut(auth); };
window.sendPasswordReset = function (email) { return sendPasswordResetEmail(auth, email); };

// 한국(KST, UTC+9) 기준 날짜 문자열 'YYYY-MM-DD' — 자정에 하루가 바뀜
function kstDateKey(ts = Date.now()) {
  return new Date(ts + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
window.todayKey = () => kstDateKey();

// 주문 전송: '그날' 카운터를 1 올려 주문번호를 발급하고 저장, 번호를 돌려줌
window.submitOrder = async function (order) {
  if (!db) return null;
  try {
    const date = kstDateKey();
    const res = await runTransaction(ref(db, "counter/" + date), n => (n || 0) + 1);
    const no = res.snapshot.val();
    const orderRef = push(ref(db, "orders"));
    await set(orderRef, { ...order, no, date, status: "new", createdAt: Date.now() });
    return no;
  } catch (e) {
    console.error("[orders] 주문 전송 실패:", e);
    return null;
  }
};

// 포스 구독: '오늘' 주문만 실시간 수신 (날짜가 바뀌면 페이지 새로고침 시 자동으로 새 날짜)
window.subscribeOrders = function ({ onAdd, onChange } = {}) {
  if (!db) return false;
  const q = query(ref(db, "orders"), orderByChild("date"), equalTo(kstDateKey()));
  if (onAdd) onChildAdded(q, snap => onAdd(snap.key, snap.val()));
  if (onChange) onChildChanged(q, snap => onChange(snap.key, snap.val()));
  return true;
};

// 주문내역: 특정 날짜(YYYY-MM-DD)의 모든 주문을 한 번 조회 (전체를 받아 날짜로 필터)
window.fetchOrdersByDate = async function (date) {
  if (!db) return [];
  const snap = await get(ref(db, "orders"));
  const list = [];
  snap.forEach(child => {
    const v = child.val();
    if (v && v.date === date) list.push({ key: child.key, ...v });
  });
  return list;
};

// 포스에서 주문을 '완료' 처리
window.markOrderDone = function (key) {
  if (!db) return;
  update(ref(db, "orders/" + key), { status: "done", doneAt: Date.now() });
};

// 연동 준비 완료 알림 (pos.js / history.js가 기다림)
window.ORDERS_READY = true;
window.ORDERS_ENABLED = !!db;
window.dispatchEvent(new Event("orders-ready"));
