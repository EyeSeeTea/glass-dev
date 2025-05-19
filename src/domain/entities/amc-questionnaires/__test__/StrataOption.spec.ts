import { HealthLevelValues } from "../HealthLevelOption";
import { HealthSectorValues } from "../HealthSectorOption";
import { getStrataValuesFromHealthSectorAndLevel, StrataValues } from "../StrataOption";

describe("getStrataValuesFromHealthSectorAndLevel", () => {
    it("should return a single result for single combinations", () => {
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Public, HealthLevelValues.Hospital)).toEqual([
            StrataValues.publicHospital,
        ]);
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Public, HealthLevelValues.Community)).toEqual(
            [StrataValues.publicCommunity]
        );
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Public, HealthLevelValues.Total)).toEqual([
            StrataValues.publicTotal,
        ]);
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Private, HealthLevelValues.Hospital)).toEqual(
            [StrataValues.privateHospital]
        );
        expect(
            getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Private, HealthLevelValues.Community)
        ).toEqual([StrataValues.privateCommunity]);
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Private, HealthLevelValues.Total)).toEqual([
            StrataValues.privateTotal,
        ]);
    });

    it("should return appropriate results for PublicAndPrivate sector and Hospital/Community/Total level", () => {
        expect(
            getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.PublicAndPrivate, HealthLevelValues.Hospital)
        ).toEqual([StrataValues.publicHospital, StrataValues.privateHospital]);
        expect(
            getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.PublicAndPrivate, HealthLevelValues.Community)
        ).toEqual([StrataValues.publicCommunity, StrataValues.privateCommunity]);
        expect(
            getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.PublicAndPrivate, HealthLevelValues.Total)
        ).toEqual([StrataValues.publicTotal, StrataValues.privateTotal]);
    });

    it("should return appropriate results for Total sector and Hospital/Community", () => {
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Total, HealthLevelValues.Hospital)).toEqual([
            StrataValues.globalHospital,
        ]);
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Total, HealthLevelValues.Community)).toEqual([
            StrataValues.globalCommunity,
        ]);
        expect(
            getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Total, HealthLevelValues.HospitalAndCommunity)
        ).toEqual([StrataValues.globalHospital, StrataValues.globalCommunity]);
    });

    it("should return appropriate results for PublicAndPrivate sector and HospitalAndCommunity level", () => {
        expect(
            getStrataValuesFromHealthSectorAndLevel(
                HealthSectorValues.PublicAndPrivate,
                HealthLevelValues.HospitalAndCommunity
            )
        ).toEqual([
            StrataValues.publicHospital,
            StrataValues.privateHospital,
            StrataValues.publicCommunity,
            StrataValues.privateCommunity,
        ]);
    });

    it("should return globalTotal for Total sector and Total level", () => {
        expect(getStrataValuesFromHealthSectorAndLevel(HealthSectorValues.Total, HealthLevelValues.Total)).toEqual([
            StrataValues.globalTotal,
        ]);
    });
});
