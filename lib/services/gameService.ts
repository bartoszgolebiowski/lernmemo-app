import { and, eq, isNull, inArray } from "drizzle-orm";
import { DrizzleDatabase } from "~/db/index";
import {
  flashcardGame,
  flashcardGameAnswer,
  flashcardGameAttachment,
  flashcardGameTranslation,
  flashcardImport,
  flashcardTranslation,
} from "~/db/schema/flashcard";

export class GameService {
  private static ALL_FLASHCARDS = 2137;

  constructor(private db: DrizzleDatabase) {}

  async getUncompletedGames(userId: string) {
    try {
      const games = await this.db
        .select()
        .from(flashcardGame)
        .where(
          and(
            isNull(flashcardGame.completedAt),
            eq(flashcardGame.userId, userId)
          )
        );

      return games;
    } catch (e) {
      console.error("Error fetching game:", e);
      throw new Error("Failed to fetch game");
    }
  }

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
    attachmentIds: string[],
    userId: string,
    flashcards: number
  ) {
    if (attachmentIds.length === 0) {
      throw new Error("At least one attachment ID is required");
    }
    try {
      return await this.db.transaction(async (tx) => {
        // Generate a new gameId and insert the game record without attachment reference

        if (flashcards === GameService.ALL_FLASHCARDS) {
          flashcards = await this.getAttachmentsFlaschardCound(attachmentIds);
        }
        
        const games = await tx
          .insert(flashcardGame)
          .values({
            userId,
            flashcards,
          })
          .returning();

        if (!games.length) {
          throw new Error("Failed to create game");
        }

        const gameId = games[0].gameId;

        // Insert game-attachment relationships for all attachments
        const attachmentInserts = attachmentIds.map((attachmentId) =>
          tx
            .insert(flashcardGameAttachment)
            .values({
              gameId,
              attachmentId,
            })
            .execute()
        );

        await Promise.all(attachmentInserts);

        // Retrieve all translationIds from flashcardImport for all the given attachments.
        const importedTranslations = await tx
          .select({ translationId: flashcardImport.translationId })
          .from(flashcardImport)
          .where(inArray(flashcardImport.attachmentId, attachmentIds));

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
      if (e instanceof Error) {
        throw new Error("Failed to create game", { cause: e });
      }
      throw e;
    }
  }

  // Update recreateGame method to handle multiple attachments
  async recreateGame(gameId: string, userId: string) {
    try {
      return await this.db.transaction(async (tx) => {
        // Find the original game
        const originalGames = await tx
          .select()
          .from(flashcardGame)
          .where(
            and(
              eq(flashcardGame.gameId, gameId),
              eq(flashcardGame.userId, userId)
            )
          );

        if (!originalGames.length) {
          throw new Error("Original game not found");
        }

        const originalGame = originalGames[0];

        // Get all attachments from the original game
        const originalAttachments = await tx
          .select()
          .from(flashcardGameAttachment)
          .where(eq(flashcardGameAttachment.gameId, gameId));

        // Create a new game
        const newGames = await tx
          .insert(flashcardGame)
          .values({
            userId,
            flashcards: originalGame.flashcards,
          })
          .returning();

        if (!newGames.length) {
          throw new Error("Failed to create new game");
        }

        const newGameId = newGames[0].gameId;

        // Add all attachments to the new game
        const attachmentInserts = originalAttachments.map((attachment) =>
          tx
            .insert(flashcardGameAttachment)
            .values({
              gameId: newGameId,
              attachmentId: attachment.attachmentId,
            })
            .execute()
        );

        await Promise.all(attachmentInserts);

        // Get all translations from the original game
        const originalTranslations = await tx
          .select()
          .from(flashcardGameTranslation)
          .where(eq(flashcardGameTranslation.gameId, gameId));

        // Add the same translations to the new game
        const inserts: Promise<unknown>[] = [];
        for (const translation of originalTranslations) {
          inserts.push(
            tx
              .insert(flashcardGameTranslation)
              .values({
                gameId: newGameId,
                translationId: translation.translationId,
              })
              .execute()
          );
        }

        await Promise.all(inserts);

        return { gameId: newGameId };
      });
    } catch (e) {
      console.error("Error recreating game:", e);
      throw new Error("Failed to recreate game");
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

        return (await Promise.all(answerInserts)).flatMap((result) => result);
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

  // New method to count total words (i.e. translation count) for given attachment IDs
  private async getAttachmentsFlaschardCound(
    attachmentIds: string[]
  ): Promise<number> {
    const translationsArrays = await Promise.all(
      attachmentIds.map((id) => this.getTranslationsFromAttachment(id))
    );
    const totalWords = translationsArrays.reduce(
      (sum, translations) => sum + translations.length,
      0
    );
    return totalWords;
  }

  private async getTranslationsFromAttachment(attachmentId: string) {
    return this.db
      .select()
      .from(flashcardImport)
      .leftJoin(
        flashcardTranslation,
        eq(flashcardImport.translationId, flashcardTranslation.translationId)
      )
      .where(eq(flashcardImport.attachmentId, attachmentId));
  }
}

// Factory function to create the service
export function createGameService(db: DrizzleDatabase) {
  return new GameService(db);
}
