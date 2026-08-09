import { describe, expect, it } from "vitest";
import { parseProxyUrl } from "./proxy.js";

describe("parseProxyUrl", () => {
  it("parses auth and host", () => {
    expect(parseProxyUrl("http://user:p%40ss@proxy.example:10000")).toEqual({
      server: "http://proxy.example:10000",
      username: "user",
      password: "p@ss",
    });
  });
});
