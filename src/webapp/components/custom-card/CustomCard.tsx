import React from "react";
import { Box } from "@material-ui/core";
import { Paper } from "material-ui";
import styled from "styled-components";

interface CustomCardProps {
    minHeight?: string;
    height?: string;
    padding?: string;
}

export const CustomCard: React.FC<CustomCardProps> = ({ minHeight, padding, children, height = "auto" }) => {
    return (
        <StyleCard minHeight={minHeight} padding={padding} height={height}>
            <Box display="flex" flexDirection="column" justifyContent="space-between" height={"100%"}>
                {children}
            </Box>
        </StyleCard>
    );
};

export const StyleCard = styled(Paper)<CustomCardProps>`
    border-radius: 20px !important;
    min-height: ${props => props.minHeight};
    height: ${props => props.height};
    padding: ${props => props.padding};
    overflow: hidden;
`;
