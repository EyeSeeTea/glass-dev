import React, { useCallback, useState } from "react";
import { CircularProgress, DialogActions, DialogContent, Grid, Typography } from "@material-ui/core";
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
import DeleteIcon from "@material-ui/icons/Delete";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";

export const YourNotifications: React.FC = () => {
    const [notificationToOpen, setNotificationToOpen] = useState<string | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);
    const [open, setOpen] = React.useState(false);
    const [selectedNotification, setSelectedNotification] = useState("");
    const {
        compositionRoot,
        currentUser: { id: userId },
    } = useAppContext();

    const { notifications, refreshUploads } = useNotifications(compositionRoot);
    const snackbar = useSnackbar();

    const openNotification = useCallback((id: string) => {
        setNotificationToOpen(id);
    }, []);

    const closeNotification = useCallback(() => {
        setNotificationToOpen(undefined);
    }, []);

    const deleteNotification = () => {
        setIsDeleting(true);
        compositionRoot.notifications.delete(selectedNotification, userId).run(
            () => {
                snackbar.success(i18n.t("Notification deleted successfully"));
                setIsDeleting(false);
                refreshUploads({});
                setOpen(false);
            },
            error => {
                snackbar.warning(i18n.t(error));
                setIsDeleting(false);
                setOpen(false);
            }
        );
    };

    return (
        <>
            <ContentLoader content={notifications}>
                <Grid item xs={12}>
                    {notifications.kind === "loaded" && notifications.data.length > 0 && (
                        <CustomCard>
                            <TitleContainer>
                                <Typography variant="h5">{i18n.t("Your Notifications")}</Typography>
                            </TitleContainer>

                            <NotificationsList>
                                {notifications.data.map(notification => {
                                    return (
                                        <Item key={notification.id}>
                                            <DetailsContainer onClick={() => openNotification(notification.id)}>
                                                <span className="date">
                                                    {moment(notification.date).format("MM/DD/YYYY")}
                                                </span>
                                                <p className="summary">{notification.subject}</p>
                                            </DetailsContainer>
                                            <ButtonsContainer>
                                                <button onClick={() => openNotification(notification.id)}>
                                                    <ChevronRightIcon />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedNotification(notification.id);
                                                        setOpen(true);
                                                    }}
                                                    style={{}}
                                                >
                                                    <StyledDeleteIcon />
                                                </button>
                                            </ButtonsContainer>
                                        </Item>
                                    );
                                })}
                            </NotificationsList>
                        </CustomCard>
                    )}
                </Grid>
            </ContentLoader>

            {notificationToOpen && (
                <NotificationDialog isOpen={true} onCancel={closeNotification} notificationId={notificationToOpen} />
            )}
            <ConfirmationDialog
                isOpen={open}
                title={i18n.t("Notification")}
                onSave={deleteNotification}
                onCancel={() => setOpen(false)}
                saveText={i18n.t("Yes")}
                cancelText={i18n.t("Cancel")}
                fullWidth={true}
                disableEnforceFocus
            >
                <DialogContent>
                    <Typography>{i18n.t("Are you sure you want to delete this notification?")}</Typography>
                </DialogContent>
                <DialogActions>{isDeleting && <CircularProgress size={25} />}</DialogActions>
            </ConfirmationDialog>
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

const DetailsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 20px;
`;

const ButtonsContainer = styled.div`
    display: flex;
    margin-left: auto;
    gap: 20px;
`;

const StyledDeleteIcon = styled(DeleteIcon)`
    cursor: pointer;
`;
