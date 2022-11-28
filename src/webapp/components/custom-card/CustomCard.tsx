import React from "react";
import { Box } from "@material-ui/core";
import { Paper } from "material-ui";
import styled from "styled-components";

interface CustomCardProps {
    minHeight?: string;
    padding?: string;
    overflow?: string;
}

export const CustomCard: React.FC<CustomCardProps> = ({ minHeight, padding, children, overflow }) => {
    return (
        <StyleCard minHeight={minHeight} padding={padding} overflow={overflow}>
            <Box display="flex" flexDirection="column" justifyContent="space-between" height={"100%"}>
                {children}
            </Box>
        </StyleCard>
    );
};

export const StyleCard = styled(Paper)<{ minHeight?: string; padding?: string; overflow?: string }>`
    border-radius: 20px !important;
    height: ${props => props.minHeight};
    padding: ${props => props.padding};
    overflow: ${props => props.overflow || "hidden"};
`;
