/**
 * Kit visual do Shadow Ledger. Importe uma vez no app: `import './art/tokens.css'`
 * (ou importe deste index, que já carrega tokens.css e art.css).
 */
import './tokens.css';
import './art.css';

export * from './tokens';
export { Logo, Monogram, appIconSvg, appIconDataUrl } from './Logo';
export type { LogoProps, LogoVariant, MonogramProps } from './Logo';
export { GameIcon, iconSvgString, iconInner, iconStrokeWidth } from './icons/GameIcon';
export type { GameIconProps, IconAccent } from './icons/GameIcon';
export { ICONS, CLASS_ICON, STATION_TIER_ICON, GROUP_LABEL } from './icons/paths';
export type { IconDef, IconGroup, GameIconId } from './icons/paths';
export { NoiseBackdrop, RadarSweep, DossierPaper, WorldGlow, grainTile } from './backdrops';
export type { NoiseBackdropProps, RadarSweepProps, RadarBlip, DossierPaperProps, WorldGlowProps, WorldGlowSpot } from './backdrops';
export { AnalystPortrait, OperativePortrait } from './portraits';
export type { AnalystMood, AnalystPortraitProps, OperativePortraitProps, OperativeTone } from './portraits';
export { DirectorPortrait, DirectorCard, DIRECTOR_ORIGINS, ORIGIN_INFO } from './directors';
export type { DirectorOrigin, DirectorMood, DirectorPortraitProps, DirectorCardProps } from './directors';
export { GButton, GIconButton, GSegmented, GPanel, GTabs, GChip, GBadge, GMeter, GCounter, GMenuItem, GHelp, uiSound } from './game-ui';
export type { GButtonProps, GButtonVariant, GIconButtonProps, GSegmentedProps, GSegOption, GPanelProps, GTabsProps, GTabItem, GChipProps, GMeterProps, GCounterProps, GMenuItemProps } from './game-ui';
export { GDial, GCard, GSeal, GUnitCard, GModal, useModalStack, GActionBar, GToast, GTip, GRange, GStepper, GToggle, GTelex, GMapMarker, GBoard, GToken } from './game-ui-2';
export type { GDialProps, GCardProps, GUnitCardProps, GModalProps, GActionBarProps, GDockItem, GRangeProps, GStepperProps, GMapMarkerProps, GMarkerKind, GBoardProps } from './game-ui-2';
export { GVerdict, GBigNumber, GDetails, GModeSwitch } from './game-ui-3';
export type { GVerdictProps, GVerdictTone, GBigNumberProps, GDetailsProps, GModeSwitchProps, GModeOption } from './game-ui-3';
export { ItemArt, itemCategory, ITEM_ART_RATIO } from './ItemArt';
export type { ItemArtProps, ItemArtCategory } from './ItemArt';
export { ITEM_PHOTOS } from './itemPhotos';
export { UnitPortrait, unitFigure } from './UnitPortrait';
export type { UnitPortraitProps } from './UnitPortrait';
export { Sprite, SpriteStill, SPRITE_SETS, STATION_SPRITE_IDS, loadSpriteAtlas, loadSpriteStatic, preloadSprites, spriteAtlasSync, useSpriteAtlas, findAnim, frameRect, frameAt, animDuration, spriteUrl } from './sprites';
export type { SpriteAtlas, SpriteAnim, SpriteStaticGroup, SpriteStaticItem, SpriteSetId, SpriteStaticId, SpriteProps, SpriteStillProps } from './sprites';
export { CornerBrackets, DossierFrame, Stamp, Redacted, RedactionBar, Divider, ClassificationBar, Tape } from './frame';
export type { CornerBracketsProps, DossierFrameProps, StampProps, StampPreset, RedactedProps, RedactionBarProps, DividerProps, ClassificationBarProps, TapeProps } from './frame';
