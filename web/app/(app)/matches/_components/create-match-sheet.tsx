"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MatchFormat = "BO1" | "BO3" | "BO5";
type WinnerKey = "player1" | "player2";

type MatchScore = {
  player1: number;
  player2: number;
};

export type OpponentOption = {
  id: string;
  name: string;
};

export type CreateMatchPayload = {
  opponent: OpponentOption;
  format: MatchFormat;
  winner: WinnerKey;
  score: MatchScore;
};

type CreateMatchSubmitResult = {
  ok: boolean;
  message?: string;
};

type CreateMatchSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMatchPayload) => Promise<CreateMatchSubmitResult>;
  opponentOptions: OpponentOption[];
  viewerName: string;
};

const SCORE_OPTIONS: Record<MatchFormat, MatchScore[]> = {
  BO1: [
    { player1: 1, player2: 0 },
    { player1: 0, player2: 1 },
  ],
  BO3: [
    { player1: 2, player2: 0 },
    { player1: 2, player2: 1 },
    { player1: 0, player2: 2 },
    { player1: 1, player2: 2 },
  ],
  BO5: [
    { player1: 3, player2: 0 },
    { player1: 3, player2: 1 },
    { player1: 3, player2: 2 },
    { player1: 0, player2: 3 },
    { player1: 1, player2: 3 },
    { player1: 2, player2: 3 },
  ],
};

function getScoreText(score: MatchScore) {
  return `${score.player1}:${score.player2}`;
}

function getScoreWinner(score: MatchScore): WinnerKey {
  return score.player1 > score.player2 ? "player1" : "player2";
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.25 13.25 17 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 22 22" width="22">
      <path
        d="M13.75 5.5 8.25 11l5.5 5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type FieldLabelProps = {
  children: string;
};

function FieldLabel({ children }: FieldLabelProps) {
  return (
    <label className="block text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </label>
  );
}

