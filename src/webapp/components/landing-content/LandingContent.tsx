import React from "react";
import { Grid } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NewsCard } from "../news-card/NewsCard";
import { AppFooter } from "../app-footer/AppFooter";
import styled from "styled-components";

export const LandingContent: React.FC = () => {
    return (
        <StyledGrid container spacing={4} alignItems="flex-start">
            <Grid item xs={6}>
                <ModuleCard
                    title="AMR 2022"
                    filesUploaded={0}
                    titleColor={glassColors.mainSecondary}
                    iconColor={glassColors.lightSecondary}
                />
            </Grid>
            <Grid item xs={6}>
                <ModuleCard
                    title="AMC 2022"
                    filesUploaded={0}
                    endDays={4}
                    titleColor={glassColors.mainTertiary}
                    iconColor={glassColors.lightTertiary}
                />
            </Grid>
            <Grid item xs={6}>
                <ModuleCard
                    title="EGASP"
                    filesUploaded={0}
                    titleColor={glassColors.mainPrimary}
                    iconColor={glassColors.lightPrimary}
                />
            </Grid>
            <Grid item xs={6}>
                <ModuleCard
                    title="AMR 2023"
                    filesUploaded={0}
                    endDays={2}
                    titleColor={glassColors.mainSecondary}
                    iconColor={glassColors.lightSecondary}
                />
            </Grid>
            <Grid item xs={12}>
                <NewsCard />
            </Grid>
            <AppFooter />
        </StyledGrid>
    );
};

const StyledGrid = styled(Grid)`
    height: 100%;
`;
