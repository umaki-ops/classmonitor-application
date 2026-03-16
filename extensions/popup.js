// popup.js
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  if (chrome.runtime.lastError || !response) return;
  const { lockState } = response;
  updateUI(lockState);
});

function updateUI(lockState) {
  const dot    = document.getElementById('status-dot');
  const label  = document.getElementById('status-label');
  const detail = document.getElementById('status-detail');
  const sidEl  = document.getElementById('session-id');

  const features = ['newtab', 'switch', 'close', 'session'];

  if (lockState.active) {
    dot.classList.add('active');
    label.textContent = '🔴 ロック中';
    detail.textContent = '授業セッションに参加中です。授業が終わるまでタブの移動はできません。';
    sidEl.textContent = 'セッションID: ' + (lockState.sessionId || '');
    features.forEach(f => {
      document.getElementById('feat-' + f)?.classList.add('on');
    });
  } else {
    dot.classList.remove('active');
    label.textContent = '⚪ 待機中';
    detail.textContent = '先生が授業を開始するとロックが自動的に有効になります。';
    sidEl.textContent = '';
    features.forEach(f => {
      document.getElementById('feat-' + f)?.classList.remove('on');
    });
  }
}
