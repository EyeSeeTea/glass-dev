export interface GlassSubmissions {
    id: string;
    batchId: string;
    countryCode: string;
    fileType: string;
    downloadUrl: string;
    startDate: Date;
    endDate: Date;
    fileName: string;
    inputLineNb: number;
    outputLineNb: number;
    period: number;
    specimens: string[];
    status: string;
    submissionDate: Date;
}
