import type { RecordedAction, SelectorStrategy } from './types.js';

export function exportPlaywright(actions: RecordedAction[], startUrl: string): string {
  const lines: string[] = [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `test('recorded flow', async ({ page }) => {`,
    `  await page.goto('${startUrl}');`,
    ``,
  ];

  for (const action of actions) {
    const line = actionToPlaywright(action);
    if (line) lines.push(`  ${line}`);
  }

  lines.push(`});`, ``);
  return lines.join('\n');
}

function actionToPlaywright(action: RecordedAction): string | null {
  const selector = bestPlaywrightSelector(action.selectors);

  switch (action.type) {
    case 'click':
      return `await page.locator('${selector}').click(); // ${action.description}`;

    case 'input':
      return `await page.locator('${selector}').fill('${escape(action.value ?? '')}'); // ${action.description}`;

    case 'select':
      return `await page.locator('${selector}').selectOption('${escape(action.value ?? '')}'); // ${action.description}`;

    case 'navigate':
      return `await page.goto('${action.url}'); // ${action.description}`;

    case 'scroll':
      return `await page.mouse.wheel(0, 300); // ${action.description}`;

    case 'wait':
      return `await page.waitForTimeout(1000); // ${action.description}`;

    default:
      return null;
  }
}

function bestPlaywrightSelector(selectors: SelectorStrategy[]): string {
  if (selectors.length === 0) return 'body';

  for (const s of selectors) {
    if (s.type === 'test-id') {
      const match = s.value.match(/\[data-testid="(.+)"\]/);
      if (match) return `[data-testid="${match[1]}"]`;
      return s.value;
    }
  }

  for (const s of selectors) {
    if (s.type === 'text') {
      const match = s.value.match(/text="(.+)"/);
      if (match) return `text=${match[1]}`;
      return s.value;
    }
  }

  for (const s of selectors) {
    if (s.type === 'aria') return s.value;
  }

  return selectors[selectors.length - 1]?.value ?? 'body';
}

function escape(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
