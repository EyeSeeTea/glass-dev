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

    // By using a reference to the getEffect function, we avoid infinite loops on useEffect
    // and the function passed when the effect begins is called.
    const getEffectLastRef = useLatest(getEffect);

    React.useEffect(() => {
        return args ? getEffectLastRef.current(...args) : undefined;
    }, [args, getEffectLastRef]);

    const run = React.useCallback((...args: Args) => setArgs(args), [setArgs]);

    return run;
}

function useLatest<T>(value: T) {
    const ref = React.useRef<T>(value);
    React.useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}
