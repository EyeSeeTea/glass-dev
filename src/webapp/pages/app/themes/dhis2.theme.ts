import { createTheme } from "@material-ui/core/styles";

export const glassColors = {
    mainPrimary: "#0099DE",
    darkPrimary: "#4072a2",
    lightPrimary: "#ceddf2",
    mainSecondary: "#8f238a",
    darkSecondary: "#701a6c",
    lightSecondary: "#b39cc0",
    mainTertiary: "#FF681F",
    darkTertiary: "#a64818",
    lightTertiary: "#ecb390",
    mainQuaternary: "#7846ae",
    darkQuaternary: "#4f1787",
    lightQuaternary: "#c6bae0",

    accentPrimary: "#0099DE",
    accentPrimaryDark: "#004BA0",
    accentPrimaryLight: "#63A4FF",
    accentPrimaryLightest: "#EAF4FF",

    accentSecondary: "#fb8c00",
    accentSecondaryLight: "#f57c00",
    accentSecondaryDark: "#ff9800",

    black: "#000000",
    greyBlack: "#494949",
    grey: "#9E9E9E",
    greyLight: "#E0E0E0",
    greyDisabled: "#8E8E8E",
    blueGrey: "#ECEFF1",
    snow: "#F4F6F8",
    gold: "#E2B777",
    red: "#C62828",
    green: "#7EBB01",
    yellow: "#FBD44C",
    orange: "#FF681F",
    white: "#FFFFFF", // Not included in palette!

    negative: "#E53935",
    warning: "#F19C02",
    positive: "#7EBB01",
    info: "#EAF4FF",

    gradientBg: "#9EB0E4",
    gradientLightBg: "#9EB0E4",

    statusActionReq: "#ED6C02",
    statusNeutral: "#009ADE",
    statusPositive: "#80BC00",
    statusNegative: "#EF3842",
};

export const palette = {
    common: {
        white: glassColors.white,
        black: glassColors.black,
    },
    action: {
        active: glassColors.greyBlack,
        disabled: glassColors.greyDisabled,
    },
    text: {
        primary: glassColors.black,
        secondary: glassColors.grey,
        disabled: glassColors.greyDisabled,
        hint: glassColors.grey,
    },
    primary: {
        main: glassColors.mainPrimary,
        dark: glassColors.darkPrimary,
        light: glassColors.lightPrimary,
        lightest: glassColors.accentPrimaryLightest, // Custom extension, not used by default
        // contrastText: 'white',
    },
    secondary: {
        main: glassColors.mainSecondary,
        light: glassColors.lightSecondary,
        dark: glassColors.darkSecondary,
        contrastText: "#fff",
    },
    error: {
        main: glassColors.negative, // This is automatically expanded to main/light/dark/contrastText, what do we use here?
    },
    status: {
        //Custom colors collection, not used by default in MUI
        negative: glassColors.negative,
        warning: glassColors.warning,
        positive: glassColors.positive,
        info: glassColors.info,
    },
    background: {
        paper: glassColors.white,
        default: glassColors.snow,
        grey: "#FCFCFC",
        hover: glassColors.greyLight,
    },
    divider: glassColors.greyLight,
    shadow: glassColors.grey,
};

export const muiTheme = createTheme({
    // colors,
    palette,
    typography: {
        fontFamily: "Roboto, Helvetica, Arial, sans-serif",
        // useNextVariants: true,
    },
    overrides: {
        MuiDivider: {
            light: {
                backgroundColor: palette.divider, // No light dividers for now
            },
        },
    },
});
