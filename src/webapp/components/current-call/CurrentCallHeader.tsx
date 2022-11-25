import React from "react";
import { Box, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import { GlassModule } from "../../../domain/entities/GlassModule";

interface CurrentCallHeaderProps {
    module: GlassModule;
}

export const CurrentCallHeader: React.FC<CurrentCallHeaderProps> = ({ module }) => {
    return (
        <CustomCard>
            <TitleContainer background={module.color}>
                <Typography variant="h4">{module.name}</Typography>
            </TitleContainer>
            <ContentContainer>
                <CardText variant="h6">
                    {`
                    Two line description of the ${module.name} call: Lorem ipsum dolor sit amet,consectetur
                    adipiscing elit,sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
                    `}
                </CardText>
                <Box display="flex" flexDirection="row">
                    <CallCodeText variant="h5">220 YEAR CALL</CallCodeText>
                    <CallStatusContainer>NOT COMPLETED</CallStatusContainer>
                </Box>
            </ContentContainer>
        </CustomCard>
    );
};

const TitleContainer = styled.div<{ background: string }>`
    background: ${props => props.background};
    color: white;
    border-radius: 20px 20px 0px 0px;
    padding: 14px 34px;
`;

const ContentContainer = styled.div`
    padding: 30px;
`;

const CallCodeText = styled(Typography)`
    color: black;
    font-weight: bold;
    margin-right: 8px;
`;

const CardText = styled(Typography)`
    width: 70%;
    color: #606060;
    font-weight: 300;
    margin-bottom: 16px;
`;

const CallStatusContainer = styled.div`
    color: white;
    padding: 8px 16px;
    background: #e2b777;
    border-radius: 20px;
    font-weight: bold;
    fint-size: 18px;
`;
