export interface DownloadEmptyTemplateRepository {
    getEmptyTemplate(orgUnits: string[], settings: Record<string, any>): Promise<File>;
}
