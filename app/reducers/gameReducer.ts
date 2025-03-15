interface Card {
  word: string | null;
  translation: string | null;
  translationId: string | null;
}

interface GameState {
  selectedTranslation: string | null;
  feedback: "correct" | "incorrect" | null;
  currentQuestion: string | null;
  possibleAnswers: string[];
  correctAnswer: string | null;
  score: number;
  questionCount: number;
  completedWords: string[];
  currentTranslationId: string | null;
}

type GameAction =
  | { type: "REFRESH_CARDS"; payload: { cards: Card[]; maxQuestions: number } }
  | { type: "SELECT_ANSWER"; payload: { translation: string } }
  | { type: "RESET_SELECTION" };

const initialState: GameState = {
  selectedTranslation: null,
  feedback: null,
  currentQuestion: null,
  possibleAnswers: [],
  correctAnswer: null,
  score: 0,
  questionCount: 0,
  completedWords: [],
  currentTranslationId: null,
};

export const initialize = (
  cards: Card[],
  maxQuestions: number,
  state = initialState
) => {
  const availableCards = cards.filter(
    (card) => !state.completedWords.includes(card.word!)
  );

  if (availableCards.length === 0 || state.questionCount >= maxQuestions) {
    return state;
  }

  const randomIndex = Math.floor(Math.random() * availableCards.length);
  const questionCard = availableCards[randomIndex];

  const otherTranslations = cards
    .filter((card) => card.translation !== questionCard.translation)
    .map((card) => card.translation);

  const wrongAnswers = [...otherTranslations]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(3, otherTranslations.length));

  const allAnswers = [questionCard.translation, ...wrongAnswers]
    .filter((answer) => answer !== null)
    .sort(() => 0.5 - Math.random());

  return {
    ...state,
    currentQuestion: questionCard.word!,
    correctAnswer: questionCard.translation!,
    possibleAnswers: allAnswers!,
    currentTranslationId: questionCard.translationId!,
  };
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "REFRESH_CARDS": {
      const { cards, maxQuestions } = action.payload;
      return initialize(cards, maxQuestions, state);
    }

    case "SELECT_ANSWER": {
      const isCorrect = action.payload.translation === state.correctAnswer;
      const newCompletedWords = isCorrect
        ? [...state.completedWords, state.currentQuestion!]
        : state.completedWords;

      return {
        ...state,
        selectedTranslation: action.payload.translation,
        feedback: isCorrect ? "correct" : "incorrect",
        score: isCorrect ? state.score + 1 : state.score,
        completedWords: newCompletedWords,
      };
    }

    case "RESET_SELECTION": {
      return {
        ...state,
        selectedTranslation: null,
        feedback: null,
        questionCount: state.questionCount + 1,
      };
    }

    default:
      return state;
  }
}

// Action Creators
export const gameActions = {
  refreshCards: (cards: Card[], maxQuestions: number): GameAction => ({
    type: "REFRESH_CARDS",
    payload: { cards, maxQuestions },
  }),

  selectAnswer: (translation: string): GameAction => ({
    type: "SELECT_ANSWER",
    payload: { translation },
  }),

  resetSelection: (): GameAction => ({
    type: "RESET_SELECTION",
  }),
};
