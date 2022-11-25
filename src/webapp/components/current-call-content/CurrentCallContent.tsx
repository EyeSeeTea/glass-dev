import React from "react";
import { Grid } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NewsCard } from "../news-card/NewsCard";
import { AppFooter } from "../app-footer/AppFooter";
import styled from "styled-components";

export const CurrentCallContent: React.FC = () => {
    return (
        <StyledGrid container spacing={4} alignItems="flex-start">
            <Grid item xs={12}>
                <ModuleCard
                    title="AMR"
                    filesUploaded={0}
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
