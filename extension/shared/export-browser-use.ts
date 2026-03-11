import type { RecordedAction } from './types.js';

export function exportBrowserUse(actions: RecordedAction[], startUrl: string): string {
  const lines: string[] = [
    `from browser_use import Agent`,
    `from langchain_openai import ChatOpenAI`,
    `import asyncio`,
    ``,
    `async def main():`,
    `    llm = ChatOpenAI(model="gpt-4o")`,
    `    agent = Agent(`,
    `        task="""`,
    `        Go to ${startUrl} and perform the following steps:`,
    ``,
  ];

  for (let i = 0; i < actions.length; i++) {
    const desc = actionToDescription(actions[i]);
    if (desc) lines.push(`        ${i + 1}. ${desc}`);
  }

  lines.push(
    `        """,`,
    `        llm=llm,`,
    `    )`,
    `    result = await agent.run()`,
    `    print(result)`,
    ``,
    ``,
    `asyncio.run(main())`,
    ``
  );

  return lines.join('\n');
}

function actionToDescription(action: RecordedAction): string | null {
  switch (action.type) {
    case 'click':
      return action.description;
    case 'input':
      return `${action.description} with value "${action.value ?? ''}"`;
    case 'select':
      return `${action.description} with value "${action.value ?? ''}"`;
    case 'navigate':
      return `Navigate to ${action.url}`;
    case 'scroll':
      return 'Scroll down the page';
    case 'wait':
      return 'Wait for the page to load';
    default:
      return null;
  }
}
