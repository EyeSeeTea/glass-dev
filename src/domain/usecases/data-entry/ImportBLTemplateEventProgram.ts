import _ from "lodash";
import moment from "moment";
import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary, ImportSummaryWithEventIdList } from "../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../entities/Future";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import * as templates from "../../entities/data-entry/program-templates";
import { DataForm } from "../../entities/DataForm";
import { ValidationResult } from "../../entities/program-rules/EventEffectTypes";
import { generateId, Id } from "../../entities/Ref";
import { DataPackage, DataPackageDataValue } from "../../entities/data-entry/DataPackage";
import { getStringFromFile } from "./utils/fileToString";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { ProgramRuleValidationForBLEventProgram } from "../program-rules-processing/ProgramRuleValidationForBLEventProgram";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";
import { CustomValidationForEventProgram, PATIENT_DATAELEMENT_ID } from "./egasp/CustomValidationForEventProgram";
import { Template } from "../../entities/Template";
import { ExcelReader } from "../../utils/ExcelReader";
import { InstanceRepository } from "../../repositories/InstanceRepository";
import { AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID } from "./amc/ImportAMCSubstanceLevelData";
import { GlassATCRepository } from "../../repositories/GlassATCRepository";
import { ListGlassATCLastVersionKeysByYear } from "../../entities/GlassAtcVersionData";
import { TrackerEvent } from "../../entities/TrackedEntityInstance";
import { EGASP_PROGRAM_ID } from "../../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import sodium from "libsodium-wrappers";
import { EncryptionData } from "../../entities/EncryptionData";

export const ATC_VERSION_DATA_ELEMENT_ID = "aCuWz3HZ5Ti";