export function CreateMatchSheet({
  isOpen,
  onClose,
  onSubmit,
  opponentOptions,
  viewerName,
}: CreateMatchSheetProps) {
  const [opponentQuery, setOpponentQuery] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentOption | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<WinnerKey | null>(null);
  const [selectedScore, setSelectedScore] = useState<MatchScore | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpponentListOpen, setIsOpponentListOpen] = useState(false);
  const [interactionHint, setInteractionHint] = useState<string | null>(null);
  const opponentFieldRef = useRef<HTMLDivElement | null>(null);

  function resetFormState() {
    setOpponentQuery("");
    setSelectedOpponent(null);
    setSelectedFormat(null);
    setSelectedWinner(null);
    setSelectedScore(null);
    setIsSubmitting(false);
    setIsOpponentListOpen(false);
    setInteractionHint(null);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        resetFormState();
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !isOpponentListOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!opponentFieldRef.current?.contains(event.target as Node)) {
        setIsOpponentListOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, isOpponentListOpen]);

  const filteredOpponents = useMemo(() => {
    const normalizedQuery = opponentQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return opponentOptions;
    }

    return opponentOptions.filter((opponent) =>
      opponent.name.toLowerCase().includes(normalizedQuery),
    );
  }, [opponentOptions, opponentQuery]);

  const availableScores = useMemo(() => {
    if (!selectedFormat) {
      return [];
    }

    return SCORE_OPTIONS[selectedFormat].filter((score) => {
      if (!selectedWinner) {
        return true;
      }

      return getScoreWinner(score) === selectedWinner;
    });
  }, [selectedFormat, selectedWinner]);

  const isFormValid =
    selectedOpponent !== null &&
    selectedFormat !== null &&
    selectedWinner !== null &&
    selectedScore !== null;

  function getSubmitHint() {
    if (!selectedOpponent) {
      return "Сначала выберите соперника.";
    }

    if (!selectedFormat) {
      return "Сначала выберите формат матча.";
    }

    if (!selectedWinner) {
      return "Сначала укажите победителя.";
    }

    if (!selectedScore) {
      return "Сначала выберите итоговый счет.";
    }

    return null;
  }

  async function handleSubmit() {
    if (!isFormValid || isSubmitting || !selectedOpponent || !selectedFormat || !selectedWinner || !selectedScore) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        opponent: selectedOpponent,
        format: selectedFormat,
        winner: selectedWinner,
        score: selectedScore,
      });

      if (!result.ok) {
        setInteractionHint(result.message ?? "Не удалось создать матч.");
        return;
      }

      resetFormState();
      onClose();
    } catch {
      setInteractionHint("Не удалось создать матч. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const winnerOptions = [
    { value: "player1" as const, label: viewerName },
    {
      value: "player2" as const,
      label: selectedOpponent ? selectedOpponent.name : "Сначала выберите соперника",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-white md:flex md:items-center md:justify-center md:bg-slate-950/38 md:p-4"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          window.matchMedia("(min-width: 768px)").matches
        ) {
          resetFormState();
          onClose();
        }
      }}
      role="presentation"
    >
      <section className="flex h-full w-full flex-col bg-white md:h-auto md:max-h-[min(92vh,760px)] md:max-w-[32.5rem] md:overflow-hidden md:rounded-[var(--radius-default)] md:border md:border-slate-200/90 md:shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-4 md:px-5 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-blue-600 transition hover:bg-blue-50 md:hidden"
              onClick={() => {
                resetFormState();
                onClose();
              }}
              type="button"
            >
              <BackArrowIcon />
            </button>
            <h2 className="text-[1.95rem] font-semibold tracking-tight text-slate-950 md:text-[1.55rem]">
              Создать матч
            </h2>
          </div>

          <button
            className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:inline-flex"
            onClick={() => {
              resetFormState();
              onClose();
            }}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          <div className="space-y-5 md:space-y-4.5">
            <div className="space-y-2.5">
              <FieldLabel>Игрок 1</FieldLabel>
              <div className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50/60 px-3 py-3 text-[1rem] font-medium text-slate-800">
                {viewerName}
              </div>
            </div>

            <div className="space-y-2.5">
              <FieldLabel>Соперник</FieldLabel>
              <div className="relative" ref={opponentFieldRef}>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </span>
                <input
                  className="min-h-11 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white pl-10 pr-3 text-[0.95rem] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  onChange={(event) => {
                    setInteractionHint(null);
                    setOpponentQuery(event.target.value);
                    setSelectedOpponent(null);
                    setSelectedWinner(null);
                    setSelectedScore(null);
                    setIsOpponentListOpen(true);
                  }}
                  onFocus={() => setIsOpponentListOpen(true)}
                  placeholder="Поиск соперника по имени..."
                  type="text"
                  value={selectedOpponent ? selectedOpponent.name : opponentQuery}
                />

                {isOpponentListOpen ? (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[var(--radius-default)] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
                    {filteredOpponents.length > 0 ? (
                      <ul className="max-h-56 overflow-y-auto py-1">
                        {filteredOpponents.map((opponent) => (
                          <li key={opponent.id}>
                            <button
                              className="flex w-full items-center px-3 py-2.5 text-left text-[0.92rem] text-slate-700 transition hover:bg-slate-50"
                              onClick={() => {
                                setInteractionHint(null);
                                setSelectedOpponent(opponent);
                                setOpponentQuery(opponent.name);
                                setIsOpponentListOpen(false);
                              }}
                              type="button"
                            >
                              {opponent.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-3 py-3 text-[0.84rem] text-slate-500">Игрок не найден.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2.5">
              <FieldLabel>Формат матча</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {(["BO1", "BO3", "BO5"] as MatchFormat[]).map((format) => {
                  const isActive = selectedFormat === format;

                  return (
                    <button
                      key={format}
                      className={`inline-flex min-h-12 items-center justify-center rounded-[var(--radius-default)] border text-[0.95rem] font-semibold transition ${
                        isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setInteractionHint(null);
                        setSelectedFormat(format);
                        setSelectedScore(null);
                      }}
                      type="button"
                    >
                      {format}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <FieldLabel>Победитель</FieldLabel>
              <div className="grid gap-2 md:grid-cols-2 md:items-stretch">
                {winnerOptions.map((winnerOption) => {
                  const isActive = selectedWinner === winnerOption.value;
                  const isDisabled =
                    winnerOption.value === "player2" && selectedOpponent === null;

                  return (
                    <button
                      key={winnerOption.value}
                      className={`inline-flex min-h-11 w-full items-center justify-start rounded-[var(--radius-default)] border px-3 text-left text-[0.92rem] font-medium transition ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : isDisabled
                            ? "border-slate-200 bg-slate-50 text-slate-400"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        if (isDisabled) {
                          setInteractionHint("Сначала выберите соперника.");
                          return;
                        }

                        setInteractionHint(null);
                        setSelectedWinner(winnerOption.value);
                        setSelectedScore(null);
                      }}
                      type="button"
                    >
                      {winnerOption.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <FieldLabel>Итоговый счет</FieldLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableScores.map((scoreOption) => {
                  const isActive =
                    selectedScore?.player1 === scoreOption.player1 &&
                    selectedScore?.player2 === scoreOption.player2;

                  return (
                    <button
                      key={getScoreText(scoreOption)}
                      className={`inline-flex min-h-10 items-center justify-center rounded-[var(--radius-default)] border text-[0.88rem] font-semibold transition ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setInteractionHint(null);
                        setSelectedScore(scoreOption);
                      }}
                      type="button"
                    >
                      {getScoreText(scoreOption)}
                    </button>
                  );
                })}
              </div>

              {!selectedFormat || !selectedWinner ? (
                <button
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-default)] border border-dashed border-slate-200 bg-slate-50 text-[0.84rem] font-medium text-slate-500 transition hover:bg-slate-100"
                  onClick={() =>
                    setInteractionHint(
                      !selectedFormat
                        ? "Сначала выберите формат матча."
                        : "Сначала укажите победителя.",
                    )
                  }
                  type="button"
                >
                  {!selectedFormat
                    ? "Счет станет доступен после выбора формата"
                    : "Счет станет доступен после выбора победителя"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="sticky bottom-0 border-t border-slate-200/80 bg-white px-4 py-4 md:px-5">
          {interactionHint ? (
            <p className="mb-2 text-[0.78rem] text-slate-500">{interactionHint}</p>
          ) : null}

          <button
            aria-disabled={!isFormValid || isSubmitting}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border px-4 text-[0.94rem] font-semibold transition ${
              !isFormValid || isSubmitting
                ? "border-blue-300 bg-blue-300 text-white"
                : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            }`}
            onClick={() => {
              if (!isFormValid || isSubmitting) {
                setInteractionHint(getSubmitHint());
                return;
              }

              void handleSubmit();
            }}
            type="button"
          >
            {isSubmitting ? "Создаем матч..." : "Создать матч"}
          </button>
        </footer>
      </section>
    </div>
  );
}
