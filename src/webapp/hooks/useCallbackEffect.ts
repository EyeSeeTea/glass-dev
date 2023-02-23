import React from "react";

/**
 * Merge the features of React.useCallback and React.useEffect to start a cancellable effect from
 * a callback. Any time the function is called, a new effect will be started and the old one cancelled,
 * so only one effect will be running concurrently.
 **/

type Cancel = () => void;

export function useCallbackEffect<Args extends any[]>(
    getEffect: (...args: Args) => Cancel | undefined
): (...args: Args) => void {
    const [args, setArgs] = React.useState<Args>();

    const run = React.useCallback((...args: Args) => setArgs(args), [setArgs]);

    React.useEffect(() => {
        return args ? getEffect(...args) : undefined;
    }, [args, getEffect]);

    return run;
}
