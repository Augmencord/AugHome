/**
 * Backend Process Manager for AugHome IDE.
 *
 * Responsibilities:
 * - Auto-spawning the Python FastAPI backend service
 * - Periodic health monitoring and heartbeat checks
 * - Auto-restart with backoff upon unexpected failure
 * - Graceful shutdown (SIGTERM -> SIGKILL) to eliminate orphan processes
 */

import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

export interface BackendStatus {
  running: boolean;
  healthy: boolean;
  port: number;
  pid: number | null;
  statusText: 'starting' | 'healthy' | 'unhealthy' | 'stopped';
  restartCount: number;
}

export class BackendProcessManager extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private port: number;
  private host: string;
  private isShuttingDown = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = false;
  private restartCount = 0;
  private maxRestarts = 5;

  constructor(port = 8000, host = '127.0.0.1') {
    super();
    this.port = parseInt(process.env.AUGHOME_BACKEND_PORT || String(port), 10);
    this.host = process.env.AUGHOME_BACKEND_HOST || host;
  }

  /**
   * Determine the appropriate Python executable on this operating system.
   */
  private resolvePythonCommand(): string {
    if (process.platform === 'win32') {
      return 'py';
    }
    return 'python3';
  }

  /**
   * Locate the backend server script in the monorepo structure.
   */
  private resolveServerScript(): string {
    const candidates = [
      path.resolve(__dirname, '../../backend/server.py'),
      path.resolve(__dirname, '../../../apps/backend/server.py'),
      path.resolve(process.cwd(), 'apps/backend/server.py'),
      path.resolve(process.cwd(), '../backend/server.py'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
    return candidates[0];
  }

  /**
   * Start the Python backend process and initiate health monitoring.
   */
  public start(): void {
    if (this.childProcess && !this.childProcess.killed) {
      console.log('[BackendManager] Backend process is already running.');
      return;
    }

    this.isShuttingDown = false;
    const pythonCmd = this.resolvePythonCommand();
    const serverScript = this.resolveServerScript();

    console.log(`[BackendManager] Starting backend: ${pythonCmd} "${serverScript}" on port ${this.port}`);

    try {
      this.childProcess = spawn(pythonCmd, [serverScript], {
        cwd: path.dirname(serverScript),
        env: {
          ...process.env,
          AUGHOME_PORT: String(this.port),
          AUGHOME_HOST: this.host,
          PYTHONUNBUFFERED: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.emitStatus();

      this.childProcess.stdout?.on('data', (data) => {
        const text = data.toString().trim();
        console.log(`[AugHome Backend]: ${text}`);
      });

      this.childProcess.stderr?.on('data', (data) => {
        const text = data.toString().trim();
        console.error(`[AugHome Backend]: ${text}`);
      });

      this.childProcess.on('error', (err) => {
        console.error('[BackendManager] Failed to spawn backend process:', err);
        this.isHealthy = false;
        this.emitStatus();
      });

      this.childProcess.on('close', (code, signal) => {
        console.log(`[BackendManager] Process closed with code: ${code}, signal: ${signal}`);
        this.childProcess = null;
        this.isHealthy = false;
        this.emitStatus();

        if (!this.isShuttingDown && this.restartCount < this.maxRestarts) {
          this.restartCount += 1;
          const delay = Math.min(1000 * Math.pow(2, this.restartCount - 1), 10000);
          console.log(`[BackendManager] Re-spawning in ${delay}ms (attempt ${this.restartCount}/${this.maxRestarts})...`);
          setTimeout(() => this.start(), delay);
        }
      });

      this.startHealthMonitoring();
    } catch (err) {
      console.error('[BackendManager] Error starting backend service:', err);
      this.isHealthy = false;
      this.emitStatus();
    }
  }

  /**
   * Periodically check /health endpoint.
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const check = () => {
      if (this.isShuttingDown || !this.childProcess) {
        return;
      }

      const req = http.get(
        {
          host: this.host,
          port: this.port,
          path: '/health',
          timeout: 2000,
        },
        (res) => {
          const healthy = res.statusCode === 200;
          if (this.isHealthy !== healthy) {
            this.isHealthy = healthy;
            if (healthy) {
              this.restartCount = 0; // Reset restart counter on successful connection
              console.log(`[BackendManager] Backend service is healthy at http://${this.host}:${this.port}`);
            }
            this.emitStatus();
          }
        }
      );

      req.on('error', () => {
        if (this.isHealthy) {
          this.isHealthy = false;
          this.emitStatus();
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (this.isHealthy) {
          this.isHealthy = false;
          this.emitStatus();
        }
      });
    };

    // Immediate initial check and interval polling
    setTimeout(check, 1000);
    this.healthCheckInterval = setInterval(check, 3000);
  }

  /**
   * Gracefully terminate the child backend process.
   */
  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (!this.childProcess || this.childProcess.killed) {
      this.childProcess = null;
      this.isHealthy = false;
      this.emitStatus();
      return;
    }

    console.log('[BackendManager] Stopping backend process gracefully...');
    const proc = this.childProcess;

    return new Promise((resolve) => {
      let resolved = false;

      const finish = () => {
        if (!resolved) {
          resolved = true;
          this.childProcess = null;
          this.isHealthy = false;
          this.emitStatus();
          resolve();
        }
      };

      proc.once('close', finish);

      // Attempt graceful SIGTERM
      try {
        proc.kill('SIGTERM');
      } catch (e) {
        // Fallback
      }

      // Hard kill fallback after 3 seconds if not terminated
      setTimeout(() => {
        if (!proc.killed) {
          try {
            console.log('[BackendManager] Escalating to SIGKILL...');
            proc.kill('SIGKILL');
          } catch (e) {
            // Ignored
          }
        }
        finish();
      }, 3000);
    });
  }

  /**
   * Get the current snapshot of backend status.
   */
  public getStatus(): BackendStatus {
    const isRunning = this.childProcess !== null && !this.childProcess.killed;
    let statusText: BackendStatus['statusText'] = 'stopped';
    if (isRunning) {
      statusText = this.isHealthy ? 'healthy' : 'starting';
    }

    return {
      running: isRunning,
      healthy: this.isHealthy,
      port: this.port,
      pid: this.childProcess?.pid || null,
      statusText,
      restartCount: this.restartCount,
    };
  }

  private emitStatus(): void {
    this.emit('status', this.getStatus());
  }
}
