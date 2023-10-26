import styled from "styled-components";
import { Box, FormControl, MenuItem, Select, Typography, InputLabel, withStyles, makeStyles } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Dispatch, SetStateAction } from "react";
import { getLastNYears, getLastNYearsQuarters } from "../../../utils/currentPeriodHelper";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useAppContext } from "../../contexts/app-context";

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

const statusOptions = [
    {
        label: "Uploaded",
        value: "Uploaded",
    },
    {
        label: "Imported",
        value: "Imported",
    },
    {
        label: "Validated",
        value: "Validated",
    },
    {
        label: "Completed",
        value: "Completed",
    },
];

interface FilterProps {
    year: string;
    setYear: Dispatch<SetStateAction<string>>;
    status: string;
    setStatus: Dispatch<SetStateAction<string>>;
}

export const Filter: React.FC<FilterProps> = ({ year, setYear, status, setStatus }) => {
    const classes = useStyles();
    const { currentUser } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();

    const yearOptions: { label: string; value: string }[] = [];
    if (currentUser.quarterlyPeriodModules.find(qm => qm.name === currentModuleAccess.moduleName)) {
        getLastNYearsQuarters().forEach(quarter => {
            yearOptions.push({ label: quarter, value: quarter });
        });
    } else {
        const addCurrentYear = currentModuleAccess.populateCurrentYearInHistory;
        getLastNYears(addCurrentYear).forEach(year => {
            yearOptions.push({ label: year, value: year });
        });
    }
    return (
        <Box mb={5}>
            <BlackTypography variant="h5">{i18n.t("Filters")}</BlackTypography>
            <Box>
                <FormControl className={classes.formControl}>
                    <StyledInputLabel id="year-label">{i18n.t("Select Year")}</StyledInputLabel>
                    <Select
                        labelId="year-label"
                        value={year}
                        onChange={e => setYear(e.target.value as string)}
                        MenuProps={{ disableScrollLock: true }}
                    >
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
                        MenuProps={{ disableScrollLock: true }}
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
