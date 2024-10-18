// NPM
import _ from 'lodash';
import axios from 'axios';
import queryString from 'query-string';

// CONSTA
const wikidataApiBase = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*';

type Label = {
  id: string,
  label: string
}

class WikidataTranslator {
  labels: Label[];

  constructor() {
    this.labels = [];
  }

  translate(id: string) {
    const match = _.find(this.labels, { id });
    if (match) return match.label;
    return `No translation for ${id}`;
  }

  async preload({ qNumbers }: { qNumbers: string[] }) {
    const labelResponse = await this.fetchLabels({ qNumbers });

    if (labelResponse.status !== 200) {
      // Handle error
      console.log(labelResponse);
    };

    const entities = _.get(labelResponse, 'data.entities', {});
    const preppedLabels = _.map(entities, (entity) => {
      return {
        id: entity.id,
        label: _.capitalize(_.get(entity, 'labels.en.value', entity.id))
      }
    });

    this.labels = preppedLabels;
    return this.labels
  }

  fetchLabels({ qNumbers }: { qNumbers: string[] }) {
    const uniqueQNumbers = _.uniq(qNumbers)
    const idsParam = _.join(uniqueQNumbers, '|');
    const query = {
      ids: idsParam,
      props: 'labels',
      languages: 'en'
    };
    return axios.get(`${wikidataApiBase}&${queryString.stringify(query)}`);
  }
}

export default WikidataTranslator;