export interface RecordedAction {
  id: string;
  type: 'click' | 'input' | 'navigate' | 'select' | 'scroll' | 'wait';
  timestamp: number;
  url: string;
  selectors: SelectorStrategy[];
  value?: string;
  description: string;
}

export interface SelectorStrategy {
  type: 'text' | 'aria' | 'css' | 'test-id';
  value: string;
  confidence: number; // 0-1, higher = more resilient to DOM changes
}

export interface RecordingState {
  isRecording: boolean;
  actions: RecordedAction[];
  startUrl: string;
  startTime: number;
}

export type MessageType =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'GET_STATE' }
  | { type: 'ACTION_RECORDED'; action: RecordedAction }
  | { type: 'DELETE_ACTION'; id: string }
  | { type: 'CLEAR_ACTIONS' }
  | { type: 'EXPORT'; format: ExportFormat }
  | { type: 'STATE_UPDATE'; state: RecordingState };

export type ExportFormat = 'playwright' | 'stagehand' | 'browser-use' | 'json';
