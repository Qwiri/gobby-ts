import { Gobby, Message, ö } from "../src";

(async () => {
    const gobby = new Gobby("ws://localhost:8080");

    try {
        await gobby.connect();
    } catch (e) {
        console.error(e);
        return;
    }

    // debug print received messages
    gobby.on("receive", (msg: Message) => {
        console.debug("[Gobby] got message:", msg);
    });

    gobby.on("send", (msg: Message) => {
        console.debug("[Gobby] send message:", msg);
    });

    gobby.handle("VERSION", (msg: Message) => {
        console.log("[Gobby] received backend version:", msg.args);

        // respond with client version
        if (msg.reply) {
            gobby.send(ö("VERSION", "1.0.0"), msg);
        }
    });

})();