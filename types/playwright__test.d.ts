declare module "@playwright/test" {
  export interface Page {
    route(url: string, handler: (route: Route) => Promise<void> | void): Promise<void>;
    goto(url: string): Promise<void>;
    getByText(text: string | RegExp): Locator;
    getByRole(role: string, options?: Record<string, unknown>): Locator;
    getByLabel(text: string | RegExp): Locator;
  }

  export interface Locator {
    click(options?: Record<string, unknown>): Promise<void>;
    fill(value: string): Promise<void>;
    check(options?: Record<string, unknown>): Promise<void>;
  }

  export interface Route {
    request(): Request;
    fulfill(options: { status: number; contentType: string; body: string }): Promise<void>;
  }

  export interface Request {
    method(): string;
    postData(): string | null;
  }

  export interface TestArgs {
    page: Page;
  }

  export interface Expectation {
    toHaveURL(url: string | RegExp): Promise<void>;
    toMatchObject(expected: Record<string, unknown>): void;
  }

  export type TestFn = (name: string, fn: (args: TestArgs) => Promise<void>) => void;

  export const test: TestFn;
  export function expect(actual: unknown): Expectation;
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}
