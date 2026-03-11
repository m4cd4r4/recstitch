import type { SelectorStrategy } from '../shared/types.js';

export function generateSelectors(element: Element): SelectorStrategy[] {
  const strategies: SelectorStrategy[] = [];

  const textSelector = getTextSelector(element);
  if (textSelector) {
    strategies.push({ type: 'text', value: textSelector, confidence: 0.9 });
  }

  const ariaSelector = getAriaSelector(element);
  if (ariaSelector) {
    strategies.push({ type: 'aria', value: ariaSelector, confidence: 0.85 });
  }

  const testId = getTestIdSelector(element);
  if (testId) {
    strategies.push({ type: 'test-id', value: testId, confidence: 0.95 });
  }

  const cssSelector = getCssSelector(element);
  if (cssSelector) {
    strategies.push({ type: 'css', value: cssSelector, confidence: 0.5 });
  }

  return strategies.sort((a, b) => b.confidence - a.confidence);
}

function getTextSelector(element: Element): string | null {
  const text = element.textContent?.trim();
  if (!text || text.length > 80 || text.length < 1) return null;

  const tag = element.tagName.toLowerCase();
  if (['a', 'button', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'].includes(tag)) {
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanText.length <= 50) {
      return `text="${cleanText}"`;
    }
    return `text="${cleanText.slice(0, 50)}"`;
  }

  return null;
}

function getAriaSelector(element: Element): string | null {
  const label = element.getAttribute('aria-label');
  if (label) return `[aria-label="${label}"]`;

  const role = element.getAttribute('role');
  const name = element.getAttribute('name');
  if (role && name) return `[role="${role}"][name="${name}"]`;
  if (role) {
    const text = element.textContent?.trim().slice(0, 30);
    if (text) return `[role="${role}"]:has-text("${text}")`;
  }

  const placeholder = element.getAttribute('placeholder');
  if (placeholder) return `[placeholder="${placeholder}"]`;

  const title = element.getAttribute('title');
  if (title) return `[title="${title}"]`;

  return null;
}

function getTestIdSelector(element: Element): string | null {
  const attrs = ['data-testid', 'data-test-id', 'data-cy', 'data-test'];
  for (const attr of attrs) {
    const value = element.getAttribute(attr);
    if (value) return `[${attr}="${value}"]`;
  }
  return null;
}

function getCssSelector(element: Element): string | null {
  const id = element.id;
  if (id && !id.match(/^[0-9]/) && !id.includes(':')) {
    return `#${CSS.escape(id)}`;
  }

  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter(c => !c.match(/^[0-9]/) && c.length < 40)
    .slice(0, 2);

  if (classes.length > 0) {
    const selector = `${tag}.${classes.map(c => CSS.escape(c)).join('.')}`;
    if (isUnique(selector, element)) return selector;
  }

  const parent = element.parentElement;
  if (parent) {
    const parentId = parent.id;
    if (parentId) {
      const children = Array.from(parent.children);
      const index = children.indexOf(element);
      return `#${CSS.escape(parentId)} > ${tag}:nth-child(${index + 1})`;
    }
  }

  return buildPathSelector(element);
}

function isUnique(selector: string, element: Element): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

function buildPathSelector(element: Element, depth = 0): string {
  if (depth > 4 || !element.parentElement) {
    return element.tagName.toLowerCase();
  }

  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  const siblings = Array.from(parent.children).filter(
    c => c.tagName === element.tagName
  );

  let segment = tag;
  if (siblings.length > 1) {
    const index = siblings.indexOf(element) + 1;
    segment = `${tag}:nth-of-type(${index})`;
  }

  if (parent.id) {
    return `#${CSS.escape(parent.id)} > ${segment}`;
  }

  if (parent === document.body) {
    return `body > ${segment}`;
  }

  return `${buildPathSelector(parent, depth + 1)} > ${segment}`;
}

export function describeAction(element: Element, actionType: string): string {
  const tag = element.tagName.toLowerCase();
  const text = element.textContent?.trim().slice(0, 40) || '';
  const label = element.getAttribute('aria-label') || element.getAttribute('name') || '';

  const identifier = label || text || tag;

  switch (actionType) {
    case 'click':
      return `Click on "${identifier}"`;
    case 'input':
      return `Type in "${identifier}"`;
    case 'select':
      return `Select from "${identifier}"`;
    default:
      return `${actionType} on "${identifier}"`;
  }
}
