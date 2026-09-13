import { Response } from 'express';

class SSEManager {
  private clients: Map<string, Response[]> = new Map();

  addClient(sessionId: string, res: Response): void {
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, []);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    this.clients.get(sessionId)?.push(res);
  }

  removeClient(sessionId: string, res: Response): void {
    const sessionClients = this.clients.get(sessionId);
    if (sessionClients) {
      this.clients.set(sessionId, sessionClients.filter((client) => client !== res));
      if (this.clients.get(sessionId)?.length === 0) {
        this.clients.delete(sessionId);
      }
    }
  }

  sendEvent(sessionId: string, type: string, data: unknown): void {
    const sessionClients = this.clients.get(sessionId);
    if (sessionClients && sessionClients.length > 0) {
      const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
      sessionClients.forEach((res) => {
        try {
          res.write(payload);
        } catch {
          // client disconnected
        }
      });
    }
  }

  sendHeartbeat(sessionId: string): void {
    const sessionClients = this.clients.get(sessionId);
    if (sessionClients) {
      sessionClients.forEach((res) => {
        try {
          res.write(': heartbeat\n\n');
        } catch {
          // client disconnected
        }
      });
    }
  }

  getClientCount(sessionId: string): number {
    return this.clients.get(sessionId)?.length ?? 0;
  }
}

export const sseManager = new SSEManager();