export class ImportBLTemplateEventProgram {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository,
        private glassAtcRepository: GlassATCRepository
    ) {}

    public import(
        file: File,
        action: ImportStrategy,
        eventListFileId: string | undefined,
        moduleName: string,
        orgUnitId: string,
        orgUnitName: string,
        period: string,
        programId: string,
        uploadIdLocalStorageName: string,
        calculatedEventListFileId?: string,
        encryptionData?: EncryptionData
    ): FutureData<ImportSummary> {
        return this.excelRepository.loadTemplate(file, programId).flatMap(_templateId => {
            const template = _.values(templates)
                .map(TemplateClass => new TemplateClass())
                .filter(t => t.id === "PROGRAM_GENERATED_v4")[0];
            return this.instanceRepository.getProgram(programId).flatMap(program => {
                if (template) {
                    return readTemplate(
                        template,
                        program,
                        this.excelRepository,
                        this.instanceRepository,
                        programId
                    ).flatMap(dataPackage => {
                        if (dataPackage) {
                            return this.buildEventsPayload(
                                dataPackage,
                                action,
                                programId,
                                eventListFileId,
                                calculatedEventListFileId,
                                encryptionData
                            ).flatMap(events => {
                                if (action === "CREATE_AND_UPDATE") {
                                    if (!events.length)
                                        return Future.error("The file is empty or failed while reading the file.");

                                    //Run validations on import only
                                    return this.validateEvents(
                                        events,
                                        orgUnitId,
                                        orgUnitName,
                                        period,
                                        programId
                                    ).flatMap(validatedEventResults => {
                                        if (validatedEventResults.blockingErrors.length > 0) {
                                            const errorSummary: ImportSummary = {
                                                status: "ERROR",
                                                importCount: {
                                                    ignored: 0,
                                                    imported: 0,
                                                    deleted: 0,
                                                    updated: 0,
                                                    total: 0,
                                                },
                                                nonBlockingErrors: validatedEventResults.nonBlockingErrors,
                                                blockingErrors: validatedEventResults.blockingErrors,
                                            };
                                            return Future.success(errorSummary);
                                        } else {
                                            const eventIdLineNoMap: { id: string; lineNo: number }[] = [];
                                            const eventsWithId = validatedEventResults.events?.map(e => {
                                                const generatedId = generateId();
                                                eventIdLineNoMap.push({
                                                    id: generatedId,
                                                    lineNo: isNaN(parseInt(e.event)) ? 0 : parseInt(e.event),
                                                });
                                                e.event = generatedId;
                                                return e;
                                            });
                                            return this.dhis2EventsDefaultRepository
                                                .import({ events: eventsWithId ?? [] }, action)
                                                .flatMap(result => {
                                                    return mapToImportSummary(
                                                        result,
                                                        "event",
                                                        this.metadataRepository,
                                                        {
                                                            nonBlockingErrors: validatedEventResults.nonBlockingErrors,
                                                            eventIdLineNoMap,
                                                        }
                                                    ).flatMap(summary => {
                                                        return uploadIdListFileAndSave(
                                                            uploadIdLocalStorageName,
                                                            summary,
                                                            moduleName,
                                                            this.glassDocumentsRepository,
                                                            this.glassUploadsRepository
                                                        );
                                                    });
                                                });
                                        }
                                    });
                                } //action === "DELETE"
                                else {
                                    // NOTICE: check also DeleteBLTemplateEventProgram.ts that contains same code adapted for node environment (only DELETE)
                                    return this.deleteEvents(events);
                                }
                            });
                        } else {
                            return Future.error("Unknown template");
                        }
                    });
                } else {
                    return Future.error("Unknown template");
                }
            });
        });
    }

    private deleteEvents(events: TrackerEvent[]): FutureData<ImportSummary> {
        return this.dhis2EventsDefaultRepository.import({ events }, "DELETE").flatMap(result => {
            return mapToImportSummary(result, "event", this.metadataRepository).flatMap(({ importSummary }) => {
                return Future.success(importSummary);
            });
        });
    }

    private buildEventsPayload(
        dataPackage: DataPackage,
        action: ImportStrategy,
        programId: string,
        eventListFileId: string | undefined,
        calculatedEventListFileId?: string,
        encryptionData?: EncryptionData
    ): FutureData<TrackerEvent[]> {
        if (action === "CREATE_AND_UPDATE") {
            if (programId === AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID) {
                return this.buildEventsPayloadForAMCSubstances(dataPackage);
            }
            return Future.success(this.mapDataPackageToD2TrackerEvents(dataPackage, undefined, encryptionData));
        } else if (action === "DELETE") {
            return Future.joinObj({
                events: eventListFileId ? this.getEventsFromListFileId(eventListFileId) : Future.success([]),
                calculatedEvents: calculatedEventListFileId
                    ? this.getEventsFromListFileId(calculatedEventListFileId)
                    : Future.success([]),
            }).flatMap(({ events, calculatedEvents }) => {
                return Future.success([...events, ...calculatedEvents]);
            });
        }
        return Future.success([]);
    }

    buildEventsPayloadForAMCSubstances(dataPackage: DataPackage): FutureData<TrackerEvent[]> {
        const atcVerionYears = dataPackage.dataEntries.reduce((acc: string[], dataEntry) => {
            const atcVerionYear = dataEntry.dataValues.find(
                ({ dataElement }) => dataElement === ATC_VERSION_DATA_ELEMENT_ID
            )?.value;
            return atcVerionYear ? [...acc, atcVerionYear.toString()] : acc;
        }, []);

        const uniqueAtcVerionYears = Array.from(new Set(atcVerionYears));

        return this.glassAtcRepository.getAtcHistory().flatMap(atcVersionHistory => {
            const atcVersionHistoryYears = atcVersionHistory.map(atcHistory => atcHistory.year.toString());
            const missingAtcVersionYearsInHistory = uniqueAtcVerionYears.filter(
                year => !atcVersionHistoryYears.includes(year)
            );
            return this.glassAtcRepository
                .getListOfLastAtcVersionsKeysByYears(
                    uniqueAtcVerionYears.filter(year => !missingAtcVersionYearsInHistory.includes(year))
                )
                .flatMap(atcVersionKeysByYear => {
                    return Future.success(this.mapDataPackageToD2TrackerEvents(dataPackage, atcVersionKeysByYear));
                });
        });
    }

    mapDataPackageToD2TrackerEvents(
        dataPackage: DataPackage,
        atcVersionKeysByYear?: ListGlassATCLastVersionKeysByYear,
        encryptionData?: EncryptionData
    ): TrackerEvent[] {
        return dataPackage.dataEntries.map(
            ({ id, orgUnit, period, attribute, dataValues, dataForm, coordinate }, index) => {
                console.debug({ id, orgUnit, period, attribute, dataValues, dataForm, coordinate }, index);

                const occurredAt =
                    dataForm === AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID
                        ? moment(new Date(new Date(period).getFullYear(), 0, 1)).format("YYYY-MM-DD") ?? period
                        : period;

                console.debug(occurredAt);

                return {
                    event: id || (index + 6).toString(),
                    program: dataForm,
                    programStage: "",
                    status: "COMPLETED",
                    orgUnit,
                    occurredAt: occurredAt,
                    attributeOptionCombo: attribute,
                    dataValues: dataValues.map(el => {
                        if (
                            dataForm === AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID &&
                            el.dataElement === ATC_VERSION_DATA_ELEMENT_ID
                        ) {
                            const atcVersionKey = atcVersionKeysByYear ? atcVersionKeysByYear[el.value.toString()] : "";
                            return { ...el, value: atcVersionKey ?? "" };
                        } else if (dataForm === EGASP_PROGRAM_ID && el.dataElement === PATIENT_DATAELEMENT_ID) {
                            //For EGASP, encrypt the patient id

                            const patientId = el.value.toString();

                            if (!encryptionData) {
                                throw new Error("Encryption data is required for encrypting patient id, not found");
                            }
                            const encryptedPatientId = this.encryptString(encryptionData, patientId);
                            return { ...el, value: encryptedPatientId };
                        }

                        return { ...el, value: el.value.toString() };
                    }),
                    coordinate,
                };
            }
        );
    }

    private getEventsFromListFileId(listFileId: string): FutureData<TrackerEvent[]> {
        return this.glassDocumentsRepository.download(listFileId).flatMap(eventListFile => {
            return Future.fromPromise(getStringFromFile(eventListFile)).flatMap(_events => {
                const eventIdList: string[] = JSON.parse(_events);
                const events: TrackerEvent[] = eventIdList.map(eventId => {
                    return {
                        event: eventId,
                        program: "",
                        programStage: "",
                        status: "COMPLETED",
                        orgUnit: "",
                        occurredAt: "",
                        attributeOptionCombo: "",
                        dataValues: [],
                    };
                });
                return Future.success(events);
            });
        });
    }

    private validateEvents(
        events: TrackerEvent[],
        orgUnitId: string,
        orgUnitName: string,
        period: string,
        programId: string
    ): FutureData<ValidationResult> {
        //1. Run Program Rule Validations
        const programRuleValidations = new ProgramRuleValidationForBLEventProgram(this.programRulesMetadataRepository);

        //2. Run Custom EGASP Validations
        const customValidations = new CustomValidationForEventProgram(
            this.dhis2EventsDefaultRepository,
            this.metadataRepository
        );

        return Future.joinObj({
            programRuleValidationResults: programRuleValidations.getValidatedTeisAndEvents(programId, events),
            customRuleValidationsResults: customValidations.getValidatedEvents(
                events,
                orgUnitId,
                orgUnitName,
                period,
                programId
            ),
        }).flatMap(({ programRuleValidationResults, customRuleValidationsResults }) => {
            const consolidatedValidationResults: ValidationResult = {
                events: programRuleValidationResults.events,
                blockingErrors: [
                    ...programRuleValidationResults.blockingErrors,
                    ...customRuleValidationsResults.blockingErrors,
                ],
                nonBlockingErrors: [
                    ...programRuleValidationResults.nonBlockingErrors,
                    ...customRuleValidationsResults.nonBlockingErrors,
                ],
            };
            return Future.success(consolidatedValidationResults);
        });
    }

    private encryptString(encryptionData: EncryptionData, input: string): string {
        const inputBytes = sodium.from_string(input);
        const nonce = sodium.from_string(encryptionData.nonce);
        const key = sodium.from_base64(encryptionData.key);
        const encrypted = sodium.crypto_secretbox_easy(inputBytes, nonce, key);
        const encryptedString = sodium.to_base64(nonce) + ":" + sodium.to_base64(encrypted);
        return encryptedString;
    }
}

