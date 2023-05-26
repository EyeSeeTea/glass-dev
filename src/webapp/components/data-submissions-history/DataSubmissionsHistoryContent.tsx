import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { ContentLoader } from "../content-loader/ContentLoader";
import { Backdrop } from "@material-ui/core";
import { StyledCircularProgress } from "../sidebar/SideBar";
import { usePopulateDataSubmissionHistory } from "./hooks/usePopulateDataSubmissionHistory";
import { SortDirection } from "../data-file-history/DataFileTable";

export const DataSubmissionsHistoryContent: React.FC = () => {
    const { loading, dataSubmissions, setDataSubmissions } = usePopulateDataSubmissionHistory();

    const sortByColumn = (columnName: string, sortDirection: SortDirection) => {
        setDataSubmissions(prevDataSubmissions => {
            if (prevDataSubmissions.kind === "loaded") {
                return { kind: "loaded", data: _.orderBy(prevDataSubmissions.data, columnName, sortDirection) };
            } else return prevDataSubmissions;
        });
    };
    return (
        <ContentLoader content={dataSubmissions}>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledCircularProgress color="inherit" size={30} />
            </Backdrop>

            {dataSubmissions.kind === "loaded" && (
                <DataSubmissionsTable items={dataSubmissions.data} sortByColumn={sortByColumn} />
            )}
        </ContentLoader>
    );
};
