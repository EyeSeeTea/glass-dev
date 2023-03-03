export interface CategoryCombo {
    id: string;
    name: string;
    categories: {
        id: string;
        name: string;
        code: string;
        categoryOptions: {
            id: string;
            code: string;
            name: string;
            categoryOptionCombos: string[];
        }[];
    }[];
}
