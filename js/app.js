/* 어린이집 카페 키오스크
   화면 흐름: 시작 → 주문 → 주문목록 → 결제수단 → (현금 | 카드→결제중→카드제거) → 주문완료 → 시작 */

const IMG = "assets/images/";

// 메뉴 구성은 PPT 슬라이드 2~6, 가격은 아이들이 손으로 쓴 "오로라 주스 가게" 간판(최종본) 기준.
// 키위망고 2,300원 · 레몬 2,100원 · 오렌지 1,200원은 간판에 적힌 그대로!
const MENU = {
  "주스": {
    cardSize: 190,
    items: [
      { name: "당근사과",   img: "image11.svg", garnish: "image13.svg", price: 2000 },
      { name: "망고",       img: "image15.svg",                          price: 3000 },
      { name: "키위망고",   img: "image15.svg", garnish: "image16.png", price: 2300 },
      { name: "사과",       img: "image18.svg",                          price: 1000 },
      { name: "청포도케일", img: "image28-grape.svg", garnish: "image29.png", price: 2000 },
      { name: "바나나",     img: "image22.svg",                          price: 4000 },
      { name: "수박",       img: "image20.svg",                          price: 2000 },
      { name: "레몬",       img: "image24.svg",                          price: 2100 },
      { name: "키위",       img: "image28.svg",                          price: 3000 },
      { name: "토마토",     img: "image26.svg",                          price: 2000 },
    ],
  },
  "에이드": {
    cardSize: 354,
    items: [
      { name: "레몬라임에이드",   img: "image38.png",                          price: 2000 },
      { name: "망고에이드",       img: "image37.png", cover: "image39.png",   price: 2000 },
      { name: "오렌지에이드",     img: "image36.png",                          price: 1200 },
      { name: "복숭아키위에이드", img: "image35.svg", garnish: "image43.svg", price: 3000 },
    ],
  },
  "스무디": {
    cardSize: 380,
    items: [
      { name: "복숭아 스무디", img: "image45.svg", garnish: "image48.png", price: 3000 },
      { name: "망고 스무디",   img: "image46.png", garnish: "image49.png", price: 2000 },
    ],
  },
  "라떼": {
    cardSize: 354,
    items: [
      { name: "바나나 우유", img: "image51.png", garnish: "image55.png", price: 2000 },
      { name: "녹차 우유",   img: "image50.png", garnish: "image54.png", price: 2000 },
      { name: "초코 우유",   img: "image52.png", garnish: "image57.svg", price: 4000 },
      { name: "딸기 우유",   img: "image53.png", garnish: "image58.png", price: 3000 },
    ],
  },
  "커피, 티": {
    cardSize: 380,
    items: [
      { name: "아메리카노",     img: "image64.svg", garnish: "image66.svg", price: 2000 },
      { name: "레몬 아이스티",   img: "image62.svg",                          price: 4000 },
      { name: "복숭아 아이스티", img: "image60.svg",                          price: 3000 },
    ],
  },
};

const BILL_IMG = "image33.svg"; // 천원 지폐 (가격 표시)
const COIN_IMG = "100won.png";  // 100원 동전 (1,000원 미만 나머지 표시)

// 가격을 "천원 지폐 n장 + 100원 동전 n개" 그림으로 표현 (예: 2,300원 = 지폐 2장 + 동전 3개)
function priceIcons(price) {
  const bills = Math.floor(price / 1000);
  const coins = Math.round((price % 1000) / 100);
  return `<img src="${IMG}${BILL_IMG}" alt="천원">`.repeat(bills)
       + `<img class="coin" src="${IMG}${COIN_IMG}" alt="백원">`.repeat(coins);
}

// 장바구니 합계처럼 큰 금액을 오만원~백원 지폐/동전을 최소 개수로 조합해 표현
const MONEY_UNITS = [
  { value: 50000, img: "50000.png",   cls: "bill", alt: "오만원" },
  { value: 10000, img: "10000.png",   cls: "bill", alt: "만원" },
  { value: 5000,  img: "5000.png",    cls: "bill", alt: "오천원" },
  { value: 1000,  img: BILL_IMG,      cls: "bill", alt: "천원" },
  { value: 100,   img: COIN_IMG,      cls: "coin", alt: "백원" },
];
function moneyIcons(amount) {
  let rest = amount, html = "";
  for (const u of MONEY_UNITS) {
    const n = Math.floor(rest / u.value);
    rest -= n * u.value;
    html += `<img class="money ${u.cls}" src="${IMG}${u.img}" alt="${u.alt}">`.repeat(n);
  }
  return html;
}

