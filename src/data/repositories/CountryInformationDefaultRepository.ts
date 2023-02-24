import { D2Api } from "@eyeseetea/d2-api/2.34";
import { Event as ProgramEvent } from "@eyeseetea/d2-api/api/events";
import { CountryInformation } from "../../domain/entities/CountryInformation";
import { Future, FutureData } from "../../domain/entities/Future";
import { CountryInformationRepository } from "../../domain/repositories/CountryInformationRepository";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

const ARMFocalPointProgram = "oo0bqS0AqMI";
const moduleAttribute = "Fh6atHPjdxC";

const familyNameDE = "GXDSEwgeGwK";
const firstNameDE = "Z9fUYlB1HmQ";
const functionNameDE = "EVKMO195LMe";
const emailAddressDE = "CgCPexj0q43";
const preferredLanguageDE = "h6okeC9Fh0r";
const telephoneDE = "I2UOcdFIvUq";
const institutionDE = "RM1V3aPr5Lc";
const institutionAddressDE = "YJEnWwlhx78";
const cityDE = "Fc2Zy5r7Hz4";
const zipCodeDE = "Kx1ErRIlfYi";

export class CountryInformationDefaultRepository implements CountryInformationRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    get(countryId: string, module: string): FutureData<CountryInformation> {
        return Future.joinObj({
            tei: apiToFuture(
                this.api.get<D2TEIsResponse>("/trackedEntityInstances", {
                    program: ARMFocalPointProgram,
                    ou: [countryId],
                    fields: "*",
                    totalPages: true,
                    page: 1,
                    pageSize: 1,
                    filter: `${moduleAttribute}:eq:${module}`,
                })
            ),
            orgUnits: apiToFuture(
                this.api.models.organisationUnits.get({
                    id: countryId,
                    fields: {
                        id: true,
                        shortName: true,
                        level: true,
                    },
                    includeAncestors: true,
                })
            ),
        }).map(({ tei, orgUnits }) => {
            const TEI = tei.trackedEntityInstances[0];
            const enrollment = TEI?.enrollments[0];
            const events = TEI?.enrollments[0]?.events;

            const region = orgUnits.objects.find(ou => ou.id !== countryId)?.shortName || "";
            const country = orgUnits.objects.find(ou => ou.id === countryId)?.shortName || "";

            return {
                WHORegion: region,
                country: country,
                year: new Date().getFullYear(),
                enrolmentStatus: enrollment?.status || "",
                enrolmentDate: enrollment?.enrollmentDate || "",
                nationalFocalPoints:
                    events?.map(event => {
                        return {
                            id: event.event,
                            familyName: event.dataValues.find(dv => dv.dataElement === familyNameDE)?.value || "",
                            firstName: event.dataValues.find(dv => dv.dataElement === firstNameDE)?.value || "",
                            function: event.dataValues.find(dv => dv.dataElement === functionNameDE)?.value || "",
                            emailAddress: event.dataValues.find(dv => dv.dataElement === emailAddressDE)?.value || "",
                            preferredLanguage:
                                event.dataValues.find(dv => dv.dataElement === preferredLanguageDE)?.value || "",
                            telephone: event.dataValues.find(dv => dv.dataElement === telephoneDE)?.value || "",
                            institution: event.dataValues.find(dv => dv.dataElement === institutionDE)?.value || "",
                            institutionAddress:
                                event.dataValues.find(dv => dv.dataElement === institutionAddressDE)?.value || "",
                            city: event.dataValues.find(dv => dv.dataElement === cityDE)?.value || "",
                            zipCode: event.dataValues.find(dv => dv.dataElement === zipCodeDE)?.value || "",
                        };
                    }) || [],
            };
        });
    }
}

export interface D2TEIsResponse {
    trackedEntityInstances: D2TEI[];
    pager: {
        pageSize: number;
        total: number;
        page: number;
    };
}

export interface D2TEI {
    trackedEntityInstance: string;
    enrollments: Enrollment[];
}

export interface Enrollment {
    enrollment: string;
    program: string;
    orgUnit: string;
    trackedEntityInstance: string;
    enrollmentDate: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELED";
    events: ProgramEvent[];
}
