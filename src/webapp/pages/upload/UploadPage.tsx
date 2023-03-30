import { Breadcrumbs, Button } from "@material-ui/core";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { UploadContent } from "../../components/upload/UploadContent";
import { glassColors, palette } from "../app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import { CustomCard } from "../../components/custom-card/CustomCard";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";

export const UploadPage: React.FC = React.memo(() => {
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const [period, setPeriod] = useState(currentPeriod);
    const [orgUnit, setOrgUnit] = useState(currentOrgUnitAccess.orgUnitName);
    const [module, setModule] = useState(currentModuleAccess.moduleName);

    const [resetWizard, setResetWizard] = useState(false);

    useEffect(() => {
        //Whenever period, orgUnit or module changes, go back to step 1 of Upload Wizard.
        if (period !== currentPeriod) {
            setPeriod(currentPeriod);
            setResetWizard(true);
        }
        if (orgUnit !== currentOrgUnitAccess.orgUnitName) {
            setOrgUnit(currentOrgUnitAccess.orgUnitName);
            setResetWizard(true);
        }
        if (module !== currentModuleAccess.moduleName) {
            setModule(currentModuleAccess.moduleName);
            setResetWizard(true);
        }
    }, [currentModuleAccess.moduleName, currentOrgUnitAccess.orgUnitName, currentPeriod, module, orgUnit, period]);

    return (
        <ContentWrapper>
            <PreContent>
                {/* // TODO: replace this with a global reusable StyledBreadCrumbs component */}
                <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                    <Button component={NavLink} to={`/current-data-submission`} exact={true} onClick={() => null}>
                        <span>{module}</span>
                    </Button>
                    <ChevronRightIcon />
                    <Button component={NavLink} to={`/upload`} exact={true}>
                        <span>{i18n.t(`${period} Data Submission`)}</span>
                    </Button>
                </StyledBreadCrumbs>
                <div className="info">
                    <span>{i18n.t("Yearly data upload")}</span>, &nbsp;
                    <span>{i18n.t(orgUnit)}</span>
                </div>
            </PreContent>
            <CustomCard padding="40px 60px 50px">
                <UploadContent resetWizard={resetWizard} setResetWizard={setResetWizard} />
            </CustomCard>
        </ContentWrapper>
    );
});

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const PreContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    .info {
        font-size: 14px;
        span {
            opacity: 0.5;
        }
        span:nth-child(1) {
            color: ${glassColors.green};
            opacity: 1;
        }
    }
`;

const StyledBreadCrumbs = styled(Breadcrumbs)`
    color: ${glassColors.mainPrimary};
    font-weight: 400;
    text-transform: uppercase;
    li {
        display: flex;
        align-items: center;
        p {
            padding: 6px 8px;
        }
        .MuiButton-root {
            span {
                color: ${glassColors.mainPrimary};
                font-size: 15px;
            }
        }
    }
    .MuiBreadcrumbs-separator {
        display: none;
    }
    svg {
        color: ${palette.text.secondary};
    }
`;
