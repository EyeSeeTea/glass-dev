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
    period?: number;
    status?: string;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
    title,
    moduleColor,
    endDays,
    filesUploaded,
    moduleUrl,
    period,
    status,
}) => {
    return (
        <CustomCard padding="0">
            <TitleContainer moduleColor={moduleColor}>
                <StarIcon />
                <h3>
                    {title} {period}
                </h3>{" "}
                <small>{status?.replace(/[^a-zA-Z ]/g, " ")}</small>
            </TitleContainer>
            <ContentContainer moduleColor={moduleColor}>
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
    small {
        color: white;
        opacity: 0.5;
        margin: 0 7px 0 auto;
        text-transform: capitalize;
        font-size: 12px;
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
