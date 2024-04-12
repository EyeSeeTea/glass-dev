import React from "react";
import { Button, CircularProgress, Typography } from "@material-ui/core";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { Validations } from "../current-data-submission/Validations";
import { useReviewDataSummary } from "./hooks/useReviewDataSummary";

interface ReviewDataSummaryProps {
    changeStep: (step: number) => void;
    primaryFileImportSummary: ImportSummary | undefined;
    secondaryFileImportSummary?: ImportSummary | undefined;
}

export const ReviewDataSummary: React.FC<ReviewDataSummaryProps> = ({
    changeStep,
    primaryFileImportSummary,
    secondaryFileImportSummary,
}) => {
    const { currentModuleAccess } = useCurrentModuleContext();

    const { goToFinalStep, isReportReady, isLoading, fileType, changeType } = useReviewDataSummary(
        changeStep,
        primaryFileImportSummary
    );

    return (
        <ContentWrapper>
            {moduleProperties.get(currentModuleAccess.moduleName)?.isSecondaryFileApplicable &&
                !moduleProperties.get(currentModuleAccess.moduleName)?.isSingleFileTypePerSubmission && (
                    <div className="toggles">
                        <Button
                            onClick={() => changeType("primary")}
                            className={fileType === "primary" ? "current" : ""}
                        >
                            {i18n.t(`${moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType} File`)}
                        </Button>
                        <Button
                            onClick={() => changeType("secondary")}
                            className={fileType === "secondary" ? "current" : ""}
                        >
                            {i18n.t(`${moduleProperties.get(currentModuleAccess.moduleName)?.secondaryFileType} File`)}
                        </Button>
                    </div>
                )}
            <Section className="summary">
                <h3>{i18n.t("Summary")}</h3>
                <SectionCard className="wrong">
                    <ul>
                        <li>
                            <b>{i18n.t("imported: ", { nsSeparator: false })}</b>{" "}
                            {fileType === "primary"
                                ? primaryFileImportSummary?.importCount.imported
                                : secondaryFileImportSummary?.importCount.imported}
                        </li>
                        <li>
                            <b>{i18n.t("updated: ", { nsSeparator: false })}</b>{" "}
                            {fileType === "primary"
                                ? primaryFileImportSummary?.importCount.updated
                                : secondaryFileImportSummary?.importCount.updated}
                        </li>
                        <li>
                            <b>{i18n.t("deleted: ", { nsSeparator: false })}</b>{" "}
                            {fileType === "primary"
                                ? primaryFileImportSummary?.importCount.deleted
                                : secondaryFileImportSummary?.importCount.deleted}
                            {}
                        </li>
                        <li>
                            <b>{i18n.t("ignored: ", { nsSeparator: false })}</b>{" "}
                            {fileType === "primary"
                                ? primaryFileImportSummary?.importCount.ignored
                                : secondaryFileImportSummary?.importCount.ignored}
                        </li>
                    </ul>
                </SectionCard>
                <SectionCard>
                    {isReportReady === true ? (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <Validations />
                        </div>
                    ) : (
                        <div>
                            <Typography variant="h3">
                                We are running analytics in the background, this typically takes 5 mins.
                            </Typography>
                            <Typography>
                                You can wait on this page to view report,
                                <b> or click continue to complete the submission.</b> The report can be viewed in the
                                Validation tab at anytime.
                            </Typography>
                            <StyledProgress>
                                <CircularProgress size={75} />
                            </StyledProgress>
                        </div>
                    )}
                </SectionCard>
            </Section>
            <div className="bottom">
                {isLoading ? (
                    <CircularProgress size={25} />
                ) : (
                    <Button
                        variant="contained"
                        color={"primary"}
                        endIcon={<ChevronRightIcon />}
                        onClick={goToFinalStep}
                        disableElevation
                    >
                        {i18n.t("Continue")}
                    </Button>
                )}
            </div>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    .toggles {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        width: 100%;
        max-width: 550px;
        margin: 0 auto;
        button {
            color: ${glassColors.greyDisabled};
            padding: 10px 20px;
            border-radius: 0;
            border: none;
            flex: 1;
            border-bottom: 2px solid ${glassColors.greyLight};
            &.current {
                color: ${glassColors.mainPrimary};
                border-bottom: 4px solid ${glassColors.mainPrimary};
            }
        }
    }
    .bottom {
        display: flex;
        align-items: baseline;
        justify-content: flex-end;
        margin: 0 auto 30px auto;
        align-items: flex-end;
        width: 100%;
    }
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    h3 {
        margin: 0;
        font-size: 21px;
        font-weight: 500;
    }
    &.charts {
        img {
            display: block;
            width: 100%;
        }
    }
`;
const SectionCard = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
    ul {
        margin: 0;
        padding: 0;
        display: flex;
        gap: 20px;
        list-style-type: none;
        li {
            display: inline-block;
        }
    }
`;

const StyledProgress = styled.div`
    display: flex;
    justify-content: center;
    padding: 10px;
`;
