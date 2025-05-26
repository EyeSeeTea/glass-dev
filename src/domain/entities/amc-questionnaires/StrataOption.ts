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

const publicOrPrivateStratas: StrataValue[] = [
    StrataValues.publicCommunity,
    StrataValues.publicHospital,
    StrataValues.privateCommunity,
    StrataValues.privateHospital,
    StrataValues.publicTotal,
    StrataValues.privateTotal,
];
const totalHealthLevelStratas: StrataValue[] = [
    StrataValues.publicTotal,
    StrataValues.privateTotal,
    StrataValues.globalTotal,
];
const hospitalHealthLevelStratas: StrataValue[] = [
    StrataValues.publicHospital,
    StrataValues.privateHospital,
    StrataValues.globalHospital,
];
const communityHealthLevelStratas: StrataValue[] = [
    StrataValues.publicCommunity,
    StrataValues.privateCommunity,
    StrataValues.globalCommunity,
];

export class StrataOptionHelper {
    static isPublicOrPrivateStrata(strata: StrataValue): boolean {
        return publicOrPrivateStratas.includes(strata);
    }

    static isTotalHealthLevelStrata(strata: StrataValue): boolean {
        return totalHealthLevelStratas.includes(strata);
    }

    static isHospitalHealthLevelStrata(strata: StrataValue): boolean {
        return hospitalHealthLevelStratas.includes(strata);
    }

    static isCommunityHealthLevelStrata(strata: StrataValue): boolean {
        return communityHealthLevelStratas.includes(strata);
    }
}

export function getDisabledStratas(selected: StrataValue[]): StrataValue[] {
    const strataGroups = [
        {
            total: StrataValues.publicTotal,
            individuals: [StrataValues.publicHospital, StrataValues.publicCommunity],
        },
        {
            total: StrataValues.privateTotal,
            individuals: [StrataValues.privateHospital, StrataValues.privateCommunity],
        },
        {
            total: StrataValues.globalTotal,
            individuals: [StrataValues.globalHospital, StrataValues.globalCommunity],
        },
    ];

    const disabled = new Set<StrataValue>();

    for (const group of strataGroups) {
        const totalSelected = selected.includes(group.total);
        const individualSelected = group.individuals.some(val => selected.includes(val));

        if (totalSelected) {
            for (const ind of group.individuals) {
                disabled.add(ind);
            }
        }

        if (individualSelected) {
            disabled.add(group.total);
        }
    }

    return Array.from(disabled);
}
