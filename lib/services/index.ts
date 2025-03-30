import { DrizzleDatabase } from "~/db/index";
import { createAttachmentService } from "./attachmentService";
import { createCsvImportService } from "./csvImportService";
import { createFileStorageService } from "./fileStorageService";
import { createFlashcardEditService } from "./flashcardEditService";
import { createGameService } from "./gameService";
import { createGeminiService } from "./imageToCsvService";
import { createLocalFileStorageService } from "./localFileService";
import { createPremiumAccessService } from "./premiumAccessService";
import { createStatisticsService } from "./statisticsService";
import { createSubscriptionService } from "./subscriptionService";
import { createPresignedUrlCache } from "./presignedUrlCache";
import { createStripeService } from "./stripeService";
import { env } from "~/lib/env";
import Stripe from "stripe";

/**
 * Central service provider that creates and manages all application services
 */
export class ServiceProvider {
  private db: DrizzleDatabase;

  // Cache for instantiated services
  private attachmentServiceInstance?: ReturnType<
    typeof createAttachmentService
  >;
  private csvImportServiceInstance?: ReturnType<typeof createCsvImportService>;
  private fileStorageServiceInstance?: ReturnType<
    typeof createFileStorageService
  >;
  private flashcardEditServiceInstance?: ReturnType<
    typeof createFlashcardEditService
  >;
  private gameServiceInstance?: ReturnType<typeof createGameService>;
  private geminiServiceInstance?: ReturnType<typeof createGeminiService>;
  private localFileStorageServiceInstance?: ReturnType<
    typeof createLocalFileStorageService
  >;
  private premiumAccessServiceInstance?: ReturnType<
    typeof createPremiumAccessService
  >;
  private statisticsServiceInstance?: ReturnType<
    typeof createStatisticsService
  >;
  private subscriptionServiceInstance?: ReturnType<
    typeof createSubscriptionService
  >;
  private presignedUrlServiceInstance?: ReturnType<
    typeof createPresignedUrlCache
  >;
  private stripeServiceInstance?: ReturnType<typeof createStripeService>;

  constructor(db: DrizzleDatabase) {
    this.db = db;
  }

  get attachmentService() {
    if (!this.attachmentServiceInstance) {
      this.attachmentServiceInstance = createAttachmentService(this.db);
    }
    return this.attachmentServiceInstance;
  }

  get csvImportService() {
    if (!this.csvImportServiceInstance) {
      this.csvImportServiceInstance = createCsvImportService(this.db);
    }
    return this.csvImportServiceInstance;
  }

  get fileStorageService() {
    if (!this.fileStorageServiceInstance) {
      this.fileStorageServiceInstance = createFileStorageService({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        endpoint: env.R2_ENDPOINT,
        bucketName: env.R2_BUCKET_NAME,
      });
    }
    return this.fileStorageServiceInstance;
  }

  get flashcardEditService() {
    if (!this.flashcardEditServiceInstance) {
      this.flashcardEditServiceInstance = createFlashcardEditService(this.db);
    }
    return this.flashcardEditServiceInstance;
  }

  get gameService() {
    if (!this.gameServiceInstance) {
      this.gameServiceInstance = createGameService(this.db);
    }
    return this.gameServiceInstance;
  }

  get geminiService() {
    if (!this.geminiServiceInstance) {
      this.geminiServiceInstance = createGeminiService();
    }
    return this.geminiServiceInstance;
  }

  get localFileStorageService() {
    if (!this.localFileStorageServiceInstance) {
      this.localFileStorageServiceInstance = createLocalFileStorageService();
    }
    return this.localFileStorageServiceInstance;
  }

  get premiumAccessService() {
    if (!this.premiumAccessServiceInstance) {
      this.premiumAccessServiceInstance = createPremiumAccessService(this.db);
    }
    return this.premiumAccessServiceInstance;
  }

  get statisticsService() {
    if (!this.statisticsServiceInstance) {
      this.statisticsServiceInstance = createStatisticsService(this.db);
    }
    return this.statisticsServiceInstance;
  }

  get subscriptionService() {
    if (!this.subscriptionServiceInstance) {
      this.subscriptionServiceInstance = createSubscriptionService(this.db);
    }
    return this.subscriptionServiceInstance;
  }

  get stripeService() {
    if (!this.stripeServiceInstance) {
      this.stripeServiceInstance = createStripeService(
        this.db,
        new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-02-24.acacia",
          typescript: true,
        })
      );
    }
    return this.stripeServiceInstance;
  }

  get presignedUrlService() {
    if (!this.presignedUrlServiceInstance) {
      this.presignedUrlServiceInstance = createPresignedUrlCache(
        this.fileStorageService
      );
    }
    return this.presignedUrlServiceInstance;
  }
}

// Singleton instance
let serviceProviderInstance: ServiceProvider | null = null;

/**
 * Get the service provider instance
 * This ensures we only create one instance of each service
 */
export function getServiceProvider(db: DrizzleDatabase): ServiceProvider {
  if (!serviceProviderInstance) {
    serviceProviderInstance = new ServiceProvider(db);
  }
  return serviceProviderInstance;
}
