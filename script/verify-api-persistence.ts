import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express, { type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";

interface TestAuthenticatedRequest extends Request {
  user?: { claims: { sub: string } };
  isAuthenticated?: () => boolean;
}

interface RunningApiProcess {
  process: ChildProcess;
  baseUrl: string;
}

async function runTestServer(): Promise<void> {
  const userId = process.env.PLAYOPS_TEST_USER_ID;
  if (!userId) throw new Error("PLAYOPS_TEST_USER_ID is required for the test server.");

  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Test-only identity injection. Production authentication is not bypassed.
    const authenticatedRequest = req as TestAuthenticatedRequest;
    authenticatedRequest.user = { claims: { sub: userId } };
    authenticatedRequest.isAuthenticated = () => true;
    next();
  });

  const server = createServer(app);
  const { registerRoutes } = await import("../server/routes");
  await registerRoutes(server, app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      console.log(`API_TEST_READY:${address.port}`);
      resolve();
    });
  });
}

function startApiProcess(userId: string): Promise<RunningApiProcess> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), "--server"],
    {
      cwd: process.cwd(),
      env: { ...process.env, PLAYOPS_TEST_USER_ID: userId },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        reject(new Error(`Timed out starting test API process. ${stderr}`));
      }
    }, 15_000);

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Test API process exited before becoming ready (${code}). ${stderr}`));
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      const match = stdout.match(/API_TEST_READY:(\d+)/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ process: child, baseUrl: `http://127.0.0.1:${match[1]}` });
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
  });
}

async function stopApiProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    const forceStop = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }, 3_000);
    child.once("exit", () => clearTimeout(forceStop));
  });
}

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run the API persistence check.");
  }

  const userId = `persistence-test-${randomUUID()}`;
  const otherUserId = `persistence-test-other-${randomUUID()}`;
  const playData = {
    sport: "basketball",
    players: [],
    routes: [],
    freehandDrawings: [],
    textAnnotations: [],
    animationKeyframes: [],
    viewTransform: { x: 0, y: 0, scale: 1 },
  };
  let playId: string | undefined;
  let ownerProcess: RunningApiProcess | undefined;
  let otherProcess: RunningApiProcess | undefined;

  try {
    ownerProcess = await startApiProcess(userId);

    const createResponse = await fetch(`${ownerProcess.baseUrl}/api/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "API Persistence Verification",
        sport: "basketball",
        tags: ["test"],
        data: playData,
      }),
    });
    assert.equal(createResponse.status, 201, "API should create a play for the authenticated user.");
    const createdPlay = await createResponse.json() as { id: string; userId: string };
    playId = createdPlay.id;
    assert.equal(createdPlay.userId, userId);

    // Stop the entire Node process and start a new process against the same database.
    await stopApiProcess(ownerProcess.process);
    ownerProcess = await startApiProcess(userId);

    const persistedResponse = await fetch(`${ownerProcess.baseUrl}/api/plays/${playId}`);
    assert.equal(persistedResponse.status, 200, "Created play should remain available after server restart.");
    const persistedPlay = await persistedResponse.json() as { id: string; name: string };
    assert.equal(persistedPlay.id, playId);
    assert.equal(persistedPlay.name, "API Persistence Verification");

    otherProcess = await startApiProcess(otherUserId);
    const otherUserRead = await fetch(`${otherProcess.baseUrl}/api/plays/${playId}`);
    assert.equal(otherUserRead.status, 404, "Another user must not be able to read the play.");
    const otherUserDelete = await fetch(`${otherProcess.baseUrl}/api/plays/${playId}`, {
      method: "DELETE",
    });
    assert.equal(otherUserDelete.status, 404, "Another user must not be able to delete the play.");

    const cleanupResponse = await fetch(`${ownerProcess.baseUrl}/api/plays/${playId}`, {
      method: "DELETE",
    });
    assert.equal(cleanupResponse.status, 204, "Test play should be removed after verification.");

    console.log("API persistence passed across Node process restart, with cross-user denial and cleanup.");
  } finally {
    if (otherProcess) await stopApiProcess(otherProcess.process);
    if (ownerProcess) {
      if (playId) {
        try {
          await fetch(`${ownerProcess.baseUrl}/api/plays/${playId}`, {
            method: "DELETE",
          });
        } catch {
          // Best-effort cleanup if an earlier assertion failed.
        }
      }
      await stopApiProcess(ownerProcess.process);
    }
  }
}

if (process.argv.includes("--server")) {
  runTestServer().catch((error: unknown) => {
    console.error("Test API server failed:", error);
    process.exitCode = 1;
  });
} else {
  run().catch((error: unknown) => {
    console.error("API persistence verification failed:", error);
    process.exitCode = 1;
  });
}
