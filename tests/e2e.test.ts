import { describe, it, expect } from 'vitest';
import type { RecordedAction, SelectorStrategy } from '../extension/shared/types.js';
import { exportPlaywright } from '../extension/shared/export-playwright.js';
import { exportStagehand } from '../extension/shared/export-stagehand.js';
import { exportBrowserUse } from '../extension/shared/export-browser-use.js';

// -- Test fixtures --

function makeAction(overrides: Partial<RecordedAction> = {}): RecordedAction {
  return {
    id: 'act_1',
    type: 'click',
    timestamp: Date.now(),
    url: 'https://example.com/page',
    selectors: [
      { type: 'test-id', value: '[data-testid="submit-btn"]', confidence: 0.95 },
      { type: 'text', value: 'text="Submit"', confidence: 0.9 },
      { type: 'aria', value: '[aria-label="Submit form"]', confidence: 0.85 },
      { type: 'css', value: 'button.btn-primary', confidence: 0.5 },
    ],
    description: 'Click on "Submit"',
    ...overrides,
  };
}

function makeRecording(): { actions: RecordedAction[]; startUrl: string } {
  return {
    startUrl: 'https://example.com',
    actions: [
      makeAction({
        id: 'act_1',
        type: 'navigate',
        url: 'https://example.com/login',
        selectors: [],
        description: 'Navigate to /login',
      }),
      makeAction({
        id: 'act_2',
        type: 'input',
        selectors: [
          { type: 'aria', value: '[placeholder="Email"]', confidence: 0.85 },
          { type: 'css', value: '#email-input', confidence: 0.5 },
        ],
        value: 'user@example.com',
        description: 'Type in "Email"',
      }),
      makeAction({
        id: 'act_3',
        type: 'input',
        selectors: [
          { type: 'aria', value: '[placeholder="Password"]', confidence: 0.85 },
          { type: 'css', value: '#password-input', confidence: 0.5 },
        ],
        value: 's3cret',
        description: 'Type in "Password"',
      }),
      makeAction({
        id: 'act_4',
        type: 'click',
        selectors: [
          { type: 'text', value: 'text="Sign In"', confidence: 0.9 },
          { type: 'css', value: 'button.login-btn', confidence: 0.5 },
        ],
        description: 'Click on "Sign In"',
      }),
      makeAction({
        id: 'act_5',
        type: 'select',
        selectors: [
          { type: 'aria', value: '[aria-label="Language"]', confidence: 0.85 },
        ],
        value: 'en',
        description: 'Select from "Language"',
      }),
    ],
  };
}

// -- Playwright export tests --

describe('E2E: Playwright Export', () => {
  it('generates valid Playwright test structure', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportPlaywright(actions, startUrl);

    expect(output).toContain("import { test, expect } from '@playwright/test'");
    expect(output).toContain("test('recorded flow'");
    expect(output).toContain(`await page.goto('${startUrl}')`);
    expect(output).toContain('});');
  });

  it('generates navigate action', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportPlaywright(actions, startUrl);

    expect(output).toContain("await page.goto('https://example.com/login')");
  });

  it('generates fill actions for inputs', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportPlaywright(actions, startUrl);

    expect(output).toContain(".fill('user@example.com')");
    expect(output).toContain(".fill('s3cret')");
  });

  it('generates click actions', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportPlaywright(actions, startUrl);

    expect(output).toContain(".click()");
    expect(output).toContain('Sign In');
  });

  it('generates selectOption actions', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportPlaywright(actions, startUrl);

    expect(output).toContain(".selectOption('en')");
  });

  it('prefers test-id selectors over text', () => {
    const action = makeAction({
      selectors: [
        { type: 'test-id', value: '[data-testid="submit"]', confidence: 0.95 },
        { type: 'text', value: 'text="Submit"', confidence: 0.9 },
      ],
    });

    const output = exportPlaywright([action], 'https://example.com');
    expect(output).toContain('[data-testid="submit"]');
  });

  it('falls back to text when no test-id', () => {
    const action = makeAction({
      selectors: [
        { type: 'text', value: 'text="Click me"', confidence: 0.9 },
        { type: 'css', value: 'button.btn', confidence: 0.5 },
      ],
    });

    const output = exportPlaywright([action], 'https://example.com');
    expect(output).toContain('text=Click me');
  });

  it('falls back to aria when no text', () => {
    const action = makeAction({
      selectors: [
        { type: 'aria', value: '[aria-label="Close"]', confidence: 0.85 },
        { type: 'css', value: 'button.close', confidence: 0.5 },
      ],
    });

    const output = exportPlaywright([action], 'https://example.com');
    expect(output).toContain('[aria-label="Close"]');
  });

  it('falls back to css as last resort', () => {
    const action = makeAction({
      selectors: [
        { type: 'css', value: '#my-button', confidence: 0.5 },
      ],
    });

    const output = exportPlaywright([action], 'https://example.com');
    expect(output).toContain('#my-button');
  });

  it('uses body when no selectors', () => {
    const action = makeAction({ selectors: [] });
    const output = exportPlaywright([action], 'https://example.com');
    expect(output).toContain("'body'");
  });

  it('includes action descriptions as comments', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportPlaywright(actions, startUrl);

    expect(output).toContain('// Click on "Sign In"');
    expect(output).toContain('// Type in "Email"');
  });

  it('escapes single quotes in values', () => {
    const action = makeAction({
      type: 'input',
      value: "it's a test",
      description: 'Type in "Name"',
      selectors: [{ type: 'css', value: '#name', confidence: 0.5 }],
    });

    const output = exportPlaywright([action], 'https://example.com');
    expect(output).toContain("it\\'s a test");
  });

  it('handles empty recording', () => {
    const output = exportPlaywright([], 'https://example.com');
    expect(output).toContain("test('recorded flow'");
    expect(output).toContain("page.goto('https://example.com')");
    expect(output).toContain('});');
  });
});

