// 合言葉ゲート＋PWA登録
// パスコードは平文で埋め込まず、SHA-256ハッシュと比較する（簡易的な保護。
// 本格的な認証ではないため、機密性の高い内容の共有には別途アクセス制御を検討すること）。
// ハッシュの生成方法: ブラウザのコンソールで
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('合言葉')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
// を実行し、出力された文字列を PASSCODE_HASH に設定する。
const PASSCODE_HASH = "d387d8f016a1e8dd471de17fd837ce101676156ab7d2ec1e395a67d46f3472b0";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isAuthed() {
  try {
    return localStorage.getItem("mr_authed") === "1";
  } catch (e) {
    return false; // ストレージ不可の環境（サンドボックス等）では毎回ゲートを表示
  }
}

function setAuthed() {
  try {
    localStorage.setItem("mr_authed", "1");
  } catch (e) {
    // ストレージが使えない環境。今回の閲覧のみ許可し、次回はまたゲートが出る
  }
}

async function tryEnter(code) {
  const hash = await sha256Hex(code.trim());
  return hash === PASSCODE_HASH;
}

function initGate() {
  const gate = document.getElementById("gate");
  const listing = document.getElementById("listing");
  if (!gate || !listing) return;

  if (isAuthed()) {
    gate.hidden = true;
    listing.hidden = false;
    return;
  }

  const input = document.getElementById("passcode");
  const btn = document.getElementById("enter");
  const err = document.getElementById("err");

  async function submit() {
    err.textContent = "";
    try {
      const ok = await tryEnter(input.value || "");
      if (ok) {
        setAuthed();
        gate.hidden = true;
        listing.hidden = false;
      } else {
        err.textContent = "合言葉が違います";
        input.value = "";
        input.focus();
      }
    } catch (e) {
      err.textContent = "エラー: " + (e && e.message ? e.message : String(e));
    }
  }

  btn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
  input.focus();
}

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    const base = location.pathname.includes("/reports/") ? "../sw.js" : "sw.js";
    navigator.serviceWorker.register(base).catch(() => {});
  }
}

// このスクリプトはbody末尾（ゲート・一覧のHTMLより後）に配置される前提のため、
// DOMContentLoadedを待たず、実行時点で対象要素は既にパース済みとして直接初期化する。
// （環境によってはDOMContentLoadedが発火しないケースがあり、待つ方式は不安定だった）
initGate();
initServiceWorker();
