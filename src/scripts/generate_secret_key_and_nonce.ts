import { command, run } from "cmd-ts";
import path from "path";
import sodium from "libsodium-wrappers";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {},
        handler: async () => {
            await sodium.ready;
            const key = sodium.crypto_secretbox_keygen();
            const base64Key = sodium.to_base64(key);

            console.debug(`Random Secret key: ${base64Key}`);

            const randomNumber = Array.from({ length: 24 }, () => Math.floor(Math.random() * 10)).join("");
            console.debug(`Random 24 digit number: ${randomNumber}`);
            return;
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
