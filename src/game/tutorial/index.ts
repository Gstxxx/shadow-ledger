// Tutorial e objetivo guiado. Ver docs/ONBOARDING.md.
export { CONTRACT_PATIENCE_H, GUIDE_STEPS, guideProgress, skipGuide, startTutorial, STEP_TARGETS, unlockSystems, updateTutorial } from './guide';
export { isLocked, lockedSystems, LOCKED_MSG, tutorialOf } from './locks';
export { isTutorialPreset, TUTORIAL_ID, TUTORIAL_PRESET } from './preset';
export { presentTopics, TENSION_TOPIC, TOPIC_ORDER, TOPIC_TARGETS } from './topics';
export type { TopicId } from './topics';
export type { GuideStepId, SystemId, TutorialState } from './types';
