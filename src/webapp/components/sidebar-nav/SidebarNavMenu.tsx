/* eslint-disable react/no-multi-comp */
/* eslint-disable react/display-name */
import React from "react";
import { NavLink } from "react-router-dom";
import { makeStyles } from "@material-ui/styles";
import { ListItem, Button, colors, Theme, Typography } from "@material-ui/core";
import clsx from "clsx";
import { MenuLeaf } from "./SidebarNav";
import { glassColors } from "../../pages/app/themes/dhis2.theme";

interface SidebarNavProps {
    className?: string;
    menu: MenuLeaf;
}

const SidebarNavMenu: React.FC<SidebarNavProps> = ({ menu, className }) => {
    const classes = useStyles(menu.level);

    return (
        <ListItem className={clsx(classes.root, className)} disableGutters style={{ paddingLeft: menu.level * 8 }}>
            <Button
                activeClassName={classes.active}
                className={classes.button}
                component={NavLink}
                to={menu.path}
                exact={true}
            >
                <div className={classes.icon}>{menu.icon}</div>
                <Typography variant="body1" style={{ color: glassColors.greyBlack }}>
                    {menu.title}
                </Typography>
            </Button>
        </ListItem>
    );
};

export default SidebarNavMenu;

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        padding: theme.spacing(0),
    },
    button: {
        color: colors.pink[800],
        padding: "10px 8px",
        justifyContent: "flex-start",
        textTransform: "none",
        letterSpacing: 0,
        width: "100%",
    },
    icon: {
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        marginRight: theme.spacing(1),
    },
    active: {
        color: theme.palette.primary.main,
        "& $icon": {
            color: theme.palette.primary.main,
        },
    },
}));
