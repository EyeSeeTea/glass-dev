import React from "react";
import { Grid, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../../custom-card/CustomCard";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { useNotifications } from "./useNotifications";
import { useAppContext } from "../../../contexts/app-context";
import { ContentLoader } from "../../content-loader/ContentLoader";
import moment from "moment";

export const YourNotifications: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const notifications = useNotifications(compositionRoot);

    return (
        <ContentLoader content={notifications}>
            {notifications.kind === "loaded" && notifications.data.length ? (
                <Grid item xs={12}>
                    <CustomCard>
                        <TitleContainer>
                            <Typography variant="h5">{i18n.t("Your Notifications")}</Typography>
                        </TitleContainer>

                        <NotificationsList>
                            {notifications.data.map(notification => {
                                return (
                                    <Item key={notification.id}>
                                        <span className="date">{moment(notification.date).format("MM/DD/YYYY")}</span>
                                        <p className="summary">{notification.message}</p>
                                        <button>
                                            <ChevronRightIcon />
                                        </button>
                                    </Item>
                                );
                            })}
                        </NotificationsList>
                    </CustomCard>
                </Grid>
            ) : (
                <StyledNoData>{i18n.t("No notifications")}</StyledNoData>
            )}
        </ContentLoader>
    );
};

// TODO: create reusable custom card with Title prop to prevent repeat of this TitleContainer styled component
const TitleContainer = styled.div`
    background: ${glassColors.mainPrimary};
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
    color: ${glassColors.greyBlack};
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
        margin-left: auto;
        svg {
            color: ${glassColors.greyBlack};
        }
    }
`;

const StyledNoData = styled(Typography)`
    padding-left: 20px;
`;
