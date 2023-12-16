import { Id } from "../entities/Ref";

export interface DownloadEmptyTemplateRepository {
    getEmptyTemplate(
        programId: Id,
        orgUnits: string[],
        settings: Record<string, any>,
        downloadRelationships: boolean,
        useCodesForMetadata: boolean,
        formType: string
    ): Promise<File>;
}
