// 로그인 잠금 (키오스크·포스·주문내역 공용).
// - 확인 중에는 스플래시만 표시 → 로그인창 깜박임 없음
// - 로그아웃 상태로 확인되면 그때 로그인 폼 표시 (구글/이메일)
// - 허브(꿈 놀이터)와 같은 주소·같은 Firebase라 한 번 로그인하면 모두 열림
// 페이지 스크립트는 window.PAGE_START 를 정의해두면 로그인 후 실행됨.

(function () {
  const body = document.body;
  let started = false;

  // ── 스타일 내장 (어느 페이지에서든 동작) ──
  const style = document.createElement("style");
  style.textContent = `
    body.gate-locked > :not(#gate-overlay) { display: none !important; }
    #gate-overlay {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      background: #DFF7C2; padding: 20px; overflow: auto;
      font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }
    .gate-splash { text-align: center; animation: gatePulse 1.6s ease-in-out infinite; }
    .gate-splash .em { font-size: 64px; display: block; margin-bottom: 12px; }
    .gate-splash .tx { font-size: 22px; font-weight: 800; color: #2E7D33; }
    @keyframes gatePulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
    .gate-box {
      width: min(92vw, 400px); background: #fff; border: 1px solid #cfe4bd;
      border-radius: 20px; box-shadow: 0 14px 36px rgba(60,110,60,.18);
      padding: 34px 30px; text-align: center;
    }
    .gate-box h2 { font-size: 23px; font-weight: 800; color: #2C332A; margin: 4px 0 2px; }
    .gate-brand { font-size: 20px; font-weight: 800; color: #2E7D33; }
    .gate-sub { font-size: 15px; color: #6E7A69; margin: 6px 0 18px; }
    .gate-box input {
      font-family: inherit; font-size: 16px; padding: 13px 16px; width: 100%;
      border: 1px solid #E1EAD8; border-radius: 12px; outline: none; margin-bottom: 10px;
      box-sizing: border-box; color: #2C332A; background: #fff;
    }
    .gate-box input:focus { border-color: #43A047; }
    .gate-google {
      display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%;
      font-family: inherit; font-size: 16px; font-weight: 700; padding: 13px;
      border-radius: 12px; border: 1px solid #E1EAD8; background: #fff; color: #2C332A;
      cursor: pointer; box-sizing: border-box;
    }
    .gate-google:hover { background: #FBFCF9; }
    .gate-google .g {
      width: 22px; height: 22px; border-radius: 50%; background: #fff; color: #4285F4;
      border: 1px solid #e6e6e6; font-weight: 800; display: inline-flex;
      align-items: center; justify-content: center; font-size: 14px;
    }
    .gate-or { display: flex; align-items: center; gap: 12px; margin: 16px 0; color: #9aab90; font-size: 13px; }
    .gate-or::before, .gate-or::after { content: ""; flex: 1; height: 1px; background: #E1EAD8; }
    .gate-login {
      width: 100%; font-family: inherit; font-size: 17px; font-weight: 700; color: #fff;
      background: #43A047; border: none; border-radius: 12px; padding: 13px; cursor: pointer;
    }
    .gate-login:hover { background: #2E7D33; }
    .gate-box button:disabled { opacity: .6; cursor: default; }
    .gate-err { min-height: 18px; margin: 12px 0 0; font-size: 14px; color: #d24b3a; font-weight: 600; }
    .gate-err.gate-ok { color: #2E7D33; }
    .gate-inapp {
      background: #FEF6E6; border: 1px solid #F3D998; border-radius: 12px;
      padding: 13px 15px; font-size: 13.5px; line-height: 1.6; color: #7a5a13; text-align: left; margin-bottom: 4px;
    }
    .gate-inapp b { color: #5a3d00; }
    .gate-forgot {
      display: block; width: 100%; margin-top: 12px; background: none; border: none; padding: 0;
      font-family: inherit; font-size: 13px; color: #7c8c78; text-decoration: underline; cursor: pointer;
    }
    .gate-forgot:hover { color: #2E7D33; }
    #gate-logout {
      position: fixed; right: 14px; bottom: 14px; z-index: 900;
      font-family: inherit; font-size: 14px; font-weight: 700; color: #2E7D33;
      background: rgba(255,255,255,.9); border: 2px solid #53AB58; border-radius: 16px;
      padding: 7px 16px; cursor: pointer; opacity: .85;
    }
  `;
  document.head.appendChild(style);

  function overlay(html) {
    let ov = document.getElementById("gate-overlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "gate-overlay";
      body.appendChild(ov);
    }
    ov.style.display = "flex";
    ov.innerHTML = html;
    return ov;
  }

  // 페이지별 스플래시 문구 (키오스크/직원 화면 공용)
  const isStaffPage = !!document.getElementById("pos-header");
  const splashEm = "🧃";
  const splashTx = "오로라 주스 가게";

  function showSplash() {
    body.classList.add("gate-locked");
    overlay(`<div class="gate-splash"><span class="em">${splashEm}</span><span class="tx">${splashTx}</span></div>`);
  }

  function inAppBrowser() {
    const ua = navigator.userAgent || "";
    return /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat|DaumApps|everytimeApp|; wv\)/i.test(ua);
  }

  function showLogin() {
    body.classList.add("gate-locked");
    const isInApp = inAppBrowser();
    const googleBlock = isInApp
      ? `<div class="gate-inapp">📱 지금 앱 속 브라우저로 열려 있어요. <b>구글 로그인은 Chrome·Safari에서만</b> 돼요. 아래 <b>이메일</b>로 로그인하시거나, 오른쪽 위 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러주세요.</div>
         <div class="gate-or"><span>이메일로 로그인</span></div>`
      : `<button type="button" class="gate-google" id="gg-btn"><span class="g">G</span> 구글로 계속하기</button>
         <div class="gate-or"><span>또는 이메일</span></div>`;
    const ov = overlay(`
      <div class="gate-box">
        <div class="gate-brand">${splashEm} ${splashTx}</div>
        <h2>선생님 로그인</h2>
        <p class="gate-sub">꿈 놀이터 계정으로 로그인해 주세요.</p>
        ${googleBlock}
        <form id="gate-form">
          <input id="gate-email" type="email" placeholder="이메일" autocomplete="username" required>
          <input id="gate-pw" type="password" placeholder="비밀번호" autocomplete="current-password" required>
          <button type="submit" class="gate-login" id="gate-login">로그인</button>
        </form>
        <button type="button" class="gate-forgot" id="gate-forgot-btn">비밀번호를 잊으셨나요?</button>
        <p class="gate-err" id="gate-err"></p>
      </div>`);
    const err = ov.querySelector("#gate-err");
    const setMsg = (m, ok) => { err.textContent = m; err.classList.toggle("gate-ok", !!ok); };
    const busy = (b) => ov.querySelectorAll("button,input").forEach(el => el.disabled = b);
    ov.querySelector("#gg-btn").onclick = async () => {
      setMsg(""); busy(true);
      try { await window.signInGoogle(); }
      catch (e) {
        busy(false);
        if (e && e.code !== "auth/popup-closed-by-user") setMsg("구글 로그인에 실패했어요.");
      }
    };
    ov.querySelector("#gate-form").addEventListener("submit", async (e) => {
      e.preventDefault(); setMsg(""); busy(true);
      try { await window.signIn(ov.querySelector("#gate-email").value.trim(), ov.querySelector("#gate-pw").value); }
      catch (ex) { busy(false); setMsg("이메일 또는 비밀번호를 확인해 주세요."); }
    });
    ov.querySelector("#gate-forgot-btn").onclick = async () => {
      const email = ov.querySelector("#gate-email").value.trim();
      if (!email) { setMsg("이메일을 먼저 입력해 주세요."); return; }
      setMsg(""); busy(true);
      try {
        await window.sendPasswordReset(email);
        busy(false);
        setMsg("재설정 링크를 이메일로 보냈어요. 받은편지함을 확인해 주세요.", true);
      } catch (ex) {
        busy(false);
        setMsg(ex && ex.code === "auth/invalid-email" ? "이메일 형식을 확인해 주세요." : "재설정 이메일 전송에 실패했어요.");
      }
    };
  }

  function enter() {
    body.classList.remove("gate-locked");
    const ov = document.getElementById("gate-overlay");
    if (ov) ov.style.display = "none";
    // 로그아웃 버튼은 직원 화면(포스·내역)에만 — 키오스크에선 아이들이 누를 수 있어 숨김
    if (isStaffPage && !document.getElementById("gate-logout")) {
      const b = document.createElement("button");
      b.id = "gate-logout";
      b.textContent = "로그아웃";
      b.onclick = async () => { await window.signOutUser(); location.reload(); };
      body.appendChild(b);
    }
    if (!started) { started = true; (window.PAGE_START || function () {})(); }
  }

  function begin() {
    if (!window.REQUIRE_LOGIN || !window.ORDERS_ENABLED || !window.watchAuth) {
      enter();
      return;
    }
    showSplash(); // 확인 중엔 스플래시만 (로그인창 깜박임 방지)
    window.watchAuth(function (user) {
      if (user) enter();
      else showLogin();
    });
  }

  if (window.ORDERS_READY) begin();
  else window.addEventListener("orders-ready", begin, { once: true });
})();
