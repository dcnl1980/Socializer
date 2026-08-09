export type LeaseStore = {
  set(key: string, value: string, mode: "PX", ttl: number, flag: "NX"): Promise<"OK" | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
};

function leaseKey(seatId: string) {
  return `seat-lease:${seatId}`;
}

export async function acquireSeatLease(
  store: LeaseStore,
  seatId: string,
  workerId: string,
  ttlMs: number,
): Promise<boolean> {
  const result = await store.set(leaseKey(seatId), workerId, "PX", ttlMs, "NX");
  if (result === "OK") return true;
  const current = await store.get(leaseKey(seatId));
  return current === workerId;
}

export async function releaseSeatLease(
  store: LeaseStore,
  seatId: string,
  workerId: string,
): Promise<void> {
  const current = await store.get(leaseKey(seatId));
  if (current === workerId) {
    await store.del(leaseKey(seatId));
  }
}
