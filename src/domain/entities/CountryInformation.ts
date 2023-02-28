export interface CountryInformation {
    id: string;
    WHORegion: string;
    country: string;
    year: number;
    enrolmentStatus: string;
    enrolmentDate: string;
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
