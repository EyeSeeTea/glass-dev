export interface GlassUploads {
    id: string;
    batchId: string;
    countryCode: string;
    fileType: string;
    fileId: string;
    fileName: string;
    inputLineNb: number;
    outputLineNb: number;
    period: string;
    specimens: string[];
    status: string;
    uploadDate: string;
    dataSubmission: string;
    module: string;
    orgUnit: string;
    records: number;
    correspondingRisUploadId: string;
    eventListFileId?: string;
}
