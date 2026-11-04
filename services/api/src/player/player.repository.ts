export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

export interface PlayerRepository {
  /** Returns the stored balance, or STARTING_BALANCE for a player with no stored row. Never writes. */
  getBalance(playerId: string): Promise<number>;
}
