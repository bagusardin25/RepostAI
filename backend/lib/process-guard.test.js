import assert, { AssertionError } from "node:assert/strict";
import { describe, it } from "node:test";
import { handleUncaught, isUndiciSocketAssertion } from "./process-guard.js";

function assertionWithStack(stack) {
  const error = new AssertionError({ actual: false, expected: true, operator: "==" });
  error.stack = stack;
  return error;
}

// Shape of the error that restarted the API on Railway (Node 22).
const undiciAssertion = assertionWithStack(
  [
    "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:",
    "  assert(!this.paused)",
    "    at Parser.finish (node:internal/deps/undici/undici:6165:9)",
    "    at TLSSocket.<anonymous> (node:internal/deps/undici/undici:6499:36)",
    "    at TLSSocket.emit (node:events:531:35)",
  ].join("\n"),
);

function run(error, origin = "uncaughtException") {
  const calls = { logs: 0, exitCode: null };
  handleUncaught(error, origin, {
    log: () => {
      calls.logs += 1;
    },
    exit: (code) => {
      calls.exitCode = code;
    },
  });
  return calls;
}

describe("isUndiciSocketAssertion", () => {
  it("matches the assertion thrown inside Node's fetch", () => {
    assert.equal(isUndiciSocketAssertion(undiciAssertion), true);
  });

  it("does not match assertions or errors from our own code", () => {
    const ours = assertionWithStack("AssertionError [ERR_ASSERTION]\n    at file:///app/backend/server.js:10:3");
    assert.equal(isUndiciSocketAssertion(ours), false);
    const otherUndiciAssertion = assertionWithStack(
      "AssertionError [ERR_ASSERTION]: assert(this.socket)\n    at Parser.finish (node:internal/deps/undici/undici:6165:9)\n    at TLSSocket.<anonymous> (node:internal/deps/undici/undici:6499:36)",
    );
    assert.equal(isUndiciSocketAssertion(otherUndiciAssertion), false);
    assert.equal(isUndiciSocketAssertion(new TypeError("x is not a function")), false);
    assert.equal(isUndiciSocketAssertion("ERR_ASSERTION"), false);
    assert.equal(isUndiciSocketAssertion(undefined), false);
  });
});

describe("handleUncaught", () => {
  it("logs and keeps running for the fetch socket assertion", () => {
    assert.deepEqual(run(undiciAssertion), { logs: 1, exitCode: null });
  });

  it("logs and exits for any other error", () => {
    assert.deepEqual(run(new Error("boom")), { logs: 1, exitCode: 1 });
    assert.deepEqual(run(new Error("rejected"), "unhandledRejection"), { logs: 1, exitCode: 1 });
  });
});
