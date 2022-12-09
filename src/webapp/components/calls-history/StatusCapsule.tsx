import React from "react";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import ErrorIcon from '@material-ui/icons/Error';

export interface StatusCapsuleProps {
    status: String;
}

export const StatusCapsule: React.FC<StatusCapsuleProps> = ({ status }) => {
    switch (status) {
        case "approved":
            return <Approved>{status.toUpperCase()}</Approved>;
        case "waiting WHO approval":
            return <Approved>{status}</Approved>;
        case "not submitted":
            // eslint-disable-next-line react/jsx-no-undef
            return <Warning><ErrorIcon /> {status}</Warning>;
        default: 
            return <span>status</span>;
    }
};

const Approved = styled.div`
    color: ${glassColors.green};
    text-transform: capitalize;
`;

const Warning = styled.div`
    color: ${glassColors.red};
    text-transform: capitalize;
    display: inline-flex;
    align-items: center;
    gap: 10px;
`;
