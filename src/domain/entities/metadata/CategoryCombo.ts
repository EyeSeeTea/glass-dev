export interface CategoryCombo {
    id: string;
    name: string;
    categories: { id: string; code: string }[];
    categoryOptionCombos: {
        id: string;
        name: string;
        categoryOptions: {
            id: string;
            code: string;
        }[];
    }[];
}
