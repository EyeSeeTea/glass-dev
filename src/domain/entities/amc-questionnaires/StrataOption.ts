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
