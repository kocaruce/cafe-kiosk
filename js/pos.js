// 직원 포스 화면: Firebase에서 주문을 실시간 수신해 표시하고, '완료' 처리를 한다.

const orders = {};           // key -> order 데이터
let firstLoadDone = false;   // 최초 로딩(기존 주문 일괄 수신) 동안엔 알림음 생략

/* ── 알림음 ── */
let audioCtx = null;
function ding() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [880, 1175].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.22, t + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.16 + 0.28);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.28);
    });
  } catch (e) { /* 소리 실패는 무시 */ }
}

/* ── 시간 표시 ── */
function hhmm(ts) {
  const d = new Date(ts || Date.now());
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ── 렌더링 ── */
function render() {
  const listNew = document.getElementById("orders-new");
  const listDone = document.getElementById("orders-done");
  listNew.innerHTML = "";
  listDone.innerHTML = "";

  const all = Object.entries(orders).map(([key, o]) => ({ key, ...o }));
  const news = all.filter(o => o.status !== "done").sort((a, b) => a.createdAt - b.createdAt); // 오래된 순(먼저 처리)
  const dones = all.filter(o => o.status === "done").sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

  news.forEach(o => listNew.appendChild(card(o, false)));
  dones.forEach(o => listDone.appendChild(card(o, true)));

  document.getElementById("count-new").textContent = news.length;
  document.getElementById("count-done").textContent = dones.length;
}

function card(o, done) {
  const el = document.createElement("div");
  el.className = "order-card" + (done ? " done" : "");
  const items = (o.items || []).map(it =>
    `<li><span class="i-name">${it.name}</span><span class="i-qty">×${it.qty}</span>` +
    `<span class="i-amt">${(it.price * it.qty).toLocaleString()}원</span></li>`
  ).join("");
  el.innerHTML = `
    <div class="oc-head">
      <span class="oc-no">${o.no != null ? o.no + "번" : "-"}</span>
      <span class="oc-time">${hhmm(o.createdAt)}</span>
    </div>
    <ul class="oc-items">${items}</ul>
    <div class="oc-foot">
      <span class="oc-total">합계 ${(o.total || 0).toLocaleString()}원</span>
      ${done
        ? `<span class="oc-badge">완료</span>`
        : `<button class="oc-done" data-key="${o.key}">완료</button>`}
    </div>`;
  const btn = el.querySelector(".oc-done");
  if (btn) btn.onclick = () => window.markOrderDone(btn.dataset.key);
  return el;
}

/* ── 실시간 수신 ── */
function start() {
  const status = document.getElementById("pos-status");
  if (!window.ORDERS_ENABLED) {
    status.textContent = "⚠ Firebase 설정 필요 (js/firebase-config.js)";
    status.classList.add("off");
    return;
  }
  status.textContent = "🟢 실시간 연결됨";
  status.classList.add("on");

  window.subscribeOrders({
    onAdd(key, data) {
      const isNew = !(key in orders);
      orders[key] = data;
      render();
      if (isNew && firstLoadDone && data.status !== "done") ding();
    },
    onChange(key, data) {
      orders[key] = data;
      render();
    },
  });

  // 최초 기존 주문들이 한 번에 들어온 뒤부터 새 주문 알림음 재생
  setTimeout(() => { firstLoadDone = true; }, 1500);
}

// orders.js(모듈)가 먼저 로드됐으면 바로, 아니면 준비 이벤트를 기다림
if (window.ORDERS_READY) start();
else window.addEventListener("orders-ready", start, { once: true });
