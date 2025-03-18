import { ImagePreview } from "./ImagePreview";
import { CSVPreview } from "./CSVPreview";

interface AttachmentPreviewProps {
  fileUrl: string;
  fileLocation: string;
  translations: {
    word: string | undefined;
    translation: string | undefined;
  }[]
}

export function AttachmentPreview({ fileUrl, fileLocation, translations }: AttachmentPreviewProps) {
  // Check file type based on extension
  const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileLocation);
  const isCSV = /\.(csv|tsv|txt)$/i.test(fileLocation);

  // Extract filename from fileLocation
  const fileName = fileLocation.split('/').pop() || 'file';

  if (isImage) {
    return <ImagePreview imageUrl={fileUrl} altText={fileName} />;
  } else if (isCSV) {
    return <CSVPreview csvUrl={fileUrl} fileName={fileName} translations={translations} />;
  } else {
    // Default case - just show a generic file icon
    return (
      <div className="w-8 h-10 flex items-center justify-center bg-gray-100 rounded border border-gray-300">
        <span className="text-xs font-bold text-gray-500">FILE</span>
      </div>
    );
  }
}
