import { useState } from "react";
import styled from "styled-components";
import { Box, FormControl, MenuItem, Select, Typography, InputLabel, withStyles, makeStyles } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";

const useStyles = makeStyles(theme => ({
    formControl: {
        margin: theme.spacing(1),
        minWidth: 150,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

const BlackTypography = withStyles({
    root: {
        color: `${glassColors.black}`,
        marginBottom: "15px",
    },
})(Typography);

const StyledInputLabel = styled(InputLabel)`
    font-size: 18px;
    color: ${glassColors.black};
`;

const yearOptions = [
    {
        label: "2020",
        value: 2020,
    },
    {
        label: "2019",
        value: 2019,
    },
    {
        label: "2018",
        value: 2018,
    },
    {
        label: "2017",
        value: 2017,
    },
    {
        label: "2016",
        value: 2016,
    },
];

const statusOptions = [
    {
        label: "Draft",
        value: "draft",
    },
    {
        label: "Not Completed",
        value: "not_completed",
    },
    {
        label: "Completed",
        value: "completed",
    },
];

export const Filter: React.FC = () => {
    const classes = useStyles();
    const [year, setYear] = useState(2020);
    const [status, setStatus] = useState("draft");

    return (
        <Box mb={5}>
            <BlackTypography variant="h5">{i18n.t("Filters")}</BlackTypography>
            <Box>
                <FormControl className={classes.formControl}>
                    <StyledInputLabel id="year-label">{i18n.t("Select Year")}</StyledInputLabel>
                    <Select labelId="year-label" value={year} onChange={e => setYear(e.target.value as number)}>
                        {yearOptions.map(yearItem => (
                            <MenuItem key={yearItem.value} value={yearItem.value}>
                                {i18n.t(yearItem.label)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl className={classes.formControl}>
                    <StyledInputLabel id="status">{i18n.t("Select Status")}</StyledInputLabel>
                    <Select
                        labelId="status"
                        value={status}
                        label="Select Status"
                        onChange={e => setStatus(e.target.value as string)}
                    >
                        {statusOptions.map(statusItem => (
                            <MenuItem key={statusItem.value} value={statusItem.value}>
                                {i18n.t(statusItem.label)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        </Box>
    );
};
