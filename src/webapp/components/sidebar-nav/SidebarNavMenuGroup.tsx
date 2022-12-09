import React from "react";
import { makeStyles } from "@material-ui/styles";
import { List, ListItem, Theme, Collapse, Button, colors } from "@material-ui/core";
import clsx from "clsx";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { MenuGroup } from "./SidebarNav";
import SidebarNavMenu from "./SidebarNavMenu";
import styled from "styled-components";

interface SidebarNavProps {
    className?: string;
    groupName?: string;
    menu: MenuGroup;
}

const SidebarNavMenuGroup: React.FC<SidebarNavProps> = ({ menu, groupName, className }) => {
    const classes = useStyles(menu.level);

    const [openCollapse, setOpenCollapse] = React.useState(false);

    const handleExpand = () => {
        setOpenCollapse(!openCollapse);
    };

    console.log("SidebarNavMenuGroup menu: ", menu);

    return (
        <React.Fragment>
            <ListItem
                className={clsx(classes.root, className)}
                onClick={handleExpand}
                disableGutters
                style={{ paddingLeft: menu.level * 8 }}
            >
                <Button className={classes.button} fullWidth={true}>
                    <div className={classes.icon}>{menu.icon}</div>
                    <span className={classes.title}>{menu.title}</span>

                    <div className={classes.expand}>{openCollapse ? <ExpandLess /> : <ExpandMore />}</div>
                </Button>
            </ListItem>

            <ModuleWrap moduleColor={menu.moduleColor}>
                <Collapse in={openCollapse} timeout="auto" unmountOnExit key={menu.title}>
                    <List component="div" disablePadding data-group-name={groupName}>
                        {menu.children &&
                            menu.children.map(child =>
                                child.kind === "MenuGroup" ? (
                                    <SidebarNavMenuGroup menu={child} key={child.title} />
                                ) : (
                                    <SidebarNavMenu menu={child} key={child.title} />
                                )
                            )}
                    </List>
                </Collapse>
            </ModuleWrap>
        </React.Fragment>
    );
};

export default SidebarNavMenuGroup;

const useStyles = makeStyles((theme: Theme) => ({
    root: { padding: theme.spacing(0) },
    button: {
        color: colors.blueGrey[800],
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
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(1),
    },
    title: {
        textAlign: "start",
        flexGrow: 1,
        marginLeft: theme.spacing(4),
    },
    expand: {
        marginRight: theme.spacing(4),
    },
}));

const ModuleWrap = styled.div<{ moduleColor: string }>`
    a[data-is-page-current="true"] {
        background: ${props => props.moduleColor};
        * {
            color: white !important;
        }
    }
`;
