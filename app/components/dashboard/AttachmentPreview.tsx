import { ImagePreview } from "./ImagePreview";

interface AttachmentPreviewProps {
  fileUrl: string;
  fileLocation: string;
}

export function AttachmentPreview({ fileUrl, fileLocation }: AttachmentPreviewProps) {
  // Check file type based on extension
  const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileLocation);

  // Extract filename from fileLocation
  const fileName = fileLocation.split('/').pop() || 'file';

  if (isImage) {
    return <ImagePreview imageUrl={fileUrl} altText={fileName} />;
  }
  // Default case - just show a generic file icon
  return (
    <div className="w-8 h-10 flex items-center justify-center bg-gray-100 rounded border border-gray-300">
      <span className="text-xs font-bold text-gray-500">FILE</span>
    </div>
  );

}
