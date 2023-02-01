import React from "react";
import { Box, Button, Container, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import StarIcon from "@material-ui/icons/Star";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import WarningIcon from "@material-ui/icons/WarningOutlined";
import i18n from "../../../locales";
import { NavLink } from "react-router-dom";

interface ModuleCardProps {
    title: string;
    moduleColor: string;
    endDays?: number | null;
    filesUploaded: number;
    moduleUrl: string;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ title, moduleColor, endDays, filesUploaded, moduleUrl }) => {
    return (
        <CustomCard padding="0">
            <TitleContainer moduleColor={moduleColor}>
                <StarIcon />
                <h3>{title}</h3>
            </TitleContainer>
            <ContentContainer moduleColor={moduleColor}>
                <Container style={{ padding: 0 }}>
                    {endDays ? (
                        <Box display={"flex"} flexDirection="row">
                            <WarningIcon htmlColor={glassColors.mainTertiary} />
                            <Box width={10} />
                            <Typography style={{ color: glassColors.mainTertiary }}>
                                {i18n.t(`END IN ${endDays} DAYS`)}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography color="textSecondary">{i18n.t("OPEN ALL YEAR")}</Typography>
                    )}
                    <Typography color="textSecondary">{i18n.t(`${filesUploaded} files uploaded`)}</Typography>
                </Container>

                <Button variant="contained" color="primary" component={NavLink} to={moduleUrl} exact={true}>
                    <span>{i18n.t("GO")}</span>
                </Button>
            </ContentContainer>
        </CustomCard>
    );
};

const TitleContainer = styled.div<{ moduleColor: string }>`
    background-color: ${props => props.moduleColor};
    padding: 20px;
    margin: 0;
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    svg {
        color: white;
        font-size: 24px;
    }
    h3 {
        margin: 0;
        font-weight: 500;
        color: white;
        font-size: 24px;
    }
`;

const ContentContainer = styled.div<{ moduleColor: string }>`
    border-radius: 10px;
    padding: 15px 10px;
    margin: 12px 20px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: end;
    button,
    a {
        background-color: ${props => props.moduleColor};
        &:hover {
            background-color: ${props => props.moduleColor};
            box-shadow: none;
        }
    }
`;
