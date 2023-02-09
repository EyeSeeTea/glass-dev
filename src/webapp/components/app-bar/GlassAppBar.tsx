import React, { useContext, useEffect } from "react";
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
import { CurrentAccessContext } from "../../contexts/current-access-context";

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
    const { currentOrgUnitAccess, changeCurrentOrgUnitAccess } = useContext(CurrentAccessContext);
    const [action, setAction] = React.useState(1);

    const [orgUnit, setOrgUnit] = React.useState(currentOrgUnitAccess.name);

    useEffect(() => {
        //If the currentOrgUnitAccess is not yet set, then set it
        if (currentOrgUnitAccess?.id === "") {
            //Set the first org unit in list as default
            const defaultOrgUnit = currentUser.userOrgUnitsAccess?.at(0);
            if (defaultOrgUnit) {
                changeCurrentOrgUnitAccess(defaultOrgUnit);
                setOrgUnit(defaultOrgUnit.name);
            }
        }
    }, [setOrgUnit, currentOrgUnitAccess?.id, currentUser.userOrgUnitsAccess, changeCurrentOrgUnitAccess]);

    const changeOrgUnit = (orgUnit: unknown) => {
        setOrgUnit(orgUnit as string);
        const currentOrgUnitAccess = currentUser.userOrgUnitsAccess?.find(ou => ou.name === orgUnit);
        if (currentOrgUnitAccess) changeCurrentOrgUnitAccess(currentOrgUnitAccess);
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
                            <Select value={orgUnit} disableUnderline onChange={e => changeOrgUnit(e?.target?.value)}>
                                {currentUser.userOrgUnitsAccess.map(orgUnit => (
                                    <MenuItem key={orgUnit.id} value={orgUnit.name}>
                                        {i18n.t(orgUnit.name)}
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
