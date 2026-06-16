/**
 * API Registry - Central export for all APIs (v2).
 */
import SetupClipsSchemaV2 from './clips/setup-schema-v2.js';
import RegisterViewer from './v2/register-viewer.js';
import LookupViewer from './v2/lookup-viewer.js';
import GetClipLibrary from './v2/get-clip-library.js';
import GetClipForWatching from './v2/get-clip-for-watching.js';
import StartSession from './v2/start-session.js';
import SubmitAnswer from './v2/submit-answer.js';
import EndSession from './v2/end-session.js';
import GetAdminClips from './v2/get-admin-clips.js';
import SaveClip from './v2/save-clip.js';
import SaveQuestions from './v2/save-questions.js';
import GetClipQuestions from './v2/get-clip-questions.js';
import UnlockClipForViewer from './v2/unlock-clip.js';
import GetViewers from './v2/get-viewers.js';
import GetAnalyticsV2 from './v2/get-analytics.js';
import SeedContentV2 from './v2/seed-content.js';
import SeedQuestionsFromFiles from './v2/seed-questions-from-files.js';
import GetWeatherStorm from './v2/get-weather-storm.js';
import SeedQuestionsBatch from './v2/seed-questions-batch.js';
import SetupXpSchema from './v2/setup-xp-schema.js';
import GetLearnerProgress from './v2/get-learner-progress.js';
import AwardXP from './v2/award-xp.js';
import SetViewerAdmin from './v2/set-viewer-admin.js';
import CompleteClipPath from './v2/complete-clip-path.js';
import AutoLookupViewer from './v2/auto-lookup-viewer.js';

const apis = {
  SetupClipsSchemaV2,
  RegisterViewer,
  LookupViewer,
  GetClipLibrary,
  GetClipForWatching,
  StartSession,
  SubmitAnswer,
  EndSession,
  GetAdminClips,
  SaveClip,
  SaveQuestions,
  GetClipQuestions,
  UnlockClipForViewer,
  GetViewers,
  GetAnalyticsV2,
  SeedContentV2,
  SeedQuestionsFromFiles,
  GetWeatherStorm,
  SeedQuestionsBatch,
  SetupXpSchema,
  GetLearnerProgress,
  AwardXP,
  SetViewerAdmin,
  CompleteClipPath,
  AutoLookupViewer,
} as const;

export default apis;

/** Type for useApi inference - exported for client type-only imports */
export type ApiRegistry = typeof apis;
