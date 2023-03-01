export interface DataSet {
    id: string;
    name: string;
    dataElements: {
        id: string;
        name: string;
        code: string;
        categoryCombo: string;
    }[];
    categoryCombo: string;
}
