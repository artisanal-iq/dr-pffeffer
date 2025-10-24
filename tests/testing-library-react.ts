import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";

export type RenderResult = {
  container: string;
  rerender: (ui: ReactNode) => void;
  unmount: () => void;
};

type TextMatcher = string | RegExp;

type ByRoleOptions = {
  name?: TextMatcher;
};

type QueryHit = {
  text: string;
};

let activeMarkup = "";

export function render(ui: ReactNode): RenderResult {
  activeMarkup = renderToStaticMarkup(ui as ReactElement);
  return {
    container: activeMarkup,
    rerender(next) {
      activeMarkup = renderToStaticMarkup(next as ReactElement);
    },
    unmount() {
      activeMarkup = "";
    },
  };
}

function ensureMarkup(): string {
  if (!activeMarkup) {
    throw new Error("No markup has been rendered");
  }
  return activeMarkup;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "");
}

function matchesText(value: string, matcher: TextMatcher): boolean {
  if (typeof matcher === "string") {
    return value.includes(matcher);
  }
  return matcher.test(value);
}

function queryAllHeadings(options?: ByRoleOptions): QueryHit[] {
  const markup = ensureMarkup();
  const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis;
  const hits: QueryHit[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markup))) {
    const content = stripTags(match[2]).trim();
    if (!options?.name || matchesText(content, options.name)) {
      hits.push({ text: content });
    }
  }
  return hits;
}

function findAllText(matcher: TextMatcher): QueryHit[] {
  const text = stripTags(ensureMarkup());
  if (typeof matcher === "string") {
    const escaped = matcher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    return Array.from(text.matchAll(regex)).map((result) => ({ text: result[0] }));
  }
  const flags = matcher.flags.includes("g") ? matcher.flags : `${matcher.flags}g`;
  const globalRegex = new RegExp(matcher.source, flags);
  return Array.from(text.matchAll(globalRegex)).map((result) => ({ text: result[0] }));
}

function getOne<T>(items: T[], message: string): T {
  if (items.length === 0) {
    throw new Error(message);
  }
  return items[0];
}

function getByRole(role: string, options?: ByRoleOptions): QueryHit {
  if (role !== "heading") {
    throw new Error(`Unsupported role: ${role}`);
  }
  const matches = queryAllHeadings(options);
  return getOne(matches, `Unable to find role ${role}`);
}

function getByText(matcher: TextMatcher): QueryHit {
  const matches = findAllText(matcher);
  return getOne(matches, `Unable to find text: ${matcher.toString()}`);
}

function getAllByText(matcher: TextMatcher): QueryHit[] {
  const matches = findAllText(matcher);
  if (matches.length === 0) {
    throw new Error(`Unable to find text: ${matcher.toString()}`);
  }
  return matches;
}

export const screen = {
  getByRole,
  getByText,
  getAllByText,
};

export function cleanup() {
  activeMarkup = "";
}

export function within() {
  return screen;
}
