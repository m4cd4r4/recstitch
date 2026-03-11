import type { RecordingState, RecordedAction, ExportFormat, MessageType } from '../shared/types.js';
import { exportPlaywright } from '../shared/export-playwright.js';
import { exportStagehand } from '../shared/export-stagehand.js';
import { exportBrowserUse } from '../shared/export-browser-use.js';

const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const statusBadge = document.getElementById('status') as HTMLSpanElement;
const actionList = document.getElementById('actionList') as HTMLDivElement;

let currentState: RecordingState = {
  isRecording: false,
  actions: [],
  startUrl: '',
  startTime: 0,
};

function updateUI(state: RecordingState): void {
  currentState = state;

  if (state.isRecording) {
    toggleBtn.textContent = 'Stop Recording';
    toggleBtn.classList.add('stop');
    statusBadge.textContent = 'Recording';
    statusBadge.classList.add('recording');
  } else {
    toggleBtn.textContent = 'Start Recording';
    toggleBtn.classList.remove('stop');
    statusBadge.textContent = state.actions.length > 0 ? `${state.actions.length} actions` : 'Idle';
    statusBadge.classList.remove('recording');
  }

  renderActions(state.actions);
}

function renderActions(actions: RecordedAction[]): void {
  if (actions.length === 0) {
    actionList.innerHTML = '<div class="empty">No actions recorded yet.</div>';
    return;
  }

  actionList.innerHTML = actions
    .map(
      (action) => `
    <div class="action-item" data-id="${action.id}">
      <div class="action-info">
        <span class="action-type">${action.type}</span>
        <span class="action-desc" title="${escapeHtml(action.description)}">${escapeHtml(action.description)}</span>
      </div>
      <button class="action-delete" data-id="${action.id}">x</button>
    </div>
  `
    )
    .join('');

  actionList.querySelectorAll('.action-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) chrome.runtime.sendMessage({ type: 'DELETE_ACTION', id } satisfies MessageType);
    });
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

toggleBtn.addEventListener('click', () => {
  if (currentState.isRecording) {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' } satisfies MessageType);
  } else {
    chrome.runtime.sendMessage({ type: 'START_RECORDING' } satisfies MessageType);
  }
});

clearBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_ACTIONS' } satisfies MessageType);
});

document.querySelectorAll('.btn-export').forEach((btn) => {
  btn.addEventListener('click', () => {
    const format = (btn as HTMLElement).dataset.format as ExportFormat;
    doExport(format);
  });
});

function doExport(format: ExportFormat): void {
  const { actions, startUrl } = currentState;
  if (actions.length === 0) return;

  let content: string;
  let filename: string;

  switch (format) {
    case 'playwright':
      content = exportPlaywright(actions, startUrl);
      filename = 'recording.spec.ts';
      break;
    case 'stagehand':
      content = exportStagehand(actions, startUrl);
      filename = 'recording-stagehand.ts';
      break;
    case 'browser-use':
      content = exportBrowserUse(actions, startUrl);
      filename = 'recording-browser-use.py';
      break;
    case 'json':
      content = JSON.stringify({ startUrl, actions }, null, 2);
      filename = 'recording.json';
      break;
    default:
      return;
  }

  downloadFile(content, filename);
}

function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

chrome.runtime.onMessage.addListener((message: MessageType) => {
  if (message.type === 'STATE_UPDATE') {
    updateUI(message.state);
  }
});

// Load initial state
chrome.runtime.sendMessage(
  { type: 'GET_STATE' } satisfies MessageType,
  (response: MessageType | undefined) => {
    if (response && response.type === 'STATE_UPDATE') {
      updateUI(response.state);
    }
  }
);
