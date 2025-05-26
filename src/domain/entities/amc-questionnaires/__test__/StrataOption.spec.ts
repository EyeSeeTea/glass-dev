import { getDisabledStratas, StrataValues } from "../StrataOption";

describe("getDisabledStratas", () => {
    it("should disable individuals when total is selected (public)", () => {
        const selected = [StrataValues.publicTotal];
        const result = getDisabledStratas(selected);
        expect(result).toEqual(expect.arrayContaining([StrataValues.publicHospital, StrataValues.publicCommunity]));
        expect(result).not.toContain(StrataValues.publicTotal);
    });

    it("should disable individuals when total is selected (private)", () => {
        const selected = [StrataValues.privateTotal];
        const result = getDisabledStratas(selected);
        expect(result).toEqual(expect.arrayContaining([StrataValues.privateHospital, StrataValues.privateCommunity]));
        expect(result).not.toContain(StrataValues.privateTotal);
    });

    it("should disable individuals when total is selected (global)", () => {
        const selected = [StrataValues.globalTotal];
        const result = getDisabledStratas(selected);
        expect(result).toEqual(expect.arrayContaining([StrataValues.globalHospital, StrataValues.globalCommunity]));
        expect(result).not.toContain(StrataValues.globalTotal);
    });

    it("should disable total when any individual is selected (public)", () => {
        const selected = [StrataValues.publicHospital];
        const result = getDisabledStratas(selected);
        expect(result).toContain(StrataValues.publicTotal);
        expect(result).not.toContain(StrataValues.publicHospital);
    });

    it("should disable total when any individual is selected (private)", () => {
        const selected = [StrataValues.privateCommunity];
        const result = getDisabledStratas(selected);
        expect(result).toContain(StrataValues.privateTotal);
        expect(result).not.toContain(StrataValues.privateCommunity);
    });

    it("should disable total when any individual is selected (global)", () => {
        const selected = [StrataValues.globalHospital];
        const result = getDisabledStratas(selected);
        expect(result).toContain(StrataValues.globalTotal);
        expect(result).not.toContain(StrataValues.globalHospital);
    });

    it("should disable both individuals and total when both are selected", () => {
        const selected = [StrataValues.publicTotal, StrataValues.publicHospital];
        const result = getDisabledStratas(selected);
        expect(result).toEqual(
            expect.arrayContaining([
                StrataValues.publicHospital,
                StrataValues.publicCommunity,
                StrataValues.publicTotal,
            ])
        );
    });

    it("should return empty array if nothing is selected", () => {
        const selected: string[] = [];
        const result = getDisabledStratas(selected as any);
        expect(result).toEqual([]);
    });

    it("should not disable unrelated stratas", () => {
        const selected = [StrataValues.publicTotal];
        const result = getDisabledStratas(selected);
        expect(result).not.toContain(StrataValues.privateHospital);
        expect(result).not.toContain(StrataValues.globalCommunity);
    });
});
