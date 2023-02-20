import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/styles";
import { List, ListItem, Theme, Collapse, Button, colors } from "@material-ui/core";
import clsx from "clsx";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { MenuGroup } from "./SidebarNav";
import SidebarNavMenu from "./SidebarNavMenu";
import styled from "styled-components";
import FolderIcon from "@material-ui/icons/Folder";
import i18n from "@eyeseetea/d2-ui-components/locales";

import { useCurrentModuleContext } from "../../contexts/current-module-context";
interface SidebarNavProps {
    className?: string;
    groupName: string;
    menu: MenuGroup;
}

const SidebarNavMenuGroup: React.FC<SidebarNavProps> = ({ menu, groupName, className }) => {
    const classes = useStyles(menu.level);

    const { currentModuleAccess } = useCurrentModuleContext();

    const isCurrent = (name: string) => {
        return currentModuleAccess.moduleName === name;
    };
    const [expanded, setExpanded] = React.useState(isCurrent(groupName));

    useEffect(() => {
        if (currentModuleAccess.moduleName === menu.title) {
            setExpanded(true);
        }
    }, [menu.title, currentModuleAccess.moduleName]);

    const toggleExpanded = () => {
        setExpanded(!expanded);
    };

    return (
        <React.Fragment>
            <ListItem
                className={clsx(classes.root, className)}
                onClick={toggleExpanded}
                disableGutters
                data-current-module={module}
                data-current-group-name={menu.title}
                style={{ paddingLeft: menu.level * 8 }}
            >
                <Button className={classes.button} fullWidth={true}>
                    <div className={classes.icon}>
                        <FolderIcon htmlColor={menu.moduleColor} />
                    </div>
                    {/* {`${moduleName} | ${currentNavItem.groupName} | ${groupName}`} */}
                    <span className={classes.title}>{i18n.t(menu.title)}</span>
                    <div className={classes.expand}>{expanded ? <ExpandLess /> : <ExpandMore />}</div>
                </Button>
            </ListItem>

            <ModuleWrap moduleColor={menu.moduleColor}>
                <Collapse in={expanded} timeout="auto" unmountOnExit key={menu.title}>
                    <List component="div" disablePadding data-group-name={groupName}>
                        {menu.children &&
                            menu.children.map(child =>
                                child.kind === "MenuGroup" ? (
                                    <SidebarNavMenuGroup menu={child} key={child.title} groupName={groupName} />
                                ) : (
                                    <SidebarNavMenu menu={child} key={child.title} groupName={groupName} />
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
        marginLeft: "10px",
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
