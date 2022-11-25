import React from "react";
import { Box, Button, Container, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import StarIcon from "@material-ui/icons/Star";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import WarningIcon from "@material-ui/icons/WarningOutlined";
import i18n from "../../../locales";

interface ModuleCardProps {
    title: string;
    titleColor: string;
    iconColor: string;
    endDays?: number;
    filesUploaded: number;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ title, titleColor, iconColor, endDays, filesUploaded }) => {
    return (
        <CustomCard padding="10px">
            <TitleContainer>
                <StarIcon htmlColor={iconColor} fontSize="large" />
                <Box width={10} />
                <Title textColor={titleColor} variant="h5">
                    {title}
                </Title>
            </TitleContainer>
            <ContentContainer>
                <Container style={{ padding: 0 }}>
                    {endDays ? (
                        <Box display={"flex"} flexDirection="row">
                            <WarningIcon htmlColor={glassColors.mainTertiary} />
                            <Box width={10} />
                            <Typography
                                style={{ color: glassColors.mainTertiary }}
                            >{`END IN ${endDays} DAYS`}</Typography>
                        </Box>
                    ) : (
                        <Typography color="textSecondary">{"OPEN ALL YEAR"}</Typography>
                    )}
                    <Typography color="textSecondary">{`${filesUploaded} files uploaded`}</Typography>
                </Container>

                <Button variant="contained" color="primary">
                    {i18n.t("GO")}
                </Button>
            </ContentContainer>
        </CustomCard>
    );
};

const TitleContainer = styled.div`
    border-radius: 10px;
    padding: 0px 10px;
    margin: 12px;
    display: flex;
    flex-direction: row;
`;

const Title = styled(Typography)<{ textColor: string }>`
    color: ${props => props.textColor};
    font-weight: bold;
`;

const ContentContainer = styled.div`
    border-radius: 10px;
    padding: 0px 10px;
    margin: 12px 20px;
    display: flex;
    flex-direction: row;
    justifycontent: space-between;
`;
