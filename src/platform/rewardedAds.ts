// Anúncios premiados opcionais (ADR 0004): só no app de celular, sempre escolha do jogador.
// Recompensas nunca dão vantagem de jogo: cosmético temporário, "dica do analista" (informação pública)
// ou acelerar a recuperação de um Ferido.

export type AdReward = { kind: 'cosmetic'; id: string } | { kind: 'analyst-tip' } | { kind: 'faster-recovery'; unitId: string };

export interface RewardedAds {
  /** Whether an ad can be offered right now (always false on the web). */
  available(): boolean;
  /** Shows an ad; resolves true only if the player watched it to the end. */
  show(reward: AdReward): Promise<boolean>;
}

/** Web and itch.io: no ads, ever. */
export const nullRewardedAds: RewardedAds = {
  available: () => false,
  show: async () => false,
};

let impl: RewardedAds = nullRewardedAds;

export const rewardedAds = (): RewardedAds => impl;

/** The mobile build installs its SDK-backed implementation here. */
export function setRewardedAds(next: RewardedAds) {
  impl = next;
}
