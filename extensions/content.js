// ============================================================
//  授業モニター ロック - content.js
//  student.html に注入されてURLパラメータを background.js に送る
// ============================================================

(function () {
  'use strict';

  // student.html かどうかを判定（URLパラメータで session があるか）
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session');
  const databaseURL = params.get('db');
  const apiKey = params.get('apiKey');
  const projectId = params.get('projectId');

  if (!sessionId || !databaseURL || !apiKey) {
    // 必要なパラメータがない = 授業ページではない
    return;
  }

  // ページ読み込み完了後にセッション参加を通知
  window.addEventListener('load', () => {
    notifyJoined();
  });

  // DOMContentLoaded でも早めに通知（loadより早い）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyJoined);
  } else {
    notifyJoined();
  }

  let _notified = false;
  function notifyJoined() {
    if (_notified) return;
    _notified = true;

    chrome.runtime.sendMessage({
      type: 'SESSION_JOINED',
      sessionId,
      firebaseConfig: {
        databaseURL: decodeURIComponent(databaseURL),
        apiKey: decodeURIComponent(apiKey),
        projectId: decodeURIComponent(projectId || ''),
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[授業ロック] background への通知失敗:', chrome.runtime.lastError.message);
        return;
      }
      console.log('[授業ロック] セッション参加を通知しました', response);
    });
  }

  // セッション終了を検知（student.html 内の sessionが終了したとき）
  // MutationObserver でエラーメッセージを監視
  const observer = new MutationObserver(() => {
    const errorEl = document.getElementById('error-msg');
    if (errorEl && errorEl.textContent.includes('セッションが終了')) {
      observer.disconnect();
      chrome.runtime.sendMessage({ type: 'SESSION_LEFT' });
    }
  });

  // DOMが利用可能になってから観察開始
  const startObserving = () => {
    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    }
  };

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving);
  }

})();
