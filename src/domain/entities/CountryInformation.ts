export interface CountryInformation {
    WHORegion: string;
    country: string;
    year: number;
    enrolmentStatus: string;
    enrolmentDate: string;
    nationalFocalPoints: NationalFocalPoint[];
}

export interface NationalFocalPoint {
    id: string;
    familyName: string;
    firstName: string;
    function: string;
    emailAddress: string;
    preferredLanguage: string;
    telephone: string;
    institution: string;
    institutionAddress: string;
    city: string;
    zipCode: string;
}