export const uploadIdListFileAndSave = (
    uploadIdLocalStorageName: string,
    summary: ImportSummaryWithEventIdList,
    moduleName: string,
    glassDocumentsRepository: GlassDocumentsRepository,
    glassUploadsRepository: GlassUploadsRepository
): FutureData<ImportSummary> => {
    const uploadId = localStorage.getItem(uploadIdLocalStorageName);
    if (summary.eventIdList.length > 0 && uploadId) {
        //Events were imported successfully, so create and uplaod a file with event ids
        // and associate it with the upload datastore object
        const eventListBlob = new Blob([JSON.stringify(summary.eventIdList)], {
            type: "text/plain",
        });
        const eventIdListFile = new File([eventListBlob], `${uploadId}_eventIdsFile`);
        return glassDocumentsRepository.save(eventIdListFile, moduleName).flatMap(fileId => {
            return glassUploadsRepository.setEventListFileId(uploadId, fileId).flatMap(() => {
                return Future.success(summary.importSummary);
            });
        });
    } else {
        return Future.success(summary.importSummary);
    }
};

export const mapToImportSummary = (
    result: TrackerPostResponse,
    type: "event" | "trackedEntity",
    metadataRepository: MetadataRepository,
    params?: {
        nonBlockingErrors?: ConsistencyError[];
        eventIdLineNoMap?: { id: string; lineNo: number }[];
    }
): FutureData<ImportSummaryWithEventIdList> => {
    const nonBlockingErrors = params?.nonBlockingErrors;
    const eventIdLineNoMap = params?.eventIdLineNoMap;

    if (result && result.validationReport && result.stats) {
        const blockingErrorList = _.compact(
            result.validationReport.errorReports.map(summary => {
                if (summary.message) return { error: summary.message, eventId: summary.uid };
            })
        );

        const blockingErrorsByGroup = _(blockingErrorList).groupBy("error").value();
        const eventIdsInBlockingErrors = Object.keys(_(blockingErrorList).groupBy("eventId").value());

        //Get list of any d2-Ids in error messages.
        const d2Ids = _(
            Object.entries(blockingErrorsByGroup).map(err => {
                const errMsg = err[0];

                //Error message type 2 contains  regex in format : {id}
                const uuidPattern = /\b([A-Za-z0-9]{11})\b/g;
                const uuidMatches = errMsg.match(uuidPattern);
                const uuidMatchesWithoutEventId = uuidMatches?.filter(
                    match => !eventIdsInBlockingErrors.includes(match)
                );

                if (uuidMatchesWithoutEventId) return uuidMatchesWithoutEventId;
            })
        )
            .compact()
            .uniq()
            .flatten()
            .value();

        //Get list of DataElement Names in error messages.
        return metadataRepository
            .getD2Ids(_.uniq(d2Ids))
            .flatMap(d2IdsMap => {
                const importSummary: ImportSummary = {
                    status: result.status === "OK" ? "SUCCESS" : result.status,
                    importCount: {
                        imported: result.stats.created,
                        updated: result.stats.updated,
                        ignored: result.stats.ignored,
                        deleted: result.stats.deleted,
                        total: result.stats.total,
                    },
                    blockingErrors: Object.entries(blockingErrorsByGroup).map(err => {
                        const errMsg = err[0];

                        const parsedErrMsg = d2Ids.reduce((currentMessage, id) => {
                            return currentMessage.includes(id)
                                ? currentMessage.replace(
                                      new RegExp(id, "g"),
                                      d2IdsMap.find(ref => ref.id === id)?.name ?? id
                                  )
                                : currentMessage;
                        }, errMsg);

                        const lines = err[1].flatMap(a => eventIdLineNoMap?.find(e => e.id === a.eventId)?.lineNo);
                        return {
                            error: parsedErrMsg,
                            count: err[1].length,
                            lines: _.compact(lines),
                        };
                    }),
                    nonBlockingErrors: nonBlockingErrors ? nonBlockingErrors : [],
                    importTime: new Date(),
                };

                const eventIdList =
                    result.status === "OK"
                        ? type === "event"
                            ? result.bundleReport.typeReportMap.EVENT.objectReports.map(report => report.uid)
                            : result.bundleReport.typeReportMap.TRACKED_ENTITY.objectReports.map(report => report.uid)
                        : [];

                return Future.success({ importSummary, eventIdList: _.compact(eventIdList) });
            })
            .flatMapError(error => {
                const errorImportSummary: ImportSummaryWithEventIdList = {
                    importSummary: {
                        status: "ERROR",
                        importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0, total: 0 },
                        nonBlockingErrors: [],
                        blockingErrors: [{ error: error, count: 1 }],
                    },
                    eventIdList: [],
                };
                return Future.success(errorImportSummary);
            });
    } else {
        return Future.success({
            importSummary: {
                status: "ERROR",
                importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0, total: 0 },
                nonBlockingErrors: [],
                blockingErrors: [{ error: result?.message ?? "An error occurred during import. ", count: 1 }],
            },
            eventIdList: [],
        });
    }
};

