import { ConsoleLogger, ProgramLogger, initLogger, BatchLogContent } from "@eyeseetea/d2-logger";
import { Instance } from "../data/entities/Instance";
import { Id } from "../domain/entities/Base";

export const GLOBAL_ORG_UNIT = "H8RixfF8ugH";
const LOGS_PROGRAM = "zARxYmOD18Z";
const MESSAGE_DATA_ELEMENT = "BjUzF5E4eR8";
const MESSAGE_TYPE_DATA_ELEMENT = "NpS5LoLuhgS";

export let logger: ProgramLogger | ConsoleLogger;
export type { BatchLogContent };

export async function setupLogger(instance: Instance, options?: { isDebug?: boolean; orgUnitId?: Id }): Promise<void> {
    const { isDebug = false, orgUnitId } = options ?? {};

    logger = await initLogger({
        type: "program",
        debug: isDebug,
        baseUrl: instance.url,
        auth: instance.auth,
        programId: LOGS_PROGRAM,
        organisationUnitId: orgUnitId || GLOBAL_ORG_UNIT,
        dataElements: {
            messageId: MESSAGE_DATA_ELEMENT,
            messageTypeId: MESSAGE_TYPE_DATA_ELEMENT,
        },
    });
}

export async function setupLoggerForTesting(): Promise<void> {
    logger = await initLogger({
        type: "console",
    });
}
