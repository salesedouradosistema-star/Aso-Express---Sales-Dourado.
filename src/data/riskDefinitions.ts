export interface RiskCategoryDefinition {
  key: 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'accidental' | 'psychosocial';
  subItemsKey: 'physicalSubItems' | 'chemicalSubItems' | 'biologicalSubItems' | 'ergonomicSubItems' | 'accidentalSubItems' | 'psychosocialSubItems';
  detailsKey: 'physicalDetails' | 'chemicalDetails' | 'biologicalDetails' | 'ergonomicDetails' | 'accidentalDetails' | 'psychosocialDetails';
  label: string;
  shortLabel: string;
  subTopics: string[];
  defaultSummary: string;
}

export const OCCUPATIONAL_RISK_CATEGORIES: RiskCategoryDefinition[] = [
  {
    key: 'physical',
    subItemsKey: 'physicalSubItems',
    detailsKey: 'physicalDetails',
    label: 'Físicos',
    shortLabel: 'Físico',
    subTopics: [
      'Ruído',
      'Calor',
      'Frio',
      'Vibração',
      'Radiações',
      'Umidade',
      'Pressões anormais',
    ],
    defaultSummary: 'Ruído | Calor | Frio | Vibração | Radiações | Umidade | Pressões anormais',
  },
  {
    key: 'chemical',
    subItemsKey: 'chemicalSubItems',
    detailsKey: 'chemicalDetails',
    label: 'Químicos',
    shortLabel: 'Químico',
    subTopics: [
      'Poeiras',
      'Fumos',
      'Névoas',
      'Gases',
      'Vapores',
      'Produtos químicos',
      'Solventes',
    ],
    defaultSummary: 'Poeiras | Fumos | Névoas | Gases | Vapores | Produtos químicos | Solventes',
  },
  {
    key: 'biological',
    subItemsKey: 'biologicalSubItems',
    detailsKey: 'biologicalDetails',
    label: 'Biológicos',
    shortLabel: 'Biológico',
    subTopics: [
      'Vírus',
      'Bactérias',
      'Fungos',
      'Parasitas',
      'Sangue/Fluidos corporais',
      'Material contaminado',
    ],
    defaultSummary: 'Vírus | Bactérias | Fungos | Parasitas | Sangue/Fluidos | Contaminado',
  },
  {
    key: 'ergonomic',
    subItemsKey: 'ergonomicSubItems',
    detailsKey: 'ergonomicDetails',
    label: 'Ergonômicos',
    shortLabel: 'Ergonômico',
    subTopics: [
      'Postura inadequada',
      'Repetitividade',
      'Trabalho sentado',
      'Trabalho em pé',
      'Esforço físico',
      'Levantamento de peso',
      'Uso contínuo de computador',
      'Ritmo excessivo',
    ],
    defaultSummary: 'Postura inadequada | Repetitividade | Trabalho sentado/em pé | Esforço físico | Computador',
  },
  {
    key: 'accidental',
    subItemsKey: 'accidentalSubItems',
    detailsKey: 'accidentalDetails',
    label: 'Acidentes / Mecânicos',
    shortLabel: 'Acidentes',
    subTopics: [
      'Queda',
      'Corte/Perfuração',
      'Choque elétrico',
      'Queimadura',
      'Prensagem',
      'Máquinas/equipamentos',
      'Perfurocortantes',
      'Incêndio/Explosão',
    ],
    defaultSummary: 'Queda | Corte/Perfuração | Choque | Queimadura | Prensagem | Máquinas | Explosão',
  },
  {
    key: 'psychosocial',
    subItemsKey: 'psychosocialSubItems',
    detailsKey: 'psychosocialDetails',
    label: 'Psicossociais',
    shortLabel: 'Psicossocial',
    subTopics: [
      'Sobrecarga',
      'Pressão',
      'Assédio',
      'Conflitos',
      'Exigência emocional',
      'Trabalho isolado',
      'Violência',
    ],
    defaultSummary: 'Sobrecarga | Pressão | Assédio | Conflitos | Exigência emocional | Trabalho isolado',
  },
];
