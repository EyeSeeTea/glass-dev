export interface DataSet {
    id: string;
    name: string;
    dataElements: {
        id: string;
        name: string;
        code: string;
        categoryCombo: { id: string };
    }[];
    categoryCombo: string;
}
