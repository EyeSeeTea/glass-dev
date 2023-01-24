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
    moduleColor: string;
    endDays?: number | null;
    filesUploaded: number;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ title, moduleColor, endDays, filesUploaded }) => {
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
    button {
        background-color: ${props => props.moduleColor};
        &:hover {
            background-color: ${props => props.moduleColor};
            box-shadow: none;
        }
    }
`;
