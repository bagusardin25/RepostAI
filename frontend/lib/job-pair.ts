export type TimedJob = {
  id: string;
  createdAt: number;
};

/**
 * The compare page labels the left side Earlier and the right side Later.
 * The API lays the cards out the same way, by creation time. The pair a caller
 * picked can be backwards; this returns the ids in card order, or null when
 * either job is not loaded yet.
 */
export function earlierLaterIds(
  jobs: TimedJob[],
  a: string,
  b: string,
): { earlierId: string; laterId: string } | null {
  if (!a || !b || a === b) return null;
  const left = jobs.find((job) => job.id === a);
  const right = jobs.find((job) => job.id === b);
  if (!left || !right) return null;
  if (left.createdAt <= right.createdAt) {
    return { earlierId: left.id, laterId: right.id };
  }
  return { earlierId: right.id, laterId: left.id };
}
