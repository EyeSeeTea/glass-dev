import React from "react";
import { Button } from "@material-ui/core";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";



export const SupportButtons: React.FC = () => {

    return (
        <ContentWrapper>            
            <div>
                <span>I need help</span>
                <Button>Submit Help Ticket</Button>
            </div>
            <div>
                <span>I can fix this by myself</span>
                <Button>Upload New Data Files</Button>
            </div>
            <div>
                <span>I&apos;ll fix it later</span>
                <Button>OK</Button>
            </div>
        </ContentWrapper>
    )

}

const ContentWrapper = styled.div`
    > div {
        span {
            font-weight: 300px;
        }
    }
`