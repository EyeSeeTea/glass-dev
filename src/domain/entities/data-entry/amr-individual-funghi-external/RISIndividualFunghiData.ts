export interface CustomDataElementString {
    key: string;
    type: "string";
    value?: string;
}
export interface CustomDataElementNumber {
    key: string;
    type: "number";
    value?: number;
}

export type CustomDataColumns = (CustomDataElementString | CustomDataElementNumber)[];
