interface Card {
  word: string | null;
  translation: string | null;
  translationId: string | null;
}

interface PossibleAnswer {
  translation: string;
  translationId: string;
}

interface GameState {
  currentQuestion: string | null;
  correctAnswer: string | null;
  selectedTranslationId: string | null;
  score: number;
  questionCount: number;
  possibleAnswers: PossibleAnswer[];
  completedWords: PossibleAnswer[];
}

type GameAction =
  | {
      type: "NEXT_QUESTION";
      payload: { cards: Card[]; maxQuestions: number; seed: number };
    }
  | { type: "SELECT_ANSWER"; payload: { translationId: string } };

const initialState: GameState = {
  currentQuestion: null,
  correctAnswer: null,
  selectedTranslationId: null,
  score: 0,
  questionCount: 0,
  completedWords: [],
  possibleAnswers: [],
};

// Create a deterministic random number generator using a linear congruential generator (LCG)
function createRandomFunction(
  seed: number
): (low: number, high: number) => number {
  let state = seed;
  const m = 0x100000000; // 2^32
  const a = 1664525;
  const c = 1013904223;

  // Returns a function that generates a random integer in the range [low, high]
  return function randomInRange(low: number, high: number): number {
    state = (a * state + c) % m;
    const randomFraction = state / m;
    return Math.floor(randomFraction * (high - low + 1)) + low;
  };
}

// Generic function to randomly sort (shuffle) an array using the deterministic random generator
function sortArrayRandomly<T>(arr: T[], seed: number): T[] {
  // Create our deterministic random function using the provided seed
  const rand = createRandomFunction(seed);

  // Map each element to an object that holds a random key and the original value
  const arrWithKeys = arr.map((item) => ({
    key: rand(0, 1000000), // Random key for sorting
    value: item,
  }));

  // Sort the array based on the random key
  arrWithKeys.sort((a, b) => a.key - b.key);

  // Extract the original values in the new order
  return arrWithKeys.map((item) => item.value);
}

export const initialize = (
  cards: Card[],
  score: number,
  questionCount: number,
  seed: number
) => {
  const availableCards = cards;
  const randomIndex = createRandomFunction(seed)(0, availableCards.length - 1);
  const questionCard = availableCards[randomIndex];

  const otherTranslations = cards
    .filter((card) => card.translation !== questionCard.translation)
    .map((card) => ({
      translation: card.translation!,
      translationId: card.translationId!,
    }));

  const allAnswers = [
    {
      translation: questionCard.translation!,
      translationId: questionCard.translationId!,
    },
    ...[...otherTranslations].slice(0, Math.min(3, otherTranslations.length)),
  ];

  return {
    ...initialState,
    currentQuestion: questionCard.word!,
    correctAnswer: questionCard.translationId!,
    possibleAnswers: sortArrayRandomly(allAnswers, seed * randomIndex),
    score,
    questionCount,
  };
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "NEXT_QUESTION": {
      const { cards, maxQuestions, seed } = action.payload;

      let availableCards = cards.filter(
        (card) =>
          !state.completedWords
            .map((cw) => cw.translationId)
            .includes(card.translationId!)
      );

      if (availableCards.length === 0) {
        availableCards = cards;
      }

      if (state.questionCount >= maxQuestions) {
        return state;
      }

      const questionCard = availableCards[seed % availableCards.length];

      const otherTranslations = cards
        .filter((card) => card.translation !== questionCard.translation)
        .map((card) => ({
          translation: card.translation!,
          translationId: card.translationId!,
        }));

      const wrongAnswers = [...otherTranslations].slice(
        0,
        Math.min(3, otherTranslations.length)
      );

      const allAnswers = [
        {
          translation: questionCard.translation!,
          translationId: questionCard.translationId!,
        },
        ...wrongAnswers,
      ].filter((answer) => answer !== null);

      return {
        ...state,
        currentQuestion: questionCard.word!,
        correctAnswer: questionCard.translationId!,
        possibleAnswers: sortArrayRandomly(allAnswers, seed),
        selectedTranslationId: null,
      };
    }

    case "SELECT_ANSWER": {
      const answer = state.possibleAnswers.find(
        (a) => a.translationId === action.payload.translationId
      );
      if (!answer) throw new Error("Answer not found");

      const isCorrect = action.payload.translationId === state.correctAnswer;

      const newCompletedWords = isCorrect
        ? [...state.completedWords, answer!]
        : state.completedWords;

      return {
        ...state,
        score: isCorrect ? state.score + 1 : state.score,
        completedWords: newCompletedWords,
        selectedTranslationId: action.payload.translationId,
        questionCount: state.questionCount + 1,
      };
    }

    default:
      return state;
  }
}

// Action Creators
export const gameActions = {
  nextQuestion: (
    cards: Card[],
    maxQuestions: number,
    seed: number
  ): GameAction => ({
    type: "NEXT_QUESTION",
    payload: { cards, maxQuestions, seed },
  }),

  selectAnswer: (translationId: string): GameAction => ({
    type: "SELECT_ANSWER",
    payload: { translationId },
  }),
};
