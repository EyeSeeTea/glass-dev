import _ from "lodash";

export type Id = string;

export interface Ref {
    id: Id;
}

export interface Named {
    name: string;
}

export interface NamedRef extends Ref {
    name: string;
}

export function getId<T extends Ref>(obj: T): Id {
    return obj.id;
}

export function getIds<T extends Ref>(objs: T[]): Id[] {
    return objs.map(obj => obj.id);
}

export function keyById<T extends Ref>(objs: T[]): Record<Id, T> {
    return _.keyBy(objs, getId);
}

export function sortByName<T extends Named>(strings: T[]): T[] {
    const strings2 = Array.from(strings);
    strings2.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, ignorePunctuation: true }));
    return strings2;
}
