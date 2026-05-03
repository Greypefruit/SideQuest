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

function PencilIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16" className="size-3.5">
      <path
        d="M10.667 2.667a1.414 1.414 0 1 1 2 2L6 11.333 3.333 12l.667-2.667 6.667-6.666Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

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
      className={`grid h-10 grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-2 px-3 ${
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
          className={`truncate text-[0.8rem] ${
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
  const hasBothParticipants =
    Boolean(match.slot1.participantId) && Boolean(match.slot2.participantId);
  const isCompleted = match.status === "completed";
  const isInteractive = match.canSubmitResult && !isCompleted && hasBothParticipants;
  const slot1Winner = match.winnerParticipantId === match.slot1.participantId;
  const slot2Winner = match.winnerParticipantId === match.slot2.participantId;
  const scoreText =
    match.slot1Score !== null && match.slot2Score !== null
      ? `${match.slot1Score}:${match.slot2Score}`
      : null;

  const cardClassName = `relative w-full overflow-hidden rounded-[8px] border bg-white text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition ${
    match.isFinal
      ? "border-amber-300 bg-amber-50/60"
      : "border-slate-200"
  } ${
    isInteractive
      ? "cursor-pointer hover:border-blue-300 hover:shadow-[0_10px_24px_rgba(37,99,235,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
      : ""
  }`;

  const content = (
    <div className="relative">
      <div className="flex h-[38px] items-center justify-between gap-3 border-b border-slate-100 px-3">
        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {isCompleted ? "СЫГРАН" : "ОЖИДАЕТСЯ"}
        </p>

        {isCompleted && scoreText ? (
          <span className="inline-flex min-h-5 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-[0.64rem] font-semibold text-slate-700">
            {scoreText}
          </span>
        ) : isInteractive ? (
          <span className="inline-flex min-h-5 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-[0.62rem] font-medium text-slate-500">
            <PencilIcon />
            Результат
          </span>
        ) : null}
      </div>

      <SlotRow
        hasAction={false}
        isWinner={slot1Winner}
        placeholder="Ожидается"
        slot={match.slot1}
      />
      <div className="border-t border-slate-200" />
      <SlotRow
        hasAction={false}
        isWinner={slot2Winner}
        placeholder={isBye ? "BYE" : "Ожидается"}
        slot={match.slot2}
      />
    </div>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => onOpenResult(match.id)}
        className={cardClassName}
      >
        {content}
      </button>
    );
  }

  return <article className={cardClassName}>{content}</article>;
}
