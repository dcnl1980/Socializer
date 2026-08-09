import { mkdir } from "node:fs/promises";
import { FakeBrowserAdapter } from "./fake.js";
import { parseProxyUrl } from "./proxy.js";
import type {
  BrowserEngine,
  BrowserSession,
  OpenSeatSessionInput,
} from "./types.js";

export async function openPersistentSession(
  input: OpenSeatSessionInput,
): Promise<BrowserSession> {
  const engine = input.engine ?? "fake";
  await mkdir(input.profileDir, { recursive: true });

  if (engine === "fake") {
    return new FakeBrowserAdapter().openSeatSession(input);
  }

  if (engine === "patchright") {
    return launchPatchright(input);
  }

  if (engine === "cloakbrowser") {
    return launchCloak(input);
  }

  const _exhaustive: never = engine;
  throw new Error(`unsupported_engine_${String(_exhaustive)}`);
}

async function launchPatchright(
  input: OpenSeatSessionInput,
): Promise<BrowserSession> {
  let chromium: {
    launchPersistentContext: (
      userDataDir: string,
      options: Record<string, unknown>,
    ) => Promise<{
      newPage: () => Promise<{
        goto: (url: string, options?: object) => Promise<unknown>;
        close: () => Promise<void>;
      }>;
      close: () => Promise<void>;
    }>;
  };
  try {
    // Optional dependency — installed when running real seats.
    chromium = (await import("patchright")).chromium;
  } catch {
    throw new Error(
      "patchright_not_installed: pnpm --filter @socializer/browser add patchright",
    );
  }

  const proxy = input.proxyUrl ? parseProxyUrl(input.proxyUrl) : undefined;
  const context = await chromium.launchPersistentContext(input.profileDir, {
    channel: "chrome",
    headless: input.headless ?? true,
    proxy: proxy
      ? {
          server: proxy.server,
          username: proxy.username,
          password: proxy.password,
        }
      : undefined,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await context.newPage();
  return {
    seatId: input.seatId,
    engine: "patchright",
    page,
    async close() {
      await context.close();
    },
  };
}

async function launchCloak(input: OpenSeatSessionInput): Promise<BrowserSession> {
  let launch: (options: Record<string, unknown>) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, options?: object) => Promise<unknown>;
      close: () => Promise<void>;
    }>;
    close: () => Promise<void>;
  }>;
  try {
    launch = (await import("cloakbrowser")).launch;
  } catch {
    throw new Error(
      "cloakbrowser_not_installed: pnpm --filter @socializer/browser add cloakbrowser",
    );
  }

  const browser = await launch({
    headless: input.headless ?? true,
    proxy: input.proxyUrl || undefined,
    geoip: Boolean(input.proxyUrl),
  });
  const page = await browser.newPage();
  return {
    seatId: input.seatId,
    engine: "cloakbrowser" satisfies BrowserEngine,
    page,
    async close() {
      await browser.close();
    },
  };
}