// -- Stagehand export tests --

describe('E2E: Stagehand Export', () => {
  it('generates valid Stagehand structure', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportStagehand(actions, startUrl);

    expect(output).toContain("import { Stagehand } from '@browserbasehq/stagehand'");
    expect(output).toContain('async function main()');
    expect(output).toContain('stagehand.init()');
    expect(output).toContain(`page.goto('${startUrl}')`);
    expect(output).toContain('stagehand.close()');
    expect(output).toContain('main().catch(console.error)');
  });

  it('uses stagehand.act() for clicks with natural language', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportStagehand(actions, startUrl);

    expect(output).toContain("stagehand.act('Click on");
  });

  it('uses stagehand.act() for inputs with value', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportStagehand(actions, startUrl);

    expect(output).toContain('Type "user@example.com"');
    expect(output).toContain('Type "s3cret"');
  });

  it('uses page.goto() for navigation', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportStagehand(actions, startUrl);

    expect(output).toContain("page.goto('https://example.com/login')");
  });

  it('uses stagehand.act() for selects', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportStagehand(actions, startUrl);

    expect(output).toContain('Select "en"');
  });
});

// -- Browser Use export tests --

describe('E2E: Browser Use Export', () => {
  it('generates valid Python Browser Use structure', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportBrowserUse(actions, startUrl);

    expect(output).toContain('from browser_use import Agent');
    expect(output).toContain('from langchain_openai import ChatOpenAI');
    expect(output).toContain('async def main()');
    expect(output).toContain('asyncio.run(main())');
    expect(output).toContain(`Go to ${startUrl}`);
  });

  it('generates numbered steps for each action', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportBrowserUse(actions, startUrl);

    expect(output).toContain('1. Navigate to');
    expect(output).toContain('2. Type in');
    expect(output).toContain('3. Type in');
    expect(output).toContain('4. Click on');
    expect(output).toContain('5. Select from');
  });

  it('includes values for input steps', () => {
    const { actions, startUrl } = makeRecording();
    const output = exportBrowserUse(actions, startUrl);

    expect(output).toContain('user@example.com');
    expect(output).toContain('s3cret');
  });
});

// -- Cross-format consistency tests --

describe('E2E: Cross-format consistency', () => {
  const { actions, startUrl } = makeRecording();

  it('all formats produce non-empty output', () => {
    expect(exportPlaywright(actions, startUrl).length).toBeGreaterThan(100);
    expect(exportStagehand(actions, startUrl).length).toBeGreaterThan(100);
    expect(exportBrowserUse(actions, startUrl).length).toBeGreaterThan(100);
  });

  it('all formats reference the start URL', () => {
    expect(exportPlaywright(actions, startUrl)).toContain(startUrl);
    expect(exportStagehand(actions, startUrl)).toContain(startUrl);
    expect(exportBrowserUse(actions, startUrl)).toContain(startUrl);
  });

  it('all formats handle all action types without crashing', () => {
    const allTypes: RecordedAction[] = [
      makeAction({ type: 'click' }),
      makeAction({ type: 'input', value: 'test' }),
      makeAction({ type: 'select', value: 'opt1' }),
      makeAction({ type: 'navigate', url: 'https://example.com/page2', selectors: [] }),
      makeAction({ type: 'scroll' }),
      makeAction({ type: 'wait' }),
    ];

    expect(() => exportPlaywright(allTypes, startUrl)).not.toThrow();
    expect(() => exportStagehand(allTypes, startUrl)).not.toThrow();
    expect(() => exportBrowserUse(allTypes, startUrl)).not.toThrow();
  });
});

// -- Selector ranking tests --

describe('E2E: Selector ranking strategy', () => {
  it('selectors are sorted by confidence (highest first)', () => {
    const action = makeAction();
    const confidences = action.selectors.map(s => s.confidence);
    const sorted = [...confidences].sort((a, b) => b - a);
    expect(confidences).toEqual(sorted);
  });

  it('test-id has highest confidence', () => {
    const action = makeAction();
    const testId = action.selectors.find(s => s.type === 'test-id');
    const maxConfidence = Math.max(...action.selectors.map(s => s.confidence));
    expect(testId?.confidence).toBe(maxConfidence);
  });

  it('css has lowest confidence', () => {
    const action = makeAction();
    const css = action.selectors.find(s => s.type === 'css');
    const minConfidence = Math.min(...action.selectors.map(s => s.confidence));
    expect(css?.confidence).toBe(minConfidence);
  });
});
