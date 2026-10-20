// Campanha "Herança": API do motor (a UI usa src/store/campaign.ts).
export * from './types';
export { CHAPTERS, CHAPTER_COUNT, MORAVIA, chapterDef, dossierKeys } from './chapters';
export {
  CAMPAIGN_VERSION,
  cashBonus,
  chapterResult,
  commitChapter,
  failChapter,
  healVeteran,
  loadCampaign,
  newCampaign,
  startChapter,
  tickCampaign,
  veteranCandidates,
} from './flow';
