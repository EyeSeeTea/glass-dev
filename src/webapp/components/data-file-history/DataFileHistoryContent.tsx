import styled from "styled-components";
import { useEffect, useState } from "react";
import { SortDirection, DataFileTable } from "./DataFileTable";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../contexts/app-context";
import { useGlassUploads } from "../../hooks/useGlassUploads";
import { Filter } from "./Filter";
import { CustomCard } from "../custom-card/CustomCard";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { GlassUploads } from "../../../domain/entities/GlassUploads";

export const DataFileHistoryContent: React.FC = () => {
    const { currentPeriod } = useCurrentPeriodContext();
    const location = useLocation();
    const { compositionRoot } = useAppContext();
    const uploads = useGlassUploads(compositionRoot);
    const params = new URLSearchParams(location.search);
    const [year, setYear] = useState(currentPeriod);
    const [status, setStatus] = useState("Completed");
    const [filteredUploads, setFilteredUploads] = useState<GlassUploads[]>();

    useEffect(() => {
        if (uploads.kind === "loaded") {
            const filtered = uploads.data
                .filter(u => u.period === year.toString() && u.status.toLowerCase() === status.toLowerCase())
                .map(uploadData => {
                    // TODO: This is used allow to sort by rows column. Delete mapping when no items in DataStore with records (because becomes rows)
                    const { records, ...restData } = uploadData;
                    return records !== undefined && records !== null
                        ? {
                              rows: records,
                              ...restData,
                          }
                        : uploadData;
                });
            setFilteredUploads(filtered);
        }
    }, [status, year, uploads]);

    const sortByColumn = (columnName: string, sortDirection: SortDirection) => {
        setFilteredUploads(prevFilteredUploads => {
            return _.orderBy(prevFilteredUploads, columnName, sortDirection);
        });
    };

    return (
        <ContentLoader content={uploads}>
            <ContentWrapper>
                <Filter year={year} setYear={setYear} status={status} setStatus={setStatus} />
                <CustomCard padding="20px 30px 20px">
                    {uploads.kind === "loaded" && (
                        <DataFileTable
                            items={filteredUploads}
                            data-current-module={params.get("userId")}
                            sortByColumn={sortByColumn}
                        />
                    )}
                </CustomCard>
            </ContentWrapper>
        </ContentLoader>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    p.intro {
        text-align: left;
        max-width: 730px;
        margin: 0 auto;
        font-weight: 300px;
        line-height: 1.4;
    }
`;
