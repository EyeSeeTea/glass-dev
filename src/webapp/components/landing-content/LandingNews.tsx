import React from "react";
import { Grid, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";

export const LandingNews: React.FC = () => {
    return (
        <Grid item xs={12}>
            <CustomCard>
                <TitleContainer>
                    <Typography variant="h5">{i18n.t("News from GLASS")}</Typography>
                </TitleContainer>
                <ContentContainer>
                    <NewsList>
                        <Item>
                            <Heading>
                                <h3>New Platform</h3>
                                <Typography align="right" color="textSecondary">
                                    1/10/2021
                                </Typography>
                            </Heading>
                            <NewsContent>
                                This is a platform for global data sharing on antimicrobial resistance worldwide. It has
                                been launched by WHO as part of the implementation of the Global Action Plan on
                                Antimicrobial Resistance (AMR). The data will help to inform national, regional and
                                global decision-making, strategies and advocacy.
                            </NewsContent>
                        </Item>

                        <Item>
                            <Heading>
                                <h3>Maintenance shutdown</h3>
                                <Typography align="right" color="textSecondary">
                                    1/11/2021
                                </Typography>
                            </Heading>
                            <NewsContent>
                                Nunc auctor purus at mi luctus facilisis. Cras eu nisl vitae elit porta tristique ac id
                                lorem. Sed congue at lacus a blandit.
                            </NewsContent>
                        </Item>

                        <Item>
                            <Heading>
                                <h3>Nunc auctor purus at mi luctus facilisis</h3>
                                <Typography align="right" color="textSecondary">
                                    1/11/2021
                                </Typography>
                            </Heading>
                            <NewsContent>
                                Aenean fringilla risus a est ultricies laoreet. Aenean tempor turpis enim, non tristique
                                libero interdum eget. Mauris condimentum risus ut efficitur rutrum. Curabitur rhoncus
                                placerat viverra. Nullam mi urna, convallis ut efficitur eu, tempus id dolor.
                            </NewsContent>
                        </Item>
                    </NewsList>
                </ContentContainer>
            </CustomCard>
        </Grid>
    );
};

const TitleContainer = styled.div`
    background: ${glassColors.lightSecondary};
    color: white;
    border-radius: 20px 20px 0px 0px;
    padding: 14px 34px;
`;

const NewsList = styled.div`
    display: flex;
    gap: 30px;
    flex-direction: column;
`;
const Item = styled.div`
    display: flex;
    flex-direction: row;
    gap: 20px;
`;

const ContentContainer = styled.div`
    padding: 30px;
`;

const Heading = styled.div`
    flex: none;
    width: 230px;
    text-align: right;
    h3 {
        margin: 0;
        color: ${glassColors.greyBlack};
    }
`;

const NewsContent = styled(Typography)`
    color: #606060;
    font-weight: 300;
    flex: 1;
`;
