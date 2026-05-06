export const DEFAULT_ELO_RATING = 1000;
export const ELO_K_FACTOR = 32;

export type EloMatchWinner = "player1" | "player2";

export function calculateUpdatedRatings(
  player1Rating: number,
  player2Rating: number,
  winner: EloMatchWinner,
) {
  const player1ActualScore = winner === "player1" ? 1 : 0;
  const player1ExpectedScore =
    1 / (1 + 10 ** ((player2Rating - player1Rating) / 400));
  const player1Delta = Math.round(
    ELO_K_FACTOR * (player1ActualScore - player1ExpectedScore),
  );

  return {
    player1Delta,
    player1Rating: player1Rating + player1Delta,
    player2Delta: -player1Delta,
    player2Rating: player2Rating - player1Delta,
  };
}
