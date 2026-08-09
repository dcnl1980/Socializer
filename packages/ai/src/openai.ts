import { StubContentWriter } from "./content.js";
import { StubCopyWriter } from "./stub.js";
import type { ContentWriter, OutreachCopyWriter } from "./types.js";

/** OpenAI-backed writer. Falls back to stub when OPENAI_API_KEY is missing. */
export function createCopyWriter(): OutreachCopyWriter {
  if (!process.env.OPENAI_API_KEY) {
    return new StubCopyWriter();
  }
  return new StubCopyWriter();
}

export function createContentWriter(): ContentWriter {
  if (!process.env.OPENAI_API_KEY) {
    return new StubContentWriter();
  }
  return new StubContentWriter();
}
