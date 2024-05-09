import i18n from "@eyeseetea/d2-ui-components/locales";
import { Future, FutureData } from "../../../entities/Future";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { ValidationResult } from "../../../entities/program-rules/EventEffectTypes";
import { D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { GlassATCDefaultRepository } from "../../../../data/repositories/GlassATCDefaultRepository";
import { GlassAtcVersionData, LAST_ATC_CODE_LEVEL, getAtcCodeByLevel } from "../../../entities/GlassAtcVersionData";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";

const AMR_GLASS_AMC_TEA_ATC = "aK1JpD14imM";
const AMR_GLASS_AMC_TEA_COMBINATION = "mG49egdYK3G";
const AMR_GLASS_AMC_TEA_ROUTE_ADMIN = "m4eyu3tO5IV";
const AMR_GLASS_AMC_TEA_SALT = "K8wjLXjYFzf";
const AMR_GLASS_AMC_TEA_PRODUCT_ID = "iasfoeU8veF";
const atcLevel4WithOralROA1 = "A07AA";
const atcLevel4WithOralROA2 = "P01AB";
const atcLevel4WithOralROA3 = "J01XD";
const atcLevel4WithOralROA4 = "J01XA";
const atcCodeWithSaltHippAndMand = "J01XX05";
const atcCodeWithRoaOAndSaltDefault = "J01FA01";
const CODE_PRODUCT_NOT_HAVE_ATC = "Z99ZZ99";
const COMB_CODE_PRODUCT_NOT_HAVE_ATC = "Z99ZZ99_99";

export class CustomValidationsAMCProductData {
    constructor(
        private atcRepository: GlassATCDefaultRepository,
        private amcProductRepository: AMCProductDataRepository
    ) {}
    // private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
    public getValidatedEvents(
        teis: D2TrackerTrackedEntity[],
        orgUnitId: string,
        orgUnitName: string,
        period: string
    ): FutureData<ValidationResult> {
        return this.atcRepository.getCurrentAtcVersion().flatMap(atcVersion => {
            return this.amcProductRepository
                .getTrackedEntityProductIdsByOUAndPeriod(orgUnitId, period)
                .flatMap(existingProductIds => {
                    const duplicateProductIdsErrors = this.checkUniqueProductIds(teis, orgUnitId, existingProductIds);
                    const attributeLevelErrors = this.checkTEIAttributeValidations(
                        teis,
                        orgUnitId,
                        orgUnitName,
                        period,
                        atcVersion
                    );

                    const dateErrors = this.checkSameEnrollmentDate(teis);
                    const results: ValidationResult = {
                        teis: teis,
                        blockingErrors: [...duplicateProductIdsErrors, ...attributeLevelErrors, ...dateErrors],
                        nonBlockingErrors: [],
                    };

                    return Future.success(results);
                });
        });
    }

    private checkUniqueProductIds(
        teis: D2TrackerTrackedEntity[],
        orgUnitId: string,
        existingProductIds: string[]
    ): ConsistencyError[] {
        //1. Product ids of tracked entities in file.
        const fileProductIDs = teis.map(tei => {
            const productId = tei.attributes?.find(attr => attr.attribute === AMR_GLASS_AMC_TEA_PRODUCT_ID);

            if (productId) return { teiID: tei.trackedEntity, orgUnit: tei.orgUnit, productId: productId.value };
            else return null;
        });

        //2. Product ids of existing tracked entities.
        const existingProductIDs = existingProductIds.map(productId => {
            return { teiID: "", orgUnit: orgUnitId, productId: productId };
        });

        const allProductIds = _([...fileProductIDs, ...existingProductIDs])
            .compact()
            .value();

        const errors = _(allProductIds)
            .groupBy("productId")
            .map(duplicateProductIdGroup => {
                if (
                    duplicateProductIdGroup.length > 1 &&
                    duplicateProductIdGroup.some(pg =>
                        fileProductIDs.some(fileProduct => pg.teiID === fileProduct?.teiID)
                    )
                ) {
                    return {
                        error: i18n.t(`This Product ID already exists : ${duplicateProductIdGroup[0]?.productId}`),
                        lines: _(duplicateProductIdGroup.map(product => (product.teiID ? parseInt(product.teiID) : "")))
                            .compact()
                            .value(),
                        count: duplicateProductIdGroup.length,
                    };
                }
            })
            .flatMap()
            .compact()
            .value();

        return errors;
    }

    private checkTEIAttributeValidations(
        teis: D2TrackerTrackedEntity[],
        countryId: string,
        countryName: string,
        period: string,
        atcVersion: GlassAtcVersionData
    ): ConsistencyError[] {
        const errors = _(
            teis.map(tei => {
                const curErrors = [];
                const eventDate = tei.enrollments?.[0]?.enrolledAt
                    ? new Date(tei.enrollments?.[0].enrolledAt)
                    : new Date();

                const atcCode = tei.attributes?.find(attr => attr.attribute === AMR_GLASS_AMC_TEA_ATC)?.value;
                const combinationCode = tei.attributes?.find(
                    attr => attr.attribute === AMR_GLASS_AMC_TEA_COMBINATION
                )?.value;
                const roa = tei.attributes?.find(attr => attr.attribute === AMR_GLASS_AMC_TEA_ROUTE_ADMIN)?.value;
                const salt = tei.attributes?.find(attr => attr.attribute === AMR_GLASS_AMC_TEA_SALT)?.value;

                if (tei.orgUnit !== countryId) {
                    curErrors.push({
                        error: i18n.t(
                            `Selected Country is incorrect: Selected country : ${countryName}, country in file: ${tei.orgUnit}`
                        ),
                        line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                    });
                }
                if (eventDate.getFullYear().toString() !== period) {
                    curErrors.push({
                        error: i18n.t(
                            `Event date is incorrect: Selected period : ${period}, date in file: ${
                                tei.enrollments?.[0]?.enrolledAt.split("T")[0]
                            }`
                        ),
                        line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                    });
                }
                if (atcCode) {
                    const atcData = atcVersion.atcs;
                    const validATCCode =
                        atcCode === CODE_PRODUCT_NOT_HAVE_ATC
                            ? atcCode
                            : atcData.find(data => data.CODE === atcCode && data.LEVEL === LAST_ATC_CODE_LEVEL)?.CODE;

                    if (!validATCCode) {
                        curErrors.push({
                            error: i18n.t(
                                `ATC code specified in the file is not a valid level 5 ATC code : ${atcCode}`
                            ),
                            line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                        });
                    } else {
                        const atcCodeByLevel = getAtcCodeByLevel(atcData, atcCode);
                        const atcCodeLevel4 = atcCodeByLevel?.level4;
                        if (
                            (atcCodeLevel4 === atcLevel4WithOralROA1 ||
                                atcCodeLevel4 === atcLevel4WithOralROA2 ||
                                atcCodeLevel4 === atcLevel4WithOralROA3 ||
                                atcCodeLevel4 === atcLevel4WithOralROA4) &&
                            roa &&
                            roa !== "O"
                        ) {
                            curErrors.push({
                                error: i18n.t(
                                    `If ATC code in ATC levels 4 A07AA and P01AB, Route of administration must be oral`
                                ),
                                line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                            });
                        }

                        if (validATCCode === atcCodeWithSaltHippAndMand && salt && salt !== "HIPP" && salt !== "MAND") {
                            curErrors.push({
                                error: i18n.t(
                                    `If ATC code is ${atcCodeWithSaltHippAndMand}, salt must be either HIPP or MAND`
                                ),
                                line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                            });
                        }
                        if (validATCCode === atcCodeWithRoaOAndSaltDefault) {
                            if (roa && roa === "O" && !(salt === "XXXX" || salt === "ESUC")) {
                                curErrors.push({
                                    error: i18n.t(
                                        `If ATC code is ${atcCodeWithRoaOAndSaltDefault} : If route of administration is oral, salt must be either “default” or "ESUC"`
                                    ),
                                    line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                                });
                            }
                            if (roa && roa !== "O" && salt !== "XXXX") {
                                curErrors.push({
                                    error: i18n.t(
                                        `If ATC code is ${atcCodeWithRoaOAndSaltDefault} : If route of administration is not oral,  salt must be “default”`
                                    ),
                                    line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                                });
                            }
                        }
                    }
                }
                const combinationData = atcVersion.combinations;
                const validCombinationCode = combinationData.find(data => data.COMB_CODE === combinationCode);

                if (combinationCode) {
                    if (!validCombinationCode && combinationCode !== COMB_CODE_PRODUCT_NOT_HAVE_ATC) {
                        curErrors.push({
                            error: i18n.t(
                                `Combination code specified in the file is not a valid combination code : ${combinationCode}`
                            ),
                            line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                        });
                    }
                }

                if (roa && validCombinationCode && combinationCode !== COMB_CODE_PRODUCT_NOT_HAVE_ATC) {
                    if (roa !== validCombinationCode.ROA) {
                        curErrors.push({
                            error: i18n.t(
                                `Route of Administration specified in the file : ${roa} is not valid for given combination code : ${combinationCode}. 
                                \n It should be ${validCombinationCode.ROA}`
                            ),
                            line: tei.trackedEntity ? parseInt(tei.trackedEntity) + 6 : -1,
                        });
                    }
                }

                return curErrors;
            })
        )
            .flatMap()
            .omitBy(_.isNil)
            .groupBy(error => error?.error)
            .mapValues(value => value.map(el => el?.line || 0))
            .value();

        return Object.keys(errors).map(error => ({
            error: error,
            count: errors[error]?.length || 0,
            lines: errors[error] || [],
        }));
    }

    private checkSameEnrollmentDate(teis: D2TrackerTrackedEntity[]): ConsistencyError[] {
        const dateGroups = _(teis).groupBy("enrollments[0].enrolledAt").keys().value();
        if (dateGroups.length > 1) {
            return [
                {
                    error: "All TEI instances in the file should have the same enrollment date ",
                    count: teis.length,
                },
            ];
        } else return [];
    }
}
