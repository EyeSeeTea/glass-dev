import React from "react";
import { Grid, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import { useGlassNews } from "../../hooks/useGlassNews";
import { useAppContext } from "../../contexts/app-context";
import { ContentLoader } from "../content-loader/ContentLoader";

type NewsItemProps = {
    title: string;
    date: Date;
    description: string;
};

const NewsItem = ({ title, date, description }: NewsItemProps): JSX.Element => {
    return (
        <Item>
            <Heading>
                <h3>{title}</h3>
                <Typography align="right" color="textSecondary">
                    {dayjs(date).format("DD/MM/YYYY")}
                </Typography>
            </Heading>
            <NewsContent>{description}</NewsContent>
        </Item>
    );
};

export const LandingNews: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const news = useGlassNews(compositionRoot);

    return (
        <ContentLoader content={news}>
            <Grid item xs={12}>
                <CustomCard>
                    <TitleContainer>
                        <Typography variant="h5">{i18n.t("News from GLASS")}</Typography>
                    </TitleContainer>
                    <ContentContainer>
                        <NewsList>
                            {news.kind === "loaded" &&
                                news.data.map(news => (
                                    <NewsItem
                                        key={news.title}
                                        title={news.title}
                                        description={news.description}
                                        date={news.createdOn}
                                    />
                                ))}
                        </NewsList>
                    </ContentContainer>
                </CustomCard>
            </Grid>
        </ContentLoader>
    );
};

// TODO: create reusable custom card with Title prop to prevent repeat of this TitleContainer styled component
const TitleContainer = styled.div`
    background: ${glassColors.mainPrimary};
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
