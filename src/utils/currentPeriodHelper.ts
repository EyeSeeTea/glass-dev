export const getCurrentOpenYearlyPeriod = () => {
    return `${new Date().getFullYear() - 1}`;
};

export const getCurrentOpenQuarterlyPeriod = () => {
    const today = new Date();
    const currentQuarter = Math.floor((today.getMonth() + 3) / 3);
    if (currentQuarter !== 1) return `${today.getFullYear()}Q${currentQuarter - 1}`;
    else return `${today.getFullYear() - 1}Q4`;
};

export const getCurrentYear = () => {
    return new Date().getFullYear();
};

export const getLastNYears = (addCurrentYear = false, n = 7) => {
    const years: string[] = [];
    if (addCurrentYear) {
        years.push(getCurrentYear().toString());
    }
    for (let yearItr = getCurrentYear() - 1; yearItr > getCurrentYear() - 1 - n; yearItr--) {
        years.push(yearItr.toString());
    }

    return years;
};

export const getLastNYearsQuarters = (n = 8) => {
    const years: string[] = [];
    const openYearAndQuarter = getCurrentOpenQuarterlyPeriod().split("Q");

    const openQuarter = parseInt(openYearAndQuarter[1] || "0");
    const openYear = parseInt(openYearAndQuarter[0] || getCurrentYear().toString());

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

    return years;
};

export const getRangeOfYears = (maxYear: number, minYear: number): string[] => {
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => (maxYear - i).toString());
};

export function periodToYearMonthDay(period: string): string {
    const yearOnlyMatch = period.match(/^(\d{4})$/);
    if (yearOnlyMatch) {
        const year = yearOnlyMatch[1];
        return `${year}-01-01`;
    }

    const quarterMatch = period.match(/^(\d{4})Q([1-4])$/);
    if (quarterMatch) {
        const [, year, qStr] = quarterMatch;
        const q = Number(qStr);

        const quarterStartMonthMap: Record<number, string> = {
            1: "01", // Q1
            2: "04", // Q2
            3: "07", // Q3
            4: "10", // Q4
        };

        const month = quarterStartMonthMap[q];

        return `${year}-${month}-01`;
    }

    throw new Error(`Invalid period format: ${period}`);
}
