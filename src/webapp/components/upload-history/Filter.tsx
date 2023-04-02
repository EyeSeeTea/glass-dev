import styled from "styled-components";
import { Box, FormControl, MenuItem, Select, Typography, InputLabel, withStyles, makeStyles } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Dispatch, SetStateAction } from "react";

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
        label: "2022",
        value: 2022,
    },
    {
        label: "2021",
        value: 2021,
    },
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
];

const statusOptions = [
    {
        label: "Uploaded",
        value: "Uploaded",
    },
    {
        label: "Completed",
        value: "Completed",
    },
];

interface FilterProps {
    year: number;
    setYear: Dispatch<SetStateAction<number>>;
    status: string;
    setStatus: Dispatch<SetStateAction<string>>;
}
export const Filter: React.FC<FilterProps> = ({ year, setYear, status, setStatus }) => {
    const classes = useStyles();
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
