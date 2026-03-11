import type { RecordedAction } from './types.js';

export function exportStagehand(actions: RecordedAction[], startUrl: string): string {
  const lines: string[] = [
    `import { Stagehand } from '@browserbasehq/stagehand';`,
    ``,
    `async function main() {`,
    `  const stagehand = new Stagehand();`,
    `  await stagehand.init();`,
    `  const page = stagehand.page;`,
    ``,
    `  await page.goto('${startUrl}');`,
    ``,
  ];

  for (const action of actions) {
    const line = actionToStagehand(action);
    if (line) lines.push(`  ${line}`);
  }

  lines.push(
    ``,
    `  await stagehand.close();`,
    `}`,
    ``,
    `main().catch(console.error);`,
    ``
  );

  return lines.join('\n');
}

function actionToStagehand(action: RecordedAction): string | null {
  switch (action.type) {
    case 'click':
      return `await stagehand.act('${escape(action.description)}');`;

    case 'input':
      return `await stagehand.act('Type "${escape(action.value ?? '')}" into ${escape(action.description.replace('Type in ', ''))}');`;

    case 'select':
      return `await stagehand.act('Select "${escape(action.value ?? '')}" from ${escape(action.description.replace('Select from ', ''))}');`;

    case 'navigate':
      return `await page.goto('${action.url}');`;

    case 'scroll':
      return `await stagehand.act('Scroll down');`;

    case 'wait':
      return `await page.waitForTimeout(1000);`;

    default:
      return null;
  }
}

function escape(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
