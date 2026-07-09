// 주문 내역: 날짜를 골라 그날의 주문을 조회해 보여준다.

function hhmm(ts) {
  const d = new Date(ts || Date.now());
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 결제 수단 표시 (카드/현금)
function payBadge(m) {
  if (m === "card") return `<span class="oc-pay card">💳 카드</span>`;
  if (m === "cash") return `<span class="oc-pay cash">💵 현금</span>`;
  return "";
}

function card(o) {
  const done = o.status === "done";
  const el = document.createElement("div");
  el.className = "order-card" + (done ? " done" : "");
  const items = (o.items || []).map(it =>
    `<li><span class="i-name">${it.name}</span><span class="i-qty">×${it.qty}</span>` +
    `<span class="i-amt">${(it.price * it.qty).toLocaleString()}원</span></li>`
  ).join("");
  el.innerHTML = `
    <div class="oc-head">
      <span class="oc-no">${o.no != null ? o.no + "번" : "-"}</span>
      ${payBadge(o.payMethod)}
      <span class="oc-time">${hhmm(o.createdAt)}</span>
    </div>
    <ul class="oc-items">${items}</ul>
    <div class="oc-foot">
      <span class="oc-total">합계 ${(o.total || 0).toLocaleString()}원</span>
      <span class="oc-badge ${done ? "" : "wait"}">${done ? "완료" : "대기"}</span>
    </div>`;
  return el;
}

async function load(date) {
  const wrap = document.getElementById("hist-orders");
  const empty = document.getElementById("hist-empty");
  const summary = document.getElementById("hist-summary");
  wrap.innerHTML = "";
  empty.hidden = true;
  summary.innerHTML = `<span class="s-loading">불러오는 중…</span>`;

  let list = [];
  try {
    list = await window.fetchOrdersByDate(date);
  } catch (e) {
    summary.innerHTML = `<span class="s-loading">불러오기 실패 — 잠시 후 다시 시도해 주세요.</span>`;
    return;
  }

  list.sort((a, b) => (a.no || 0) - (b.no || 0));

  const doneList = list.filter(o => o.status === "done");
  const revenue = doneList.reduce((n, o) => n + (o.total || 0), 0);
  summary.innerHTML =
    `<span class="s-item">주문 <b>${list.length}</b>건</span>` +
    `<span class="s-item">완료 <b>${doneList.length}</b>건</span>` +
    `<span class="s-item s-rev">완료 매출 <b>${revenue.toLocaleString()}원</b></span>`;

  if (list.length === 0) { empty.hidden = false; return; }
  list.forEach(o => wrap.appendChild(card(o)));
}

/* ── 날짜 컨트롤 ── */
function shiftDate(str, days) {
  // UTC 기준으로 순수 날짜 계산 (브라우저 타임존 영향 없음)
  const d = new Date(str + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function start() {
  const input = document.getElementById("hist-date");
  const today = window.todayKey ? window.todayKey() : new Date().toISOString().slice(0, 10);
  input.max = today;
  input.value = today;

  const go = () => load(input.value);
  input.addEventListener("change", go);
  document.getElementById("prev-day").onclick = () => { input.value = shiftDate(input.value, -1); go(); };
  document.getElementById("next-day").onclick = () => { input.value = shiftDate(input.value, 1); go(); };
  document.getElementById("today-btn").onclick = () => { input.value = today; go(); };

  if (!window.ORDERS_ENABLED) {
    document.getElementById("hist-summary").innerHTML =
      `<span class="s-loading">⚠ Firebase 설정이 필요합니다 (js/firebase-config.js)</span>`;
    return;
  }
  go();
}

// 시작은 로그인 잠금(auth-gate.js)이 제어한다. 잠금이 꺼져 있으면 즉시 실행됨.
window.PAGE_START = start;
