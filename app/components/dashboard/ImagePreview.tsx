import { useState } from "react";
import { ModalDialog } from "./ModalDialog";

interface ImagePreviewProps {
  imageUrl: string;
  altText?: string;
}

export function ImagePreview({ imageUrl, altText = "Image preview" }: ImagePreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Thumbnail preview */}
      <div
        className="w-12 h-12 rounded overflow-hidden cursor-pointer border border-gray-200"
        onClick={() => setIsModalOpen(true)}
      >
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Modal */}
      <ModalDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Image Preview"
        className="max-w-3xl"
      >
        <div className="max-h-[70vh] overflow-auto">
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </ModalDialog>
    </>
  );
}
