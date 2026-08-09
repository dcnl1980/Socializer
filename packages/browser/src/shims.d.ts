declare module "patchright" {
  export const chromium: {
    launchPersistentContext: (
      userDataDir: string,
      options: Record<string, unknown>,
    ) => Promise<{
      newPage: () => Promise<Record<string, unknown>>;
      close: () => Promise<void>;
    }>;
  };
}

declare module "cloakbrowser" {
  export function launch(options: Record<string, unknown>): Promise<{
    newPage: () => Promise<Record<string, unknown>>;
    close: () => Promise<void>;
  }>;
}
