// Runs the API and the Vite dev server side by side, with prefixed output.
// Stopping one (or pressing Ctrl+C) stops both.
import { spawn, spawnSync } from "node:child_process";

const procs = [
  { name: "api", color: 33, script: "dev:api" },
  { name: "web", color: 36, script: "dev:web" },
].map(({ name, color, script }) => {
  const child = spawn(`npm run --silent ${script}`, { shell: true, stdio: ["inherit", "pipe", "pipe"] });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) out.write(prefix + line + "\n");
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    console.log(`${prefix}exited (${code ?? "signal"})`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of procs) if (child.exitCode === null) killTree(child);
  setTimeout(() => process.exit(code), 300);
}

// On Windows, child.kill() only stops the npm shell and leaves the node
// process under it running (and holding its port). taskkill /T takes the
// whole tree.
function killTree(child) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill();
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
