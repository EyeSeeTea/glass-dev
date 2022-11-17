import React from "react";
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
}));

export const GlassAppBar: React.FC = () => {
    const classes = useStyles();

    const [country, setCountry] = React.useState(1);
    const [action, setAction] = React.useState(1);

    const handleCountryChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setCountry(event.target.value as number);
    };

    const handleActionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setAction(event.target.value as number);
    };

    return (
        <div className={classes.root}>
            <AppBar position="static">
                <Toolbar className={classes.toolbar}>
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
                        <Select value={country} disableUnderline onChange={handleCountryChange}>
                            <MenuItem value={1}>Spain</MenuItem>
                            <MenuItem value={2}>France</MenuItem>
                        </Select>
                    </SelectContainer>
                    <SelectContainer>
                        <Select value={action} disableUnderline onChange={handleActionChange}>
                            <MenuItem value={1}>User Profile</MenuItem>
                            <MenuItem value={2}>My Account</MenuItem>
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
