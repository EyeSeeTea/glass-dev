import { Id } from "./Ref";

export interface Relationship {
    id?: Id;
    typeId: Id;
    typeName: string;
    fromId: Id;
    toId: Id;
}
