import { command, subcommands } from "cmd-ts";
import { getApiUrlOptions, getD2ApiFromArgs } from "../common";

export function getCommand() {
    const getExample = command({
        name: "example",
        description: "Show DHIS2 instance info",
        args: {
            ...getApiUrlOptions(),
        },
        handler: async args => {
            const api = getD2ApiFromArgs(args);
            const info = await api.system.info.getData();
            console.debug(info);
        },
    });

    return subcommands({
        name: "example",
        cmds: { getExample },
    });
}
