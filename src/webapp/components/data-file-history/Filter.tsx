import styled from "styled-components";
import { Box, FormControl, MenuItem, Select, Typography, InputLabel, withStyles, makeStyles } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Dispatch, SetStateAction, useMemo } from "react";
import {
    getCurrentYear,
    getLastNYears,
    getLastNYearsQuarters,
    getRangeOfYears,
} from "../../../utils/currentPeriodHelper";
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

export type Status = "All" | "Uploaded" | "Imported" | "Validated" | "Completed";

type StatusOption = {
    value: Status;
    label: string;
};

export const ALL_FILTER_VALUE = "All";

const statusOptions: StatusOption[] = [
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
    {
        label: ALL_FILTER_VALUE,
        value: ALL_FILTER_VALUE,
    },
];

export type yearFilterValue = "All" | string;

type YearOption = {
    value: yearFilterValue;
    label: string;
};

interface FilterProps {
    year: string;
    setYear: Dispatch<SetStateAction<string>>;
    status: string;
    setStatus: Dispatch<SetStateAction<Status>>;
}

export const Filter: React.FC<FilterProps> = ({ year, setYear, status, setStatus }) => {
    const classes = useStyles();
    const { currentUser } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();

    const yearOptions: YearOption[] = useMemo(() => {
        if (currentUser.quarterlyPeriodModules.find(qm => qm.name === currentModuleAccess.moduleName)) {
            const quarters = getLastNYearsQuarters().map(quarter => ({ label: quarter, value: quarter }));
            return [...quarters, { label: "All", value: "All" }];
        } else {
            const addCurrentYear = currentModuleAccess.populateCurrentYearInHistory;
            const years = currentModuleAccess.startPeriod
                ? getRangeOfYears(
                      addCurrentYear ? getCurrentYear() : getCurrentYear() - 1,
                      currentModuleAccess.startPeriod
                  )
                : getLastNYears(addCurrentYear);
            return [...years.map(year => ({ label: year, value: year })), { label: "All", value: "All" }];
        }
    }, [
        currentModuleAccess.moduleName,
        currentModuleAccess.populateCurrentYearInHistory,
        currentModuleAccess.startPeriod,
        currentUser.quarterlyPeriodModules,
    ]);

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
                        onChange={e => setStatus(e.target.value as Status)}
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