let currentTab = "주스";
let cart = {}; // name -> { item, qty }
let timers = [];

/* ── 스테이지 스케일링 ── */
function fitStage() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  const stage = document.getElementById("stage");
  stage.style.transform = `scale(${s})`;
  stage.style.left = (innerWidth - 1920 * s) / 2 + "px";
  stage.style.top = (innerHeight - 1080 * s) / 2 + "px";
}
addEventListener("resize", fitStage);
fitStage();

/* ── 효과음 (WebAudio) ── */
let audioCtx = null;
function beep(freq, dur = 0.12, type = "sine", when = 0) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch (e) { /* 소리 실패는 무시 */ }
}
const sndPop = () => beep(660, 0.1, "triangle");
const sndTab = () => beep(440, 0.08, "sine");
const sndDing = () => { beep(784, 0.15); beep(1047, 0.3, "sine", 0.15); };

/* ── 화면 전환 ── */
function show(id) {
  timers.forEach(clearTimeout);
  timers = [];
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
function after(ms, fn) { timers.push(setTimeout(fn, ms)); }

/* ── 주문 화면 렌더링 ── */
function renderTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  Object.keys(MENU).forEach(cat => {
    const b = document.createElement("button");
    b.className = "tab" + (cat === currentTab ? " active" : "");
    b.textContent = cat;
    b.onclick = () => { currentTab = cat; sndTab(); renderTabs(); renderMenu(); };
    nav.appendChild(b);
  });
}

function renderMenu() {
  const grid = document.getElementById("menu-grid");
  const { cardSize, items } = MENU[currentTab];
  grid.innerHTML = "";
  grid.classList.toggle("compact", items.length > 5);
  items.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "menu-item";
    btn.style.setProperty("--card-size", cardSize + "px");
    const bills = priceIcons(item.price);
    btn.innerHTML = `
      <span class="menu-card">
        <img class="drink" src="${IMG}${item.img}" alt="">
        ${item.cover ? `<img class="cover" src="${IMG}${item.cover}" alt="">` : ""}
        ${item.garnish ? `<img class="garnish" src="${IMG}${item.garnish}" alt="">` : ""}
      </span>
      <span class="menu-name">${item.name}</span>
      <span class="menu-price">${bills}<span class="won">${item.price.toLocaleString()}원</span></span>`;
    btn.onclick = () => addToCart(item, btn);
    grid.appendChild(btn);
  });
}

/* ── 장바구니 ── */
function cartCount() {
  return Object.values(cart).reduce((n, e) => n + e.qty, 0);
}
function cartTotal() {
  return Object.values(cart).reduce((n, e) => n + e.qty * e.item.price, 0);
}

function addToCart(item, btn) {
  cart[item.name] = cart[item.name] || { item, qty: 0 };
  cart[item.name].qty++;
  sndPop();
  btn.classList.remove("added");
  void btn.offsetWidth; // 애니메이션 재시작
  btn.classList.add("added");
  updateBadge(true);
}

function updateBadge(bounce) {
  const badge = document.getElementById("cart-badge");
  const n = cartCount();
  badge.hidden = n === 0;
  badge.textContent = n;
  if (bounce) {
    badge.classList.remove("bounce");
    void badge.offsetWidth;
    badge.classList.add("bounce");
  }
}

