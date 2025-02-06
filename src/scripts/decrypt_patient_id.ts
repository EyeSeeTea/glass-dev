import { command, run, string, option } from "cmd-ts";
import path from "path";
import { getD2ApiFromArgs } from "./common";
import sodium from "libsodium-wrappers";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            patientId: option({
                type: string,
                long: "patientId",
                description: "Patient Id to be encrypted/decrypted",
            }),
        },
        handler: async args => {
            if (!process.env.REACT_APP_DHIS2_BASE_URL)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            if (!process.env.REACT_APP_DHIS2_AUTH)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            const username = process.env.REACT_APP_DHIS2_AUTH.split(":")[0] ?? "";
            const password = process.env.REACT_APP_DHIS2_AUTH.split(":")[1] ?? "";

            if (username === "" || password === "") {
                throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
            }
            const envVars = {
                url: process.env.REACT_APP_DHIS2_BASE_URL,
                auth: {
                    username: username,
                    password: password,
                },
            };
            // const api = getD2ApiFromArgs(envVars);

            //1. Get Patient Id.
            if (!args.patientId) throw new Error("Patient Id is required");
            const patientId = args.patientId;

            await sodium.ready;

            const [nonceBase64, encryptedBase64] = patientId.split(":");
            if (!nonceBase64 || !encryptedBase64) throw new Error("Invalid encrypted data");
            const nonce = sodium.from_base64(nonceBase64);
            const encrypted = sodium.from_base64(encryptedBase64);
            const key = sodium.from_base64("9Oj-HpXEH-NTvAfE-dG1P2DgeNoqw8ZUAgnyqzpc6L8");
            const decrypted = sodium.crypto_secretbox_open_easy(encrypted, nonce, key);
            console.log(sodium.to_string(decrypted));
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
