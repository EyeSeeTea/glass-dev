import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { ContentLoader } from "../content-loader/ContentLoader";
import { Backdrop } from "@material-ui/core";
import { StyledCircularProgress } from "../sidebar/SideBar";
import { usePopulateDataSubmissionHistory } from "./hooks/usePopulateDataSubmissionHistory";

export const DataSubmissionsHistoryContent: React.FC = () => {
    const { loading, dataSubmissions } = usePopulateDataSubmissionHistory();

    return (
        <ContentLoader content={dataSubmissions}>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledCircularProgress color="inherit" size={30} />
            </Backdrop>

            {dataSubmissions.kind === "loaded" && <DataSubmissionsTable items={dataSubmissions.data} />}
        </ContentLoader>
    );
};
