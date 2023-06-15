export const firstDayOfQuarter = (period: string): Date => {
    const [year, quarter] = period.split("Q");
    switch (quarter) {
        case "1":
            return new Date(`01-01-${year}`);
        case "2":
            return new Date(`04-01-${year}`);
        case "3":
            return new Date(`07-01-${year}`);
        case "4":
            return new Date(`10-01-${year}`);
        default:
            throw new Error("Invalid  period");
    }
};

export const lastDayOfQuarter = (period: string): Date => {
    const [year, quarter] = period.split("Q");
    switch (quarter) {
        case "1":
            return new Date(`03-31-${year}`);
        case "2":
            return new Date(`06-30-${year}`);
        case "3":
            return new Date(`09-30-${year}`);
        case "4":
            return new Date(`12-31-${year}`);
        default:
            throw new Error("Invalid  period");
    }
};
