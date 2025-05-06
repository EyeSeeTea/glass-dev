import React from "react";
import { useAppContext } from "../../contexts/app-context";
import { CircularProgress } from "material-ui";

export interface EmbeddedReportProps {
    dashboardId: string;
}

interface State {
    type: "loading" | "loaded";
    height: number;
}
export const EmbeddedReport: React.FC<EmbeddedReportProps> = ({ dashboardId }) => {
    const { api } = useAppContext();
    const baseUrl = api.baseUrl;
    const [state, setState] = React.useState<State>({ type: "loading", height: 50000 });
    const iframeRef: React.RefObject<HTMLIFrameElement> = React.createRef();
    const dashboardUrlBase = `${baseUrl}/dhis-web-dashboard`;
    const dashboardUrl = dashboardUrlBase + `/#/${dashboardId}`;

    React.useEffect(() => {
        const iframe = iframeRef.current;

        if (iframe !== null) {
            iframe.addEventListener("load", async () => {
                await setDashboardStyling(iframe);
                setState(prevState => ({ ...prevState, type: "loaded" }));
                openExternalLinksInNewTab(iframe);

                const document = iframe?.contentWindow?.document;
                const height = document?.querySelector(".dashboard-scroll-container > div")?.scrollHeight;

                if (height && height > 0) {
                    setState(prevState => ({ ...prevState, height }));
                }
            });
        }
    }, [iframeRef]);

    const isLoading = state.type === "loading";

    return (
        <React.Fragment>
            {isLoading && <CircularProgress />}

            <div style={isLoading ? styles.wrapperHidden : styles.wrapperVisible}>
                <iframe
                    title={dashboardId}
                    ref={iframeRef}
                    id="iframe"
                    src={dashboardUrl}
                    height={state.height}
                    style={styles.iframe}
                />
            </div>
        </React.Fragment>
    );
};

const styles = {
    iframe: { width: "100%", border: 0, overflow: "hidden", height: "80vh" },
    wrapperVisible: { width: "100%" },
    wrapperHidden: { visibility: "hidden", width: "100%" },
};

function openExternalLinksInNewTab(iframe: HTMLIFrameElement) {
    const iwindow = iframe.contentWindow;
    if (!iwindow) return;

    const intervalId = iwindow.setInterval(() => {
        const links = iframe.contentDocument?.querySelectorAll(".dashboard-item-header a");
        if (!links || links.length === 0) return;
        links.forEach(link => {
            link.setAttribute("target", "_blank");
            link.setAttribute("rel", "noopener noreferrer");
        });
        iwindow.clearInterval(intervalId);
    }, 1000);
}

// function autoResizeIframeByContent(iframe: HTMLIFrameElement, setHeight: (height: number) => void): IntervalId {
//     const resize = () => {
//         // Get the first element that has the real height of the full dashboard (and not the forced large value).
//         const document = iframe?.contentWindow?.document;
//         const height = document?.querySelector(".dashboard-scroll-container > div")?.scrollHeight;

//         if (height && height > 0) {
//             console.log("setHeight called");
//             setHeight(height);
//         }
//     };
//     console.log("autoResizeIframeByContent called");
//     return window.setInterval(resize, 1000);
// }

function waitforElementToLoad(iframeDocument: HTMLDocument, selector: string) {
    return new Promise(resolve => {
        const check = () => {
            if (iframeDocument.querySelector(selector)) {
                resolve(undefined);
            } else {
                setTimeout(check, 1000);
            }
        };
        check();
    });
}

async function setDashboardStyling(iframe: HTMLIFrameElement) {
    if (!iframe.contentWindow) return;
    const iframeDocument = iframe.contentWindow.document;

    await waitforElementToLoad(iframeDocument, ".app-wrapper,.dashboard-scroll-container");
    await waitforElementToLoad(iframeDocument, "[data-test='title-bar']");
    const iFrameRoot = iframeDocument.querySelector<HTMLElement>("#root");
    const iFrameWrapper = iframeDocument.querySelector<HTMLElement>(".app-wrapper");
    const pageContainer = iframeDocument.querySelector<HTMLElement>(".page-container-top-margin");

    if (iFrameWrapper?.children[0]) (iFrameWrapper.children[0] as HTMLElement).style.display = "none";
    if (iFrameWrapper?.children[1]) (iFrameWrapper.children[1] as HTMLElement).style.display = "none";

    // 2.36
    iframeDocument.querySelectorAll("header").forEach(el => el.remove());
    iframeDocument.querySelectorAll("[data-test='dashboards-bar']").forEach(el => el.remove());
    iframeDocument.querySelectorAll("[class*=ActionsBar_moreButton]").forEach(el => el.remove());
    iframeDocument.querySelectorAll("[class*=ActionsBar_shareButton]").forEach(el => el.remove());
    iframeDocument.querySelectorAll("[class*=ActionsBar_editButton]").forEach(el => el.remove());
    iframeDocument.querySelectorAll("[class*=StarDashboardButton_star]").forEach(el => el.remove());

    iframeDocument.querySelectorAll("[data-test='dashboarditem-menu-button']").forEach(el => el.remove());

    if (pageContainer) pageContainer.style.marginTop = "0px";
    if (iFrameRoot) iFrameRoot.style.marginTop = "0px";
}
