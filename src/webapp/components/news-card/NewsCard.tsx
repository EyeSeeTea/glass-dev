import React from "react";
import { Grid, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";

export const NewsCard: React.FC = () => {
    return (
        <CustomCard>
            <TitleContainer>
                <Typography variant="h5">{i18n.t("News from GLASS")}</Typography>
            </TitleContainer>
            <ContentContainer>
                <Grid container spacing={4}>
                    <Grid item xs={3}>
                        <NewsTitle align="right" variant="h5">
                            New platform
                        </NewsTitle>
                        <Typography align="right" color="textSecondary">
                            1/ 10/ 2021
                        </Typography>
                    </Grid>
                    <Grid item xs={9}>
                        <NewsContent variant="h6">
                            This is a platform for global data sharing on antimicrobial resistance worldwide. It has
                            been launched by WHO as part of the implementation of the Global Action Plan on
                            Antimicrobial Resistance (AMR). The data will help to inform national, regional and global
                            decision-making, strategies and advocacy.
                        </NewsContent>
                    </Grid>
                    <Grid item xs={3}>
                        <NewsTitle align="right" variant="h5">
                            Maintenance shutdown
                        </NewsTitle>
                        <NewsTitle align="right" variant="h5">
                            during 24h
                        </NewsTitle>
                        <Typography align="right" color="textSecondary">
                            1/ 10/ 2021
                        </Typography>
                    </Grid>
                    <Grid item xs={9}>
                        <NewsContent variant="h6">
                            This is a platform for global data sharing on antimicrobial resistance worldwide. It has
                            been launched by WHO as part of the implementation of the Global Action Plan on
                            Antimicrobial Resistance (AMR). The data will help to inform national, regional and global
                            decision-making, strategies and advocacy.
                        </NewsContent>
                    </Grid>
                </Grid>
            </ContentContainer>
        </CustomCard>
    );
};

const TitleContainer = styled.div`
    background: ${glassColors.lightSecondary};
    color: white;
    border-radius: 20px 20px 0px 0px;
    padding: 14px 34px;
`;

const ContentContainer = styled.div`
    padding: 30px;
`;

const NewsTitle = styled(Typography)`
    color: #666666;
    font-weight: 400;
`;

const NewsContent = styled(Typography)`
    color: #606060;
    font-weight: 300;
`;
