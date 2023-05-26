import React, { useEffect, useState } from "react";
import { Grid, Typography } from "@material-ui/core";
import { LandingNews } from "./LandingNews";
import styled from "styled-components";
import { OpenDataSubmissions } from "./OpenDataSubmissions";
import { YourNotifications } from "./notifications/YourNotifications";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useAppContext } from "../../contexts/app-context";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { CustomCard } from "../custom-card/CustomCard";

export const LandingContent: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const [showNoModuleCard, setShowNoModuleCard] = useState(false);

    useEffect(() => {
        compositionRoot.glassModules.getAll(currentOrgUnitAccess.orgUnitId).run(
            modules => {
                if (modules.length > 0) setShowNoModuleCard(false);
                else setShowNoModuleCard(true);
            },
            () => {}
        );
    }, [compositionRoot.glassModules, currentOrgUnitAccess]);

    return (
        <StyledGrid container spacing={4} alignItems="flex-start">
            {showNoModuleCard && (
                <Grid item xs={6}>
                    <CustomCard>
                        <TitleContainer />
                        <NotEnrolledText>
                            You are not enrolled to any of the modules in GLASS. Please contact your Admin for access.
                        </NotEnrolledText>
                    </CustomCard>
                </Grid>
            )}
            <OpenDataSubmissions />
            <YourNotifications />
            <LandingNews />
        </StyledGrid>
    );
};

const StyledGrid = styled(Grid)`
    height: 100%;
    .section-title {
        font-weight: 600;
        margin: 0;
    }
`;
const TitleContainer = styled.div`
    background: ${glassColors.mainPrimary};
    color: white;
    border-radius: 20px 20px 0px 0px;
    padding: 34px 34px;
`;

const NotEnrolledText = styled(Typography)`
    padding: 25px;
`;
