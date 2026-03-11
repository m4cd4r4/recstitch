import type { RecordedAction, MessageType } from '../shared/types.js';
import { generateSelectors, describeAction } from './selector.js';
import { highlightElement, showRecordingBadge, hideRecordingBadge } from './highlighter.js';

let isRecording = false;
let actionCount = 0;
let lastInputTimer: ReturnType<typeof setTimeout> | null = null;

function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function recordAction(action: RecordedAction): void {
  actionCount++;
  showRecordingBadge(actionCount);
  chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', action } satisfies MessageType);
}

function handleClick(event: MouseEvent): void {
  if (!isRecording) return;
  const target = event.target as Element;
  if (!target || target.id === 'agent-trace-overlay') return;

  highlightElement(target);

  const action: RecordedAction = {
    id: generateId(),
    type: 'click',
    timestamp: Date.now(),
    url: window.location.href,
    selectors: generateSelectors(target),
    description: describeAction(target, 'click'),
  };

  recordAction(action);
}

function handleInput(event: Event): void {
  if (!isRecording) return;
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (!target) return;

  // Debounce rapid typing
  if (lastInputTimer) clearTimeout(lastInputTimer);
  lastInputTimer = setTimeout(() => {
    highlightElement(target);

    const action: RecordedAction = {
      id: generateId(),
      type: 'input',
      timestamp: Date.now(),
      url: window.location.href,
      selectors: generateSelectors(target),
      value: target.value,
      description: describeAction(target, 'input'),
    };

    recordAction(action);
  }, 500);
}

function handleChange(event: Event): void {
  if (!isRecording) return;
  const target = event.target as HTMLSelectElement;
  if (target.tagName !== 'SELECT') return;

  highlightElement(target);

  const action: RecordedAction = {
    id: generateId(),
    type: 'select',
    timestamp: Date.now(),
    url: window.location.href,
    selectors: generateSelectors(target),
    value: target.value,
    description: describeAction(target, 'select'),
  };

  recordAction(action);
}

function startRecording(): void {
  isRecording = true;
  actionCount = 0;
  showRecordingBadge(0);

  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
}

function stopRecording(): void {
  isRecording = false;
  hideRecordingBadge();

  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('input', handleInput, true);
  document.removeEventListener('change', handleChange, true);
}

chrome.runtime.onMessage.addListener((message: MessageType) => {
  if (message.type === 'START_RECORDING') {
    startRecording();
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  }
});
