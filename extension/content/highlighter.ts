const HIGHLIGHT_CLASS = 'agent-trace-highlight';
const OVERLAY_ID = 'agent-trace-overlay';

let styleInjected = false;

function injectStyles(): void {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px !important;
      background: rgba(16, 185, 129, 0.1) !important;
      transition: outline 0.15s ease, background 0.15s ease !important;
    }
    #${OVERLAY_ID} {
      position: fixed;
      top: 8px;
      right: 8px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      color: #e2e8f0;
      padding: 8px 14px;
      border-radius: 8px;
      font-family: -apple-system, sans-serif;
      font-size: 12px;
      z-index: 2147483647;
      border: 1px solid rgba(99, 102, 241, 0.4);
      pointer-events: none;
    }
    #${OVERLAY_ID} .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #f43f5e;
      border-radius: 50%;
      margin-right: 6px;
      animation: agent-trace-pulse 1s infinite;
    }
    @keyframes agent-trace-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

export function showRecordingBadge(actionCount: number): void {
  injectStyles();
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<span class="dot"></span>Recording (${actionCount} actions)`;
}

export function hideRecordingBadge(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

export function highlightElement(element: Element): void {
  injectStyles();
  element.classList.add(HIGHLIGHT_CLASS);
  setTimeout(() => {
    element.classList.remove(HIGHLIGHT_CLASS);
  }, 1500);
}
