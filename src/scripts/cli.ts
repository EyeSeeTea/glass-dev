import path from "path";
import { run, subcommands } from "cmd-ts";

import * as example from "./commands/example";

export function runCli() {
    const cliSubcommands = subcommands({
        name: path.basename(__filename),
        cmds: {
            example: example.getCommand(),
        },
    });

    const args = process.argv.slice(2);
    run(cliSubcommands, args);
}
