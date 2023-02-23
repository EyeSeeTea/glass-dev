import { Id, Ref } from "./Base";
import { DataElement } from "./DataElement";

export interface DataForm {
    id: Id;
    dataElements: DataElement[];
    sections: Section[];
}

export interface Section extends Ref {
    name: string;
    dataElements: DataElement[];
}

