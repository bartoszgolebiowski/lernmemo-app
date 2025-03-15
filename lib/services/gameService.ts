import { and, eq } from "drizzle-orm";
import { DrizzleDatabase } from "~/db/index";
import {
  flashcardGame,
  flashcardGameAnswer,
  flashcardGameTranslation,
  flashcardImport,
  flashcardTranslation,
} from "~/db/schema/flashcard";

export class GameService {
  constructor(private db: DrizzleDatabase) {}

  async getGameById(gameId: string, userId: string) {
    try {
      const games = await this.db
        .select()
        .from(flashcardGame)
        .where(
          and(
            eq(flashcardGame.gameId, gameId),
            eq(flashcardGame.userId, userId)
          )
        );

      if (!games.length) {
        return null;
      }

      return games[0];
    } catch (e) {
      console.error("Error fetching game:", e);
      throw new Error("Failed to fetch game");
    }
  }

  async getTranslationsByGameId(gameId: string) {
    return this.db
      .select({
        translationId: flashcardGameTranslation.translationId,
        word: flashcardTranslation.word,
        translation: flashcardTranslation.translation,
        targetLanguage: flashcardTranslation.targetLanguage,
      })
      .from(flashcardGameTranslation)
      .where(eq(flashcardGameTranslation.gameId, gameId))
      .leftJoin(
        flashcardTranslation,
        eq(
          flashcardGameTranslation.translationId,
          flashcardTranslation.translationId
        )
      );
  }

  async getAnswersByGameId(gameId: string) {
    return this.db
      .select({
        translationId: flashcardGameAnswer.translationId,
        selectedTranslationId: flashcardGameAnswer.selectedTranslationId,
      })
      .from(flashcardGameAnswer)
      .where(eq(flashcardGameAnswer.gameId, gameId));
  }

  async createGame(
    attachmentId: string,
    userId: string,
    flashcards: number,
    questions: number
  ) {
    try {
      return await this.db.transaction(async (tx) => {
        // Generate a new gameId and insert the game record.
        const games = await tx
          .insert(flashcardGame)
          .values({
            userId,
            attachmentId,
            flashcards,
            questions,
            // startAt will use the default CURRENT_TIMESTAMP from the schema
          })
          .returning();

        if (!games.length) {
          throw new Error("Failed to create game");
        }

        const gameId = games[0].gameId;

        // Retrieve all translationIds from flashcardImport for the given attachment.
        const importedTranslations = await tx
          .select({ translationId: flashcardImport.translationId })
          .from(flashcardImport)
          .where(eq(flashcardImport.attachmentId, attachmentId));

        // Choose the first N translationIds where N = flashcards argument.
        const selectedTranslations = importedTranslations.slice(0, flashcards);

        const inserts: Promise<unknown>[] = [];
        // Insert a game translation record for each selected translation.
        for (const rec of selectedTranslations) {
          if (!rec.translationId) {
            throw new Error("Translation ID not found");
          }
          inserts.push(
            tx
              .insert(flashcardGameTranslation)
              .values({
                gameId,
                translationId: rec.translationId,
              })
              .execute()
          );
        }

        await Promise.all(inserts);

        return { gameId };
      });
    } catch (e) {
      console.error(e);
      throw new Error("Failed to create game");
    }
  }

  /**
   * Submit multiple answers and complete the game in a single transaction
   */
  async submitAnswers(
    gameId: string,
    answers: Array<{
      translationId: string;
      selectedTranslationId: string;
    }>
  ) {
    try {
      return await this.db.transaction(async (tx) => {
        // Insert all answers
        const answerInserts = answers.map((answer) =>
          tx
            .insert(flashcardGameAnswer)
            .values({
              gameId,
              translationId: answer.translationId,
              selectedTranslationId: answer.selectedTranslationId,
            })
            .returning()
        );

        await Promise.all(answerInserts);
      });
    } catch (e) {
      console.error("Error submitting answers:", e);
      throw new Error("Failed to submit answers");
    }
  }

  /**
   * Marks a game as completed by updating the completedAt timestamp
   * @param gameId ID of the game to mark as completed
   * @returns The updated game record
   */
  async completeGame(gameId: string) {
    try {
      const updatedGames = await this.db
        .update(flashcardGame)
        .set({ completedAt: new Date().toISOString() })
        .where(eq(flashcardGame.gameId, gameId))
        .returning();

      if (!updatedGames.length) {
        throw new Error("Game not found or could not be completed");
      }

      return { game: updatedGames[0] };
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error("Failed to complete game", { cause: e });
    }
  }
}

// Factory function to create the service
export function createGameService(db: DrizzleDatabase) {
  return new GameService(db);
}
