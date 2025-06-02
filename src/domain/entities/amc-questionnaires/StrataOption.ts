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

/**
 * Based on the selected stratas, returns an array of stratas that shouldn't be elegible simultaneously.
 */
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
            individuals: [
                StrataValues.globalHospital,
                StrataValues.globalCommunity,
                StrataValues.publicTotal,
                StrataValues.privateTotal,
                StrataValues.publicHospital,
                StrataValues.privateHospital,
                StrataValues.publicCommunity,
                StrataValues.privateCommunity,
            ],
        },
        {
            total: StrataValues.globalHospital,
            individuals: [StrataValues.publicHospital, StrataValues.privateHospital],
        },
        {
            total: StrataValues.globalCommunity,
            individuals: [StrataValues.publicCommunity, StrataValues.privateCommunity],
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
