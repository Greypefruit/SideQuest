"use client";

type BracketSlot = {
  displayName: string | null;
  participantId: string | null;
  seed: number | null;
};

type BracketMatch = {
  canSubmitResult: boolean;
  id: string;
  isFinal: boolean;
  nextMatchId: string | null;
  resolutionType: "bye" | "played" | null;
  slot1: BracketSlot;
  slot1Score: number | null;
  slot2: BracketSlot;
  slot2Score: number | null;
  status: "completed" | "pending";
  winnerParticipantId: string | null;
};

type TournamentBracketMatchProps = {
  isPending: boolean;
  match: BracketMatch;
  onOpenResult: (matchId: string) => void;
};

function SlotRow({
  hasAction,
  isWinner,
  placeholder,
  slot,
}: {
  hasAction: boolean;
  isWinner: boolean;
  placeholder: string;
  slot: BracketSlot;
}) {
  const hasParticipant = Boolean(slot.displayName);

  return (
    <div
      className={`grid min-h-[48px] grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-2 px-3 ${
        hasAction ? "pr-14" : ""
      } ${
        isWinner ? "bg-emerald-50/80" : ""
      }`}
    >
      <span
        className={`min-w-[2rem] text-[0.72rem] font-semibold ${
          slot.seed !== null ? "text-blue-600" : "text-slate-300"
        }`}
      >
        {slot.seed !== null ? `#${slot.seed}` : "—"}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[0.84rem] ${
            hasParticipant
              ? isWinner
                ? "font-semibold text-slate-950"
                : "font-medium text-slate-700"
              : "font-medium text-slate-400"
          }`}
        >
          {slot.displayName ?? placeholder}
        </p>
      </div>

      <span className="inline-flex w-4 justify-center">
        {isWinner ? (
          <span className="inline-flex size-2 rounded-full bg-emerald-500" aria-hidden="true" />
        ) : null}
      </span>
    </div>
  );
}

export function TournamentBracketMatch({
  isPending,
  match,
  onOpenResult,
}: TournamentBracketMatchProps) {
  const isBye = match.resolutionType === "bye";
  const slot1Winner = match.winnerParticipantId === match.slot1.participantId;
  const slot2Winner = match.winnerParticipantId === match.slot2.participantId;

  return (
    <article
      className={`relative overflow-hidden rounded-[8px] border shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${
        match.isFinal
          ? "border-amber-300 bg-amber-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="relative min-h-[104px]">
        {match.canSubmitResult ? (
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onOpenResult(match.id)}
              className="inline-flex min-h-8 items-center justify-center rounded-full border border-blue-200 bg-white px-2.5 text-center text-[0.68rem] font-semibold leading-tight text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Внести
            </button>
          </div>
        ) : null}

        <SlotRow
          hasAction={match.canSubmitResult}
          isWinner={slot1Winner}
          placeholder="Ожидается"
          slot={match.slot1}
        />
        <div className="border-t border-slate-200" />
        <SlotRow
          hasAction={match.canSubmitResult}
          isWinner={slot2Winner}
          placeholder={isBye ? "BYE" : "Ожидается"}
          slot={match.slot2}
        />
      </div>
    </article>
  );
}
