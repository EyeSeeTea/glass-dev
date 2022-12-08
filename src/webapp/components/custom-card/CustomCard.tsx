import React from "react";
import { Box } from "@material-ui/core";
import { Paper } from "material-ui";
import styled from "styled-components";

interface CustomCardProps {
    minheight?: string;
    height?: string;
    padding?: string;
}

export const CustomCard: React.FC<CustomCardProps> = ({ minheight, padding, children, height = "auto" }) => {
    return (
        <StyleCard minheight={minheight} padding={padding} height={height}>
            <Box display="flex" flexDirection="column" justifyContent="space-between" height={"100%"}>
                {children}
            </Box>
        </StyleCard>
    );
};

export const StyleCard = styled(Paper)<CustomCardProps>`
    border-radius: 20px !important;
    min-height: ${props => props.minheight};
    height: ${props => props.height};
    padding: ${props => props.padding};
    overflow: hidden;
`;
