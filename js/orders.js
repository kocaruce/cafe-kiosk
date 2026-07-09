// Firebase 실시간 주문 연동 모듈.
// 키오스크(index.html)는 submitOrder()로 주문을 보내고,
// 직원 포스(pos.html)는 subscribeOrders()로 실시간 수신합니다.
// 설정값이 아직 없으면 조용히 비활성화되어 키오스크는 단독으로도 정상 동작합니다.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, set, update, runTransaction,
  query, orderByChild, onChildAdded, onChildChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith("여기에") && cfg.databaseURL;

let db = null;
if (configured) {
  try {
    db = getDatabase(initializeApp(cfg));
  } catch (e) {
    console.error("[orders] Firebase 초기화 실패:", e);
  }
} else {
  console.warn("[orders] Firebase 설정이 아직 없어 실시간 연동이 꺼져 있습니다. (js/firebase-config.js)");
}

// 주문 전송: 주문번호를 발급받아 저장하고 그 번호를 돌려줍니다.
window.submitOrder = async function (order) {
  if (!db) return null;
  try {
    const res = await runTransaction(ref(db, "counter"), n => (n || 0) + 1);
    const no = res.snapshot.val();
    const orderRef = push(ref(db, "orders"));
    await set(orderRef, { ...order, no, status: "new", createdAt: Date.now() });
    return no;
  } catch (e) {
    console.error("[orders] 주문 전송 실패:", e);
    return null;
  }
};

// 포스 구독: 새 주문(onAdd)과 상태 변경(onChange)을 실시간으로 받습니다.
window.subscribeOrders = function ({ onAdd, onChange } = {}) {
  if (!db) return false;
  const q = query(ref(db, "orders"), orderByChild("createdAt"));
  if (onAdd) onChildAdded(q, snap => onAdd(snap.key, snap.val()));
  if (onChange) onChildChanged(q, snap => onChange(snap.key, snap.val()));
  return true;
};

// 포스에서 주문을 '완료' 처리
window.markOrderDone = function (key) {
  if (!db) return;
  update(ref(db, "orders/" + key), { status: "done", doneAt: Date.now() });
};

// 연동 준비 완료를 다른 스크립트에 알림 (pos.js가 기다림)
window.ORDERS_READY = true;
window.ORDERS_ENABLED = !!db;
window.dispatchEvent(new Event("orders-ready"));
