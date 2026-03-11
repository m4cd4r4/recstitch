import type { RecordingState, MessageType, RecordedAction } from '../shared/types.js';

const state: RecordingState = {
  isRecording: false,
  actions: [],
  startUrl: '',
  startTime: 0,
};

chrome.runtime.onMessage.addListener(
  (message: MessageType, _sender, sendResponse) => {
    switch (message.type) {
      case 'START_RECORDING':
        state.isRecording = true;
        state.actions = [];
        state.startTime = Date.now();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url) state.startUrl = tabs[0].url;
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'START_RECORDING' });
          }
        });
        broadcastState();
        break;

      case 'STOP_RECORDING':
        state.isRecording = false;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_RECORDING' });
          }
        });
        broadcastState();
        break;

      case 'ACTION_RECORDED':
        if (state.isRecording && message.action) {
          state.actions.push(message.action);
          broadcastState();
        }
        break;

      case 'DELETE_ACTION':
        if ('id' in message) {
          state.actions = state.actions.filter(a => a.id !== message.id);
          broadcastState();
        }
        break;

      case 'CLEAR_ACTIONS':
        state.actions = [];
        broadcastState();
        break;

      case 'GET_STATE':
        sendResponse({ type: 'STATE_UPDATE', state });
        return true;
    }
  }
);

function broadcastState(): void {
  chrome.runtime.sendMessage({
    type: 'STATE_UPDATE',
    state: { ...state },
  } satisfies MessageType).catch(() => {
    // popup may not be open
  });
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!state.isRecording) return;
  if (changeInfo.status === 'complete' && tab.url) {
    const action: RecordedAction = {
      id: `nav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'navigate',
      timestamp: Date.now(),
      url: tab.url,
      selectors: [],
      description: `Navigate to ${new URL(tab.url).pathname}`,
    };
    state.actions.push(action);
    broadcastState();

    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' }).catch(() => {});
    }
  }
});
