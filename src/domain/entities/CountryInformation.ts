export interface CountryInformation {
    module: string;
    WHORegion: string;
    country: string;
    year: number;
    enrolmentStatus: string;
    enrolmentDate: string;
    nationalFocalPointId?: string;
    nationalFocalPoints: NationalFocalPoint[];
}

export interface NationalFocalPoint {
    id: string;
    values: NationalFocalPointValue[];
}

export interface NationalFocalPointValue {
    id: string;
    name: string;
    value: string;
}
