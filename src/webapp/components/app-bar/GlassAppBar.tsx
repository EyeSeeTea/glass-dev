import React, { useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import MenuIcon from "@material-ui/icons/Menu";
import LocationIcon from "@material-ui/icons/LocationOn";
import whoLogo from "../../assets/who-logo-blue.png";
import glassLogo from "../../assets/glass-logo.png";
import { Avatar, Badge, Box, ListItemIcon, ListItemText, Menu, MenuItem, Select } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import MailOutlineIcon from "@material-ui/icons/MailOutline";
import { useNotifications } from "../landing-content/notifications/useNotifications";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useHistory } from "react-router-dom";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import SettingsIcon from "@material-ui/icons/Settings";

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
    const notifications = useNotifications(compositionRoot);

    const [anchorEl, setAnchorEl] = React.useState(null);
    const [orgUnitName, setOrgUnitName] = React.useState(currentOrgUnitAccess.orgUnitName);

    const { api } = useAppContext();
    const baseUrl = api.baseUrl;

    const nameInitials = (name: string): string => {
        const nameArray = name.split(" ");
        if (nameArray.length > 2) {
            return `${nameArray[0]?.charAt(0)}${nameArray[nameArray.length - 1]?.charAt(0)}`;
        } else {
            return nameArray.map(name => name.charAt(0)).join("");
        }
    };

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

    const handleClick = (event: React.BaseSyntheticEvent) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (url?: string) => {
        setAnchorEl(null);
        if (url) {
            history.push(url);
        }
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
                        <a href={`${baseUrl}/api/apps/Home-Page/index.html#/glass-hq`}>
                            <LogoContainer>
                                <img src={glassLogo} width={150} alt="Glass logo" />
                            </LogoContainer>
                        </a>

                        <a href={`${baseUrl}/api/apps/Home-Page/index.html#/glass-hq`}>
                            <LogoContainer>
                                <img src={whoLogo} width={150} alt="WHO logo" />
                            </LogoContainer>
                        </a>
                        <Box className={classes.title} />
                        {notifications.kind === "loaded" && notifications.data.length && (
                            <IconButton aria-label="notifications" color="primary" onClick={() => history.push("/")}>
                                <Badge badgeContent={notifications.data.length} color="primary">
                                    <MailOutlineIcon />
                                </Badge>
                            </IconButton>
                        )}
                        <SelectContainer>
                            <IconButton aria-label="search" color="primary">
                                <LocationIcon />
                            </IconButton>
                            {currentUser?.userOrgUnitsAccess && (
                                <Select
                                    value={orgUnitName}
                                    disableUnderline
                                    onChange={changeOrgUnit}
                                    MenuProps={{ disableScrollLock: true }}
                                >
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
                            <AvatarContainer id="demo-positioned-button" onClick={handleClick}>
                                <Avatar style={{ backgroundColor: glassColors.accentPrimary }}>
                                    {nameInitials(currentUser.name)}
                                </Avatar>
                                {anchorEl ? (
                                    <KeyboardArrowUpIcon color="primary" />
                                ) : (
                                    <KeyboardArrowDownIcon color="primary" />
                                )}
                            </AvatarContainer>
                            <Menu
                                id="simple-menu"
                                aria-labelledby="demo-positioned-button"
                                anchorEl={anchorEl}
                                keepMounted
                                open={Boolean(anchorEl)}
                                onClose={() => handleClose()}
                                anchorOrigin={{
                                    vertical: "bottom",
                                    horizontal: "left",
                                }}
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "left",
                                }}
                                disableScrollLock={true}
                            >
                                <MenuItem onClick={() => handleClose("/user-profile")}>
                                    <ListItemIcon>
                                        <PersonOutlineIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={i18n.t("Profile")} />
                                </MenuItem>
                                <MenuItem onClick={() => handleClose("/user-settings")}>
                                    <ListItemIcon>
                                        <SettingsIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={i18n.t("Settings")} />
                                </MenuItem>
                            </Menu>
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

const AvatarContainer = styled.div`
    display: flex;
    align-items: center;
    :hover {
        cursor: pointer;
    }
`;