function renderCart() {
  const rows = document.getElementById("cart-rows");
  rows.innerHTML = "";
  const entries = Object.values(cart);
  if (entries.length === 0) {
    rows.innerHTML = `<div id="cart-empty">아직 담은 음료가 없어요!<br>메뉴에서 음료를 골라 주세요 🍹</div>`;
  }
  entries.forEach(({ item, qty }) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <img class="thumb" src="${IMG}${item.img}" alt="">
      <span class="name">${item.name}</span>
      <button class="qty-btn" data-d="-1">−</button>
      <span class="qty">${qty}</span>
      <button class="qty-btn" data-d="1">+</button>
      <span class="amount">${(item.price * qty).toLocaleString()}원</span>`;
    row.querySelectorAll(".qty-btn").forEach(b => {
      b.onclick = () => {
        cart[item.name].qty += Number(b.dataset.d);
        if (cart[item.name].qty <= 0) delete cart[item.name];
        sndTab();
        renderCart();
        updateBadge(false);
      };
    });
    rows.appendChild(row);
  });
  const total = cartTotal();
  document.getElementById("cart-total-amount").innerHTML =
    `<span class="money-stack">${moneyIcons(total)}</span>` +
    `<span class="total-won">${total.toLocaleString()}원</span>`;
  document.getElementById("checkout-btn").disabled = entries.length === 0;
}

/* ── 화면 흐름 연결 ── */
document.getElementById("screen-start").addEventListener("click", () => {
  sndDing();
  currentTab = "주스";
  renderTabs();
  renderMenu();
  show("screen-order");
});

document.getElementById("cart-btn").onclick = () => {
  sndTab();
  renderCart();
  show("screen-cart");
};

document.getElementById("back-to-menu").onclick = () => {
  sndTab();
  renderTabs();
  renderMenu();
  updateBadge(false);
  show("screen-order");
};

document.getElementById("checkout-btn").onclick = () => {
  if (cartCount() === 0) return;
  sndTab();
  show("screen-pay");
};

let payMethod = null; // 손님이 고른 결제 수단 ("card" | "cash") — 주문과 함께 포스로 전송

document.querySelectorAll(".pay-btn").forEach(b => {
  b.onclick = () => {
    sndTab();
    payMethod = b.dataset.method;
    if (b.dataset.method === "cash") {
      show("screen-cash");                    // 현금은 직원에게 주세요.
      after(4000, finishOrder);
    } else {
      show("screen-card");                    // 카드를 넣어주세요.
      after(3000, () => {
        show("screen-processing");            // 결제 중 . . .
        after(3000, () => {
          sndDing();
          show("screen-card-done");           // 결제 완료, 카드 제거
          after(3000, finishOrder);
        });
      });
    }
  };
});

// Realtime Database가 오프라인일 때 쓰기 요청이 응답 없이 멈춰있을 수 있어,
// 일정 시간 안에 끝나지 않으면 포기하고 놀이 흐름을 계속 진행한다 (키오스크 먹통 방지).
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("submit-timeout")), ms)),
  ]);
}

async function finishOrder() {
  // 현재 장바구니를 주문 내역으로 만들어 직원 포스로 전송 (Firebase 연동 시)
  const payload = {
    items: Object.values(cart).map(({ item, qty }) => ({
      name: item.name, qty, price: item.price,
      img: item.img, // 포스에서 그림으로 메뉴 구분 (글 못 읽는 아이들용)
    })),
    total: cartTotal(),
    payMethod: payMethod || "unknown", // 카드/현금 — 포스에서 안내용
  };
  let orderNo = null;
  let pending = false; // 5초 안에 응답을 못 받음 (네트워크 문제 가능성) — 그래도 놀이는 계속 진행
  if (window.submitOrder) {
    try {
      orderNo = await withTimeout(window.submitOrder(payload), 5000);
    } catch (e) {
      pending = true;
    }
  }

  const noEl = document.getElementById("done-order-no");
  if (orderNo != null) {
    noEl.textContent = `주문번호 ${orderNo}번`;
    noEl.hidden = false;
  } else if (pending) {
    noEl.textContent = `🔄 주문이 곧 반영돼요`;
    noEl.hidden = false;
  } else {
    noEl.hidden = true;
  }

  sndDing();
  show("screen-done");                        // 주문이 완료되었습니다. 감사합니다.
  after(6000, resetKiosk);
}

function resetKiosk() {
  cart = {};
  payMethod = null;
  updateBadge(false);
  show("screen-start");
}

// 완료 화면을 누르면 바로 처음으로
document.getElementById("screen-done").addEventListener("click", resetKiosk);
