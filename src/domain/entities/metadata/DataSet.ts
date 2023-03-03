export interface DataSet {
    id: string;
    name: string;
    dataElements: DataElement[];
    categoryCombo: string;
}

export interface DataElement {
    id: string;
    name: string;
    code: string;
    categoryCombo: { id: string };
}
