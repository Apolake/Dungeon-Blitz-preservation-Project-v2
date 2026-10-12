import * as net from 'net';
import { Client } from './Client';
import { PacketRouter } from '../network/packetRouter';
import { Config } from './config';

export class GameServer {
    private server: net.Server;
    private port: number;
    private host: string;
    private router: PacketRouter;

    constructor(port: number = 8092, router: PacketRouter, host: string = Config.BIND_HOST) {
        this.port = port;
        this.router = router;
        this.host = host;
        this.server = net.createServer((socket) => this.handleConnection(socket));
        this.server.on('error', (error) => {
            const socketError = error as NodeJS.ErrnoException;
            if (socketError.code === 'EADDRINUSE' || socketError.code === 'EACCES') {
                console.warn(
                    `[GameServer] Cannot listen on ${this.host}:${this.port} (${socketError.code}). Other ports may still be active.`
                );
                return;
            }

            console.error('[GameServer] Server error:', error);
        });
    }

    public start(): void {
        this.server.listen(this.port, this.host, () => {
            console.log(`[GameServer] Listening on ${this.host}:${this.port}`);
        });
    }

    public stop(): Promise<void> {
        if (!this.server.listening) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    private handleConnection(socket: net.Socket): void {
        // Create Client wrapper
        socket.setNoDelay(true);
        socket.setKeepAlive(true);
        const client = new Client(socket, this.router);
        const addr = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[GameServer] Client connected: ${addr} (port ${this.port})`);
    }
}
