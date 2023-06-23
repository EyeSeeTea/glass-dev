import React, { Dispatch, SetStateAction, useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { CircularProgress } from "material-ui";
import { useCurrentUserGroupsAccess } from "../../hooks/useCurrentUserGroupsAccess";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";

interface AdvancedButtonsProps {
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}
export const AdvancedButtons: React.FC<AdvancedButtonsProps> = ({ setRefetchStatus, setCurrentStep }) => {
    const { compositionRoot } = useAppContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const dataSubmissionId = useCurrentDataSubmissionId(
        compositionRoot,
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId,
        currentPeriod
    );
    const [loading, setLoading] = useState<boolean>(false);
    const { approveAccessGroup, captureAccessGroup } = useCurrentUserGroupsAccess();

    const requestDatasetUpdate = () => {
        setLoading(true);
        compositionRoot.glassDataSubmission.setStatus(dataSubmissionId, "PENDING_UPDATE_APPROVAL").run(
            () => {
                setRefetchStatus("PENDING_UPDATE_APPROVAL");
                if (captureAccessGroup.kind === "loaded" && approveAccessGroup.kind === "loaded") {
                    const approveAccessGroups = approveAccessGroup.data.map(aag => {
                        return aag.id;
                    });
                    const captureAccessGroups = captureAccessGroup.data.map(cag => {
                        return cag.id;
                    });

                    const userGroupsIds = [...approveAccessGroups, ...captureAccessGroups];
                    const notificationText = `The data submission for ${currentModuleAccess.moduleName} module for year ${currentPeriod} and country ${currentOrgUnitAccess.orgUnitName} has changed to WAITING for WHO TO ACCEPT THE DATA UPDATE REQUEST`;
                    compositionRoot.notifications
                        .send(notificationText, notificationText, userGroupsIds, currentOrgUnitAccess.orgUnitId)
                        .run(
                            () => {},
                            () => {}
                        );
                }
                setCurrentStep(0);
                setLoading(false);
            },
            () => {
                setLoading(false);
            }
        );
    };

    return (
        <ContentWrapper className="cta-buttons">
            <div>
                <Button variant="contained" color="primary" onClick={requestDatasetUpdate}>
                    {i18n.t("Request Dataset update")}
                </Button>
            </div>

            {loading && <CircularProgress size={25} />}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    gap: 20px;
    > div {
        display: flex;
        flex-direction: column;
        gap: 15px;
        span {
            font-weight: 600;
        }
        button {
            font-weight: 400;
        }
    }
    button {
        background-color: ${glassColors.negative};
        &:hover {
            background-color: ${glassColors.red};
        }
    }
`;