export const readTemplate = (
    template: Template,
    dataForm: DataForm,
    excelRepository: ExcelRepository,
    instanceReporsitory: InstanceRepository,
    programId: Id
): FutureData<DataPackage | undefined> => {
    const reader = new ExcelReader(excelRepository, instanceReporsitory);
    return Future.fromPromise(reader.readTemplate(template, programId)).map(excelDataValues => {
        if (!excelDataValues) return undefined;

        return {
            ...excelDataValues,
            dataEntries: excelDataValues.dataEntries.map(({ dataValues, ...dataEntry }) => {
                return {
                    ...dataEntry,
                    dataValues: _.compact(dataValues.map(value => formatDhis2Value(value, dataForm))),
                };
            }),
        };
    });
};

export const formatDhis2Value = (item: DataPackageDataValue, dataForm: DataForm): DataPackageDataValue | undefined => {
    const dataElement = dataForm.dataElements.find(({ id }) => item.dataElement === id);
    const booleanValue = String(item.value) === "true" || item.value === "true";

    if (dataElement?.valueType === "BOOLEAN") {
        return { ...item, value: booleanValue };
    }

    if (dataElement?.valueType === "TRUE_ONLY") {
        return booleanValue ? { ...item, value: true } : undefined;
    }

    const selectedOption = dataElement?.options?.find(({ id }) => item.optionId === id);
    const value = selectedOption?.code ?? item.value;
    return { ...item, value };
};
