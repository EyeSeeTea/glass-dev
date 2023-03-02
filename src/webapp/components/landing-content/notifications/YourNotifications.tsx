import React, { useCallback, useState } from "react";
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
import { NotificationDialog } from "./NotificationDialog";

export const YourNotifications: React.FC = () => {
    const [notificationToOpen, setNotificationToOpen] = useState<string | undefined>(undefined);

    const { compositionRoot } = useAppContext();

    const notifications = useNotifications(compositionRoot);

    const openNotification = useCallback((id: string) => {
        setNotificationToOpen(id);
    }, []);

    const closeNotification = useCallback(() => {
        setNotificationToOpen(undefined);
    }, []);

    return (
        <>
            <ContentLoader content={notifications}>
                <Grid item xs={12}>
                    {notifications.kind === "loaded" && notifications.data.length ? (
                        <CustomCard>
                            <TitleContainer>
                                <Typography variant="h5">{i18n.t("Your Notifications")}</Typography>
                            </TitleContainer>

                            <NotificationsList>
                                {notifications.data.map(notification => {
                                    return (
                                        <Item key={notification.id} onClick={() => openNotification(notification.id)}>
                                            <span className="date">
                                                {moment(notification.date).format("MM/DD/YYYY")}
                                            </span>
                                            <p className="summary">{notification.subject}</p>
                                            <button>
                                                <ChevronRightIcon />
                                            </button>
                                        </Item>
                                    );
                                })}
                            </NotificationsList>
                        </CustomCard>
                    ) : (
                        <Typography>{i18n.t("No notifications")}</Typography>
                    )}
                </Grid>
            </ContentLoader>

            {notificationToOpen && (
                <NotificationDialog isOpen={true} onCancel={closeNotification} notificationId={notificationToOpen} />
            )}
        </>
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
