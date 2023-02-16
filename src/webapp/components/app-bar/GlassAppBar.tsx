import React, { useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import MenuIcon from "@material-ui/icons/Menu";
import LocationIcon from "@material-ui/icons/LocationOn";
import whoLogo from "../../assets/who-logo-blue.png";
import glassLogo from "../../assets/glass-logo.png";
import { Box, MenuItem, Select } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";

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

export const GlassAppBar: React.FC = () => {
    const classes = useStyles();

    const { currentUser } = useAppContext();
    const { currentOrgUnitAccess, changeCurrentOrgUnitAccess } = useCurrentOrgUnitContext();
    const [action, setAction] = React.useState(1);

    const [orgUnit, setOrgUnit] = React.useState(currentOrgUnitAccess.orgUnitName);

    useEffect(() => {
        if (orgUnit !== currentOrgUnitAccess.orgUnitName) {
            //if orgUnit has been changed manually in url
            setOrgUnit(currentOrgUnitAccess.orgUnitName);
        }
    }, [orgUnit, setOrgUnit, currentOrgUnitAccess.orgUnitName]);

    const changeOrgUnit = (e: React.ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
        if (e.target?.value) setOrgUnit(e.target?.value as string);
        const orgUnitId = (e.currentTarget as HTMLInputElement).getAttribute("data-key");
        if (orgUnitId) changeCurrentOrgUnitAccess(orgUnitId);
    };

    const changeAction = (event: React.ChangeEvent<{ value: unknown }>) => {
        setAction(event.target.value as number);
    };

    return (
        <div className={classes.root}>
            <AppBar position="static">
                <Toolbar className={`${classes.toolbar}`}>
                    <IconButton edge="start" className={classes.menuButton} color="primary" aria-label="open drawer">
                        <MenuIcon />
                    </IconButton>
                    <LogoContainer>
                        <img src={glassLogo} width={150} alt="Glass logo" />;
                    </LogoContainer>
                    <LogoContainer>
                        <img src={whoLogo} width={150} alt="WHO logo" />;
                    </LogoContainer>
                    <Box className={classes.title} />
                    <SelectContainer>
                        <IconButton aria-label="search" color="primary">
                            <LocationIcon />
                        </IconButton>
                        {currentUser?.userOrgUnitsAccess && (
                            <Select value={orgUnit} disableUnderline onChange={e => changeOrgUnit(e)}>
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
