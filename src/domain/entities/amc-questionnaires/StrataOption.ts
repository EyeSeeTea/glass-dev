import { HealthLevelValue, HealthLevelValues } from "./HealthLevelOption";
import { HealthSectorValue, HealthSectorValues } from "./HealthSectorOption";
import { Option, OptionType, OptionValue } from "./Option";

export const StrataValues = {
    publicHospital: "PUB-H",
    publicCommunity: "PUB-C",
    publicTotal: "PUB-T",
    privateHospital: "PRI-H",
    privateCommunity: "PRI-C",
    privateTotal: "PRI-T",
    globalHospital: "GLO-H",
    globalCommunity: "GLO-C",
    globalTotal: "GLO-T",
} as const;

export type StrataValue = OptionValue<typeof StrataValues>;

export type StrataOption = OptionType<StrataValue>;

export const strataOption = new Option(StrataValues);

export function getStrataValuesFromHealthSectorAndLevel(
    healthSector: HealthSectorValue,
    healthLevel: HealthLevelValue
): StrataValue[] {
    const permutations: Record<HealthSectorValue, Record<HealthLevelValue, StrataValue[]>> = {
        [HealthSectorValues.Public]: {
            [HealthLevelValues.Hospital]: [StrataValues.publicHospital],
            [HealthLevelValues.Community]: [StrataValues.publicCommunity],
            [HealthLevelValues.HospitalAndCommunity]: [StrataValues.publicHospital, StrataValues.publicCommunity],
            [HealthLevelValues.Total]: [StrataValues.publicTotal],
        },
        [HealthSectorValues.Private]: {
            [HealthLevelValues.Hospital]: [StrataValues.privateHospital],
            [HealthLevelValues.Community]: [StrataValues.privateCommunity],
            [HealthLevelValues.HospitalAndCommunity]: [StrataValues.privateHospital, StrataValues.privateCommunity],
            [HealthLevelValues.Total]: [StrataValues.privateTotal],
        },
        [HealthSectorValues.PublicAndPrivate]: {
            [HealthLevelValues.Hospital]: [StrataValues.publicHospital, StrataValues.privateHospital],
            [HealthLevelValues.Community]: [StrataValues.publicCommunity, StrataValues.privateCommunity],
            [HealthLevelValues.HospitalAndCommunity]: [
                StrataValues.publicHospital,
                StrataValues.privateHospital,
                StrataValues.publicCommunity,
                StrataValues.privateCommunity,
            ],
            [HealthLevelValues.Total]: [StrataValues.publicTotal, StrataValues.privateTotal],
        },
        [HealthLevelValues.Total]: {
            [HealthLevelValues.Hospital]: [StrataValues.globalHospital],
            [HealthLevelValues.Community]: [StrataValues.globalCommunity],
            [HealthLevelValues.HospitalAndCommunity]: [StrataValues.globalHospital, StrataValues.globalCommunity],
            [HealthLevelValues.Total]: [StrataValues.globalTotal],
        },
    };
    return permutations[healthSector][healthLevel];
}
