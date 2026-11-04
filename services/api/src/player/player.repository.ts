export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

export interface PlayerRepository {
  /** Creates the player with STARTING_BALANCE if unknown, then returns the stored balance. */
  getOrCreateBalance(playerId: string): Promise<number>;
}
