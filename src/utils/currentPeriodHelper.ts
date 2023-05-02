const QUARTERLY_MODULES = ["EGASP"];

export const getCurrentOpenPeriod = (module: string) => {
    const today = new Date();
    if (QUARTERLY_MODULES.find(qm => qm === module)) {
        const lastQuarter = Math.floor((today.getMonth() + 3) / 3) - 1;
        return `${today.getFullYear() - 1}Q${lastQuarter}`;
    } else {
        return `${today.getFullYear() - 1}`;
    }
};

export const getCurrentOpenYearlyPeriod = () => {
    return `${new Date().getFullYear() - 1}`;
};

export const getCurrentOpenQuarterlyPeriod = () => {
    const today = new Date();
    const lastQuarter = Math.floor((today.getMonth() + 3) / 3) - 1;
    return `${today.getFullYear() - 1}Q${lastQuarter}`;
};

export const getCurrentYear = () => {
    return new Date().getFullYear();
};
