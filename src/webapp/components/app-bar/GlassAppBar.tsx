import React, { useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import MenuIcon from "@material-ui/icons/Menu";
import LocationIcon from "@material-ui/icons/LocationOn";
import whoLogo from "../../assets/who-logo-blue.png";
import glassLogo from "../../assets/glass-logo.png";
import { Badge, Box, MenuItem, Select } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import NotificationsIcon from "@material-ui/icons/Notifications";
import { useNotifications } from "../landing-content/notifications/useNotifications";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useHistory } from "react-router-dom";

const DHIS2_HOMEPAGE_URL = process.env.REACT_APP_DHIS2_BASE_URL;

const useStyles = makeStyles(theme => ({
    root: {
        flexGrow: 1,
    },
    menuButton: {
        marginRight: theme.spacing(2),
    },
    toolbar: {
        background: "white",
        minHeight: 70,
        alignItems: "center",
        paddingTop: theme.spacing(1),
        paddingBottom: theme.spacing(2),
    },
    title: {
        flexGrow: 1,
        alignSelf: "flex-end",
    },
    isDark: {
        background: "black",
    },
}));

interface GlassAppBarProps {
    toggleShowMenu: () => void;
}
export const GlassAppBar: React.FC<GlassAppBarProps> = ({ toggleShowMenu }) => {
    const classes = useStyles();
    const history = useHistory();

    const { currentUser, compositionRoot } = useAppContext();
    const { currentOrgUnitAccess, changeCurrentOrgUnitAccess } = useCurrentOrgUnitContext();
    const [action, setAction] = React.useState(1);

    const [orgUnitName, setOrgUnitName] = React.useState(currentOrgUnitAccess.orgUnitName);

    const notifications = useNotifications(compositionRoot);

    useEffect(() => {
        if (orgUnitName !== currentOrgUnitAccess.orgUnitName) {
            //if orgUnit has been changed manually in url
            setOrgUnitName(currentOrgUnitAccess.orgUnitName);
        }
    }, [orgUnitName, setOrgUnitName, currentOrgUnitAccess.orgUnitName]);

    const changeOrgUnit = (e: React.ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
        if (e.target?.value) setOrgUnitName(e.target?.value as string);
        const orgUnitId = (e.currentTarget as HTMLInputElement).getAttribute("data-key");
        if (orgUnitId) changeCurrentOrgUnitAccess(orgUnitId);
    };

    const changeAction = (event: React.ChangeEvent<{ value: unknown }>) => {
        setAction(event.target.value as number);
    };

    return (
        <div className={classes.root}>
            <AppBar position="static">
                <ContentLoader content={notifications}>
                    <Toolbar className={`${classes.toolbar}`}>
                        <IconButton
                            edge="start"
                            className={classes.menuButton}
                            color="primary"
                            aria-label="open drawer"
                            onClick={toggleShowMenu}
                        >
                            <MenuIcon />
                        </IconButton>
                        <LogoContainer>
                            <img src={glassLogo} width={150} alt="Glass logo" />;
                        </LogoContainer>

                        <a href={DHIS2_HOMEPAGE_URL}>
                            <LogoContainer>
                                <img src={whoLogo} width={150} alt="WHO logo" />;
                            </LogoContainer>
                        </a>
                        <Box className={classes.title} />
                        {notifications.kind === "loaded" && notifications.data.length && (
                            <IconButton aria-label="notifications" color="primary" onClick={() => history.push("/")}>
                                <Badge badgeContent={notifications.data.length} color="primary">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        )}
                        <SelectContainer>
                            <IconButton aria-label="search" color="primary">
                                <LocationIcon />
                            </IconButton>
                            {currentUser?.userOrgUnitsAccess && (
                                <Select value={orgUnitName} disableUnderline onChange={changeOrgUnit}>
                                    {currentUser.userOrgUnitsAccess.map(orgUnit => (
                                        <MenuItem
                                            key={orgUnit.orgUnitId}
                                            data-key={orgUnit.orgUnitId}
                                            value={orgUnit.orgUnitName}
                                        >
                                            {i18n.t(orgUnit.orgUnitName)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        </SelectContainer>
                        <SelectContainer>
                            <Select value={action} disableUnderline onChange={changeAction}>
                                <MenuItem value={1}>{i18n.t("User Profile")}</MenuItem>
                                <MenuItem value={2}>{i18n.t("My Account")}</MenuItem>
                            </Select>
                        </SelectContainer>
                    </Toolbar>
                </ContentLoader>
            </AppBar>
        </div>
    );
};

const SelectContainer = styled.div`
    margin: 16px 16px;
`;

const LogoContainer = styled.div`
    margin: 10px 10px;
`;
