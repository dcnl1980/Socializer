import { describe, expect, it } from "vitest";
import { acquireSeatLease, releaseSeatLease, type LeaseStore } from "./lease.js";

function memoryStore(): LeaseStore {
  const map = new Map<string, string>();
  return {
    async set(key, value, _mode, _ttl, flag) {
      if (flag === "NX" && map.has(key)) return null;
      map.set(key, value);
      return "OK";
    },
    async get(key) {
      return map.get(key) ?? null;
    },
    async del(key) {
      return map.delete(key) ? 1 : 0;
    },
  };
}

describe("seat lease", () => {
  it("allows one owner", async () => {
    const store = memoryStore();
    expect(await acquireSeatLease(store, "seat-1", "w1", 1000)).toBe(true);
    expect(await acquireSeatLease(store, "seat-1", "w2", 1000)).toBe(false);
    await releaseSeatLease(store, "seat-1", "w1");
    expect(await acquireSeatLease(store, "seat-1", "w2", 1000)).toBe(true);
  });
});
