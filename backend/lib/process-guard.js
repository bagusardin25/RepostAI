// Node's built-in fetch (undici) can throw an AssertionError (`assert(!this.paused)`) from
// inside a socket "end" handler when a server closes a connection while a response body is
// paused. No caller can catch it, so it reached the process and restarted the API in the
// middle of a test run, failing every pack that was in progress. Only that error is ignored;
// any other uncaught error still ends the process so the host restarts it.
export function isUndiciSocketAssertion(error) {
  const stack = String(error?.stack ?? "");
  return (
    error instanceof Error &&
    error.code === "ERR_ASSERTION" &&
    stack.includes("assert(!this.paused)") &&
    stack.includes("at Parser.finish (node:internal/deps/undici/") &&
    stack.includes("at TLSSocket.")
  );
}

export function handleUncaught(error, origin, { log = console.error, exit = (code) => process.exit(code) } = {}) {
  if (isUndiciSocketAssertion(error)) {
    log("Ignored an internal fetch socket assertion; the request it belonged to may fail", error);
    return;
  }
  log(origin === "unhandledRejection" ? "Unhandled promise rejection" : "Uncaught exception", error);
  exit(1);
}

export function installCrashGuard() {
  process.on("uncaughtException", (error, origin) => handleUncaught(error, origin));
}
