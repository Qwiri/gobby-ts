# Gobby-TS

[Gobby](https://github.com/Qwiri/gobby) wrapper for TypeScript.

## Example

```typescript
import { Gobby, Message, ö } from "../src";

(async () => {
    const gobby = new Gobby("ws://localhost:8080");

    try {
        await gobby.connect();
    } catch (e) {
        console.error(e);
        return;
    }

    // join lobby
    const user = await gobby.join("foo");
    if (!user) {
        console.error("[Gobby] failed to join lobby");
        return;
    }
    console.log("[Gobby] joined lobby as:", user);

    gobby.handle("VERSION", (msg: Message) => {
        console.log("[Gobby] received backend version:", msg.args);

        // respond with client version
        if (msg.reply) {
            gobby.send(ö("VERSION", "1.0.0"), msg);
        }
    });
})();
```