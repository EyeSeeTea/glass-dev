export interface GlassSubmissions {
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
    submissionDate: Date;
    call: string;
    module: string;
}
