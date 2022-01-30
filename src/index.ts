import { v4 } from "uuid";
import { EventEmitter, Listener } from "events";

interface Response {
    time: number;
    r: (msg: Message | PromiseLike<Message>) => void;
}

export class Gobby extends EventEmitter {

    private ws?: WebSocket;
    private responses: { [id: string]: Response } = {};
    private janitor: number;

    private joinResolver: (value: string | PromiseLike<string>) => void = () => {};

    constructor(
        private addr: string
    ) {
        super();

        // clear old replies every 10 seconds
        this.janitor = setInterval(this.runJanitor, 10000);
    }

    public connect() {
        const g = this;
        return new Promise((resolve, reject) => {
            // create websocket connection and await connection
            g.ws = new WebSocket(g.addr);
            g.ws.onopen = () => {
                if (g.ws) {
                    g.ws.onmessage = g.onMessage;
                    g.ws.onerror = g.onError;
                }
                resolve(g.ws);
            };
            // reject promise on error
            g.ws.onerror = (err) => {
                reject(err);
            };
        });
    }

    private onError(ev: Event) {
        console.error("[Gobby] socket error:", ev);
    }

    private onMessage(ev: MessageEvent) {
        // try to parse message
        const msg: Message = JSON.parse(ev.data);
        if (!msg.id) {
            console.error("[Gobby] got invalid message from backend:", msg);
            return;
        }

        // check if JOINED
        if (msg.cmd === "JOINED") {
            this.joinResolver((msg.args || [""])[0] as string);
            this.joinResolver = () => {};
            return;
        }

        // check if the message was a reply
        if (msg.id in this.responses) {
            this.responses[msg.id].r(msg);
            delete this.responses[msg.id];
            return;
        }

        this.emit("message", msg);
        this.emit("handler:" + msg.cmd, msg);
    }

    public handle(cmd: string, listener: Listener) {
        this.on("handler:" + cmd, listener);
    }

    public send(msg: Message, to?: Message): Promise<Message> | void {
        const g = this;

        // check if socket is open and if we can send messages
        if (g.ws && g.ws.readyState != WebSocket.OPEN) {
            console.error("[Gobby] tried to send message but socket is not open:", msg);
            return;
        }

        return new Promise((resolve) => {
            // generate new ID
            if (!msg.id) {
                msg.id = v4();
            }
            // mark message as reply
            if (to) {
                msg.to = to.id;
            }

            if (g.ws && g.ws.readyState == WebSocket.OPEN) {
                // save message for replies
                g.responses[msg.id] = {
                    time: Date.now(),
                    r: resolve
                };
                g.ws.send(JSON.stringify(msg));
                g.emit("send", msg);
            } else {
                console.error("[Gobby] tried to send message but socket is not open:", msg);
            }
        });
    }

    public join(name: string, password?: string): Promise<string> {
        const g = this;
        return new Promise((resolve) => {
            if (g.ws && g.ws.readyState == WebSocket.OPEN) {
                this.ws?.send(`JOIN name:${name} password:${password || ""}`);
                this.joinResolver = resolve;
            }
        });
    }

    public runJanitor() {
        console.log("[Gobby] Running Janitor ...");
        const now = Date.now();
        for (const id in this.responses) {
            if (now - this.responses[id].time > 10000) { // clear (possible) replies older than 10 seconds
                console.log("[Gobby] clearing old reply:", this.responses[id]);
                delete this.responses[id];
            }
        }
    }

    public stopJanitor() {
        clearInterval(this.janitor);
    }
}

export interface Message {
    id?: string;
    to?: string;
    cmd: string;
    args?: unknown[];
    // mark message to be replied
    reply?: boolean;
}

// shortcut to create a basic message
export function ö(cmd: string, ...args: any): Message {
    return { cmd: cmd, args: [...args] };
}