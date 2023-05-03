//TO DO : get from datastore
const QUARTERLY_MODULES = ["EGASP"];

export const getCurrentOpenPeriodByModule = (module: string) => {
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

export const getLastNYears = (n: number) => {
    const years: string[] = [];
    for (let yearItr = getCurrentYear() - 1; yearItr > getCurrentYear() - 1 - n; yearItr--) {
        years.push(yearItr.toString());
    }
    console.debug(`Last N years : ${years}`);
    return years;
};

export const getLastNYearsQuarters = (n: number) => {
    const years: string[] = [];
    const openYearAndQuarter = getCurrentOpenQuarterlyPeriod().split("Q");
    const openQuarter = parseInt(openYearAndQuarter[1] || "0");
    const openYear = parseInt(openYearAndQuarter[0] || (getCurrentYear() - 1).toString());

    //Populate all previous quarters in the current year
    let qtrItr = openQuarter;
    while (qtrItr > 0) {
        years.push(`${openYear}Q${qtrItr}`);
        qtrItr--;
    }

    //Populate last n years quarters.
    for (let i = 1; i < n; i++) {
        qtrItr = 4;
        while (qtrItr > 0) {
            years.push(`${openYear - i}Q${qtrItr}`);
            qtrItr--;
        }
    }
    console.debug(`Last N years : ${years}`);
    return years;
};
