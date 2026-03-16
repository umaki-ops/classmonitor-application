// ============================================================
//  授業モニター ロック - background.js v3
//  Manifest V3 Service Worker
//  + ブラウザで授業URLを開いたら自動でPWAアプリに切り替え
// ============================================================

const STUDENT_PAGE_URL = 'https://umaki-ops.github.io/classmonitor/student.html';

// --------------------------------------------------------
// 状態管理
// --------------------------------------------------------
let lockState = {
  active: false,
  studentTabId: null,
  sessionId: null,
  firebaseConfig: null,
};

let pollingInterval = null;
let lastKnownSessionActive = false;

// --------------------------------------------------------
// 起動時に保存済み状態を復元
// --------------------------------------------------------
chrome.storage.session.get(['lockState'], (result) => {
  if (result.lockState) {
    lockState = { ...lockState, ...result.lockState };
    if (lockState.active) startPolling();
  }
});

// --------------------------------------------------------
// タブ更新監視: 授業URLをブラウザで開いたらPWAに切り替え
// --------------------------------------------------------
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

  // ① PWA自動起動: 授業URLがブラウザで開かれたとき
  if (changeInfo.status === 'loading' && changeInfo.url && isStudentPageUrl(changeInfo.url)) {
    launchAsPwa(tabId, changeInfo.url);
    return;
  }

  // ② ロック中: 授業タブで別URLに移動しようとしたら戻す
  if (!lockState.active) return;
  if (tabId !== lockState.studentTabId) return;
  if (changeInfo.url && !isStudentPageUrl(changeInfo.url)) {
    chrome.tabs.update(tabId, { url: buildStudentUrl() });
  }
});

// --------------------------------------------------------
// PWAとして起動し直す
// --------------------------------------------------------
function launchAsPwa(tabId, url) {
  chrome.windows.create({
    url: url,
    type: 'popup',
    state: 'maximized',
  }, (newWin) => {
    if (chrome.runtime.lastError) return;
    chrome.tabs.remove(tabId);
    if (newWin && newWin.tabs && newWin.tabs[0]) {
      lockState.studentTabId = newWin.tabs[0].id;
      saveState();
    }
  });
}

// --------------------------------------------------------
// content.js からのメッセージ受信
// --------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SESSION_JOINED') {
    const { sessionId, firebaseConfig } = message;
    lockState.studentTabId = sender.tab.id;
    lockState.sessionId = sessionId;
    lockState.firebaseConfig = firebaseConfig;
    lockState.active = true;
    saveState();
    startPolling();
    enforceTabLock();
    updateIcon(true);
    sendResponse({ ok: true });
  }
  if (message.type === 'SESSION_LEFT') {
    releaseLock();
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_STATE') {
    sendResponse({ lockState });
  }
  return true;
});

// --------------------------------------------------------
// タブ監視: 新しいタブが開かれたら閉じる
// --------------------------------------------------------
chrome.tabs.onCreated.addListener((tab) => {
  if (!lockState.active) return;
  if (tab.id === lockState.studentTabId) return;
  chrome.tabs.remove(tab.id, () => { focusStudentTab(); });
});

// --------------------------------------------------------
// タブ監視: 他のタブがアクティブになったら授業タブに戻す
// --------------------------------------------------------
chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (!lockState.active) return;
  if (tabId === lockState.studentTabId) return;
  focusStudentTab();
});

// --------------------------------------------------------
// タブ監視: 授業タブが閉じられたら再度開く
// --------------------------------------------------------
chrome.tabs.onRemoved.addListener((tabId) => {
  if (!lockState.active) return;
  if (tabId !== lockState.studentTabId) return;
  reopenStudentTab();
});

// --------------------------------------------------------
// ヘルパー群
// --------------------------------------------------------
function focusStudentTab() {
  if (!lockState.studentTabId) return;
  chrome.tabs.get(lockState.studentTabId, (tab) => {
    if (chrome.runtime.lastError || !tab) { reopenStudentTab(); return; }
    chrome.tabs.update(lockState.studentTabId, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });
}

function reopenStudentTab() {
  if (!lockState.sessionId || !lockState.firebaseConfig) return;
  const url = buildStudentUrl();
  chrome.windows.create({ url, type: 'popup', state: 'maximized' }, (win) => {
    if (win && win.tabs && win.tabs[0]) {
      lockState.studentTabId = win.tabs[0].id;
      saveState();
    }
  });
}

function buildStudentUrl() {
  if (!lockState.firebaseConfig || !lockState.sessionId) return STUDENT_PAGE_URL;
  const cfg = lockState.firebaseConfig;
  return `${STUDENT_PAGE_URL}?session=${lockState.sessionId}&db=${encodeURIComponent(cfg.databaseURL)}&apiKey=${encodeURIComponent(cfg.apiKey)}&projectId=${encodeURIComponent(cfg.projectId)}`;
}

function isStudentPageUrl(url) {
  try {
    const u = new URL(url);
    const base = new URL(STUDENT_PAGE_URL);
    return u.hostname === base.hostname && u.pathname === base.pathname;
  } catch { return false; }
}

function enforceTabLock() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id !== lockState.studentTabId) chrome.tabs.remove(tab.id);
    });
  });
}

function startPolling() {
  stopPolling();
  pollingInterval = setInterval(checkSessionStatus, 5000);
  checkSessionStatus();
}

function stopPolling() {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}

async function checkSessionStatus() {
  if (!lockState.sessionId || !lockState.firebaseConfig) return;
  try {
    const { databaseURL, apiKey } = lockState.firebaseConfig;
    const res = await fetch(`${databaseURL}/sessions/${lockState.sessionId}/active.json?auth=${apiKey}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data === false || data === null) {
      if (lastKnownSessionActive) { lastKnownSessionActive = false; releaseLock(); }
    } else {
      lastKnownSessionActive = true;
    }
  } catch (e) { console.warn('[授業ロック] セッション確認エラー:', e); }
}

function releaseLock() {
  lockState.active = false;
  lockState.studentTabId = null;
  lockState.sessionId = null;
  lockState.firebaseConfig = null;
  stopPolling();
  saveState();
  updateIcon(false);
}

function saveState() { chrome.storage.session.set({ lockState }); }

function updateIcon(locked) {
  chrome.action.setBadgeText({ text: locked ? '🔒' : '' });
  chrome.action.setBadgeBackgroundColor({ color: locked ? '#ef4444' : '#3b82f6' });
}
