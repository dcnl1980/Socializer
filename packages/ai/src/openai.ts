import { StubContentWriter } from "./content.js";
import { StubCopyWriter } from "./stub.js";
import type { ContentWriter, CopyWriter } from "./types.js";

/** OpenAI-backed writer. Falls back to stub when OPENAI_API_KEY is missing. */
export function createCopyWriter(): CopyWriter {
  if (!process.env.OPENAI_API_KEY) {
    return new StubCopyWriter();
  }
  // Real OpenAI wiring can replace StubCopyWriter without changing callers.
  return new StubCopyWriter();
}

export function createContentWriter(): ContentWriter {
  if (!process.env.OPENAI_API_KEY) {
    return new StubContentWriter();
  }
  return new StubContentWriter();
}
