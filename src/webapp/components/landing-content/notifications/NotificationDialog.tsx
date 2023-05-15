import React from "react";
import { Box, List, makeStyles, Typography } from "@material-ui/core";
import DialogContent from "@material-ui/core/DialogContent";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import i18n from "../../../../locales";
import { useAppContext } from "../../../contexts/app-context";
import { useNotification } from "./useNotification";
import { ContentLoader } from "../../content-loader/ContentLoader";
import { Divider, ListItem } from "material-ui";
import styled from "styled-components";
import moment from "moment";

export interface NotificationDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    notificationId: string;
}

export const NotificationDialog: React.FC<NotificationDialogProps> = ({ isOpen, onCancel, notificationId }) => {
    const classes = useStyles();

    const { compositionRoot, currentUser } = useAppContext();

    const notification = useNotification(compositionRoot, notificationId);

    return (
        <React.Fragment>
            <ConfirmationDialog
                isOpen={isOpen}
                title={i18n.t("Notification")}
                onCancel={onCancel}
                cancelText={i18n.t("Close")}
                maxWidth={"lg"}
                fullWidth={true}
                disableEnforceFocus
            >
                <DialogContent className={classes.content}>
                    <ContentLoader content={notification}>
                        {notification.kind === "loaded" && (
                            <>
                                <ParticipantsContainer>
                                    <Typography gutterBottom>{i18n.t("Participants")}</Typography>
                                    <Box height={10} />
                                    {notification.data.users?.map(user => {
                                        const username = user.id === currentUser.id ? i18n.t("Me") : user.name;

                                        return (
                                            <Pin key={user.id}>
                                                <Typography display="inline">{username}</Typography>
                                            </Pin>
                                        );
                                    })}
                                </ParticipantsContainer>
                                <Divider />
                                <MessagesContainer>
                                    <List>
                                        {notification.data.messages?.map((message, index) => {
                                            const messageCount = notification.data.messages?.length || 0;

                                            return (
                                                <>
                                                    <ListItem key={message.date}>
                                                        <MessageHeader>
                                                            <Typography gutterBottom>
                                                                {i18n.t(`Message from {{sender}}`, {
                                                                    sender: message.sender,
                                                                })}
                                                            </Typography>

                                                            <Typography gutterBottom>
                                                                {moment(message.date).format("MM/DD/YYYY")}
                                                            </Typography>
                                                        </MessageHeader>
                                                        <Typography variant="body2">{message.text}</Typography>
                                                    </ListItem>
                                                    {index < messageCount - 1 && <Divider />}
                                                </>
                                            );
                                        })}
                                    </List>
                                </MessagesContainer>
                            </>
                        )}
                    </ContentLoader>
                </DialogContent>
            </ConfirmationDialog>
        </React.Fragment>
    );
};

const useStyles = makeStyles({
    content: {
        paddingTop: 0,
    },
});

const MessagesContainer = styled.div`
    margin-top: 32px;
    padding: 32px 16px;
`;

const MessageHeader = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: 32px;
`;

const ParticipantsContainer = styled.div`
    padding: 16px;
`;

const Pin = styled.div`
    display: inline;
    border-radius: 20px;
    background: lightgray;
    padding: 8px 16px;
    margin-top: 32px;
    margin-right: 16px;
`;
