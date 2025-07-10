import i18n from "@eyeseetea/d2-ui-components/locales";
import { Box, ClickAwayListener, makeStyles, Tooltip, Typography } from "@material-ui/core";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import React from "react";
import { palette, muiTheme } from "../../pages/app/themes/dhis2.theme";

export type InfoTooltipProps = {
    text: string;
};
const useStyles = makeStyles(() => ({
    tooltip: {
        backgroundColor: palette.background.paper,
        boxShadow: muiTheme.shadows[1],
        color: "#212934",
        border: `1px solid ${palette.background.default}`,
    },
    icon: {
        fontSize: 18,
        marginLeft: 8,
        verticalAlign: "middle",
        cursor: "pointer",
        color: palette.shadow,
    },
}));

export const InfoTooltip: React.FC<InfoTooltipProps> = React.memo(({ text }) => {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Tooltip
                title={
                    <Box>
                        <Typography variant="subtitle2">{i18n.t("Description")}</Typography>
                        <Typography style={{ fontSize: "14px", fontWeight: "normal" }} variant="caption">
                            {text}
                        </Typography>
                    </Box>
                }
                disableHoverListener
                open={open}
                onClick={() => setOpen(!open)}
                classes={{ tooltip: classes.tooltip }}
            >
                <InfoOutlinedIcon classes={{ root: classes.icon }} tabIndex={0} aria-label="Helper information" />
            </Tooltip>
        </ClickAwayListener>
    );
});
