import React from "react";
import { Grid, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

export const YourNotifications: React.FC = () => {
    return (
        <Grid item xs={12}>

            <CustomCard>

                <TitleContainer>
                    <Typography variant="h5">{i18n.t("Your Notifications")}</Typography>
                </TitleContainer>

                <NotificationsList>
                    
                    <Item>
                        <span className="date">1/10/2021</span>
                        <p className="summary">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque mollis metus nisi, vel ornare odio laoreet eu. </p>
                        <button><ChevronRightIcon /></button>
                    </Item>
                    <Item>
                        <span className="date">1/09/2021</span>
                        <p className="summary">Praesent ut imperdiet velit. Donec posuere lorem ac arcu vehicula luctus.</p>
                        <button><ChevronRightIcon /></button>
                    </Item>
                    <Item>
                        <span className="date">3/24/2021</span>
                        <p className="summary">Mauris pellentesque sit amet nisi sed mattis. Phasellus nulla nunc, tristique a orci sit amet, consequat sagittis leo.</p>
                        <button><ChevronRightIcon /></button>
                    </Item>

                </NotificationsList>

            </CustomCard>
        </Grid>
    );
};

const TitleContainer = styled.div`
    background: ${glassColors.lightSecondary};
    color: white;
    border-radius: 20px 20px 0px 0px;
    padding: 14px 34px;
`;

const NotificationsList = styled.div`
    background-color: white;
`;

const Item = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 20px;
    padding: 15px 30px;
    background: ${glassColors.white};
    &:not(:last-child) {
        border-bottom: 1px solid ${glassColors.greyLight};
    }
    .date {
        font-weight: 600;
    }
    .summary {

    }
    button {
        border: none;
        outline: none;
        background-color: transparent;
        svg {
            color: ${glassColors.black}
        }
    }
`;

const NewsTitle = styled(Typography)`
    color: #666666;
    font-weight: 400;
`;

const NewsContent = styled(Typography)`
    color: #606060;
    font-weight: 300;
`;
