import { Id, Ref } from "../../domain/entities/Base";
import { DataElement } from "./DataElement";

export interface DataForm {
    id: Id;
    name: string;
    description: string;
    dataElements: DataElement[];
    sections: Section[];
}

export interface Section extends Ref {
    name: string;
    dataElements: DataElement[];
}
