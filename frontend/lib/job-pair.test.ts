import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { earlierLaterIds } from "./job-pair";

const jobs = [
  { id: "old", createdAt: 10 },
  { id: "new", createdAt: 20 },
];

describe("earlierLaterIds", () => {
  it("keeps a pair that is already in creation order", () => {
    assert.deepEqual(earlierLaterIds(jobs, "old", "new"), {
      earlierId: "old",
      laterId: "new",
    });
  });

  it("swaps a pair so the earlier job is on the left", () => {
    assert.deepEqual(earlierLaterIds(jobs, "new", "old"), {
      earlierId: "old",
      laterId: "new",
    });
  });

  it("treats equal timestamps as already ordered", () => {
    const tied = [
      { id: "a", createdAt: 5 },
      { id: "b", createdAt: 5 },
    ];
    assert.deepEqual(earlierLaterIds(tied, "a", "b"), { earlierId: "a", laterId: "b" });
  });

  it("waits until both jobs are loaded", () => {
    assert.equal(earlierLaterIds(jobs, "old", "missing"), null);
    assert.equal(earlierLaterIds(jobs, "old", "old"), null);
    assert.equal(earlierLaterIds([], "old", "new"), null);
  });
});
