import { Typography } from "@material-ui/core";
import styled from "styled-components";
import { ComponentAMCQuestionnaireCombination } from "../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { useAMCQuestionnaireOptionsContext } from "../../../contexts/amc-questionnaire-options-context";
import InfoIcon from "@material-ui/icons/InfoOutlined";
import i18n from "../../../../locales";

type MissingComponentQuestionnairesProps = { value: ComponentAMCQuestionnaireCombination[] };

export const MissingComponentQuestionnaires: React.FC<MissingComponentQuestionnairesProps> = ({ value }) => {
    const options = useAMCQuestionnaireOptionsContext();
    const getAmClassName = (amClass: string) => {
        const amClassOption = options.antimicrobialClassOptions.find(option => option.code === amClass);
        return amClassOption ? amClassOption.name : amClass;
    };
    const getStrataName = (strata: string) => {
        const strataOption = options.strataOptions.find(option => option.code === strata);
        return strataOption ? strataOption.name : strata;
    };
    return (
        <Container>
            <HeadingContainer>
                <InfoIcon />
                <Typography>{i18n.t("Missing antimicrobial class - stratum combinations:")}</Typography>
            </HeadingContainer>
            <List>
                {value.map(item => (
                    <ListItem key={item.antimicrobialClass}>
                        <Typography variant="body2">{getAmClassName(item.antimicrobialClass)}</Typography>
                        <Typography variant="caption">
                            {item.strataValues.map(code => getStrataName(code)).join(", ")}
                        </Typography>
                    </ListItem>
                ))}
            </List>
        </Container>
    );
};

const Container = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    margin: 20px 0;
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
`;

const List = styled.ul`
    margin: 0;
    padding: 0;
    display: flex;
    gap: 20px;
    list-style-type: none;
`;

const ListItem = styled.li`
    display: inline-block;
`;

const HeadingContainer = styled.div`
    display: flex;
    gap: 10px;
`;
