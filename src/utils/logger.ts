import { Logger } from "@eyeseetea/d2-logger";
import { Instance } from "../data/entities/Instance";
import { Id } from "../domain/entities/Base";

// TODO: add here program and data elements
// const LOGS_PROGRAM = "zARxYmOD18Z";
// const MESSAGE_DATA_ELEMENT = "BjUzF5E4eR8";
// const MESSAGE_TYPE_DATA_ELEMENT = "NpS5LoLuhgS";

export let logger: Logger;

export async function setupLogger(instance: Instance, orgUnitId?: Id): Promise<void> {
    const loggerInstance = new Logger();
    // await loggerInstance.init({
    //     type: "program",
    //     baseUrl: instance.url,
    //     auth: instance.auth,
    //     programId: LOGS_PROGRAM,
    //     organisationUnitId: orgUnitId,
    //     loggerDataElements: {
    //         messageId: MESSAGE_DATA_ELEMENT,
    //         messageTypeId: MESSAGE_TYPE_DATA_ELEMENT,
    //     },
    // });
    logger = loggerInstance;
}

export function setupLoggerForTesting(): void {
    const loggerInstance = new Logger();
    loggerInstance.init({
        type: "console",
    });
    logger = loggerInstance;
}
