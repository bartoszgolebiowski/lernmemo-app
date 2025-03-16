import { Form } from '@remix-run/react';
import { useState, useRef, DragEvent, ChangeEvent, FormEvent, useEffect } from 'react';

type Props = {
    onSubmit: (language: string, file: File, quickGame: boolean) => void;
}

const ImportImage = (props: Props) => {
    const { onSubmit } = props;
    const [language, setLanguage] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isPasting, setIsPasting] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropAreaRef = useRef<HTMLDivElement>(null);

    // Add paste event listener
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            // Check if we have image items in clipboard
            const items = event.clipboardData?.items;

            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        setIsPasting(true);
                        const blob = items[i].getAsFile();
                        if (blob) {
                            // Create a new file with a meaningful name
                            const pastedFile = new File(
                                [blob],
                                `pasted-image-${new Date().toISOString()}.${blob.type.split('/')[1] || 'png'}`,
                                { type: blob.type }
                            );
                            validateAndSetFile(pastedFile);
                        }
                        setIsPasting(false);
                        break;
                    }
                }
            }
        };

        // Add event listener to the document
        document.addEventListener('paste', handlePaste);

        // Clean up
        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, []);

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setLanguage(e.target.value);
        setError(null);
    };

    const validateAndSetFile = (selectedFile: File) => {
        // Check if file is an image type
        if (!selectedFile.type.startsWith('image/')) {
            setError('Please upload an image file (JPEG, PNG, etc)');
            return;
        }

        // Update file state
        setFile(selectedFile);
        setError(null);

        // Clean up previous URL if exists
        if (preview) {
            URL.revokeObjectURL(preview);
        }

        // Create and set image preview
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>, quickGame: boolean) => {
        e.preventDefault();

        if (!language) {
            setError('Please select a language');
            return;
        }

        if (!file) {
            setError('Please upload an image file');
            return;
        }

        if (onSubmit) {
            onSubmit(language, file, quickGame);
        }
    };

    const openFileDialog = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Import Image for Flashcards</h2>

            <Form method="post" className="space-y-6">
                {/* Language Selection */}
                <div className="mb-4">
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Language
                    </label>
                    <select
                        id="language"
                        name="language"
                        value={language}
                        onChange={handleLanguageChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Choose a language</option>
                        <option value="german">German</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="italian">Italian</option>
                    </select>
                </div>

                {/* File Upload with Drag & Drop */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="imageFile">
                        Upload Image File
                    </label>
                    <div className="mt-4 text-xs text-gray-500 mb-4">
                        <p className="mt-1">
                            <strong>Pro tip:</strong> You can paste screenshots directly from your clipboard using Ctrl+V (Cmd+V on Mac).
                        </p>
                    </div>
                    <div
                        ref={dropAreaRef}
                        role="button"
                        tabIndex={0}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors 
                        ${isDragging ? 'border-blue-500 bg-blue-50' : isPasting ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={openFileDialog}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            name="imageFile"
                            className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center">
                            <svg
                                className="h-12 w-12 text-gray-400 mb-3"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 48 48"
                                aria-hidden="true"
                            >
                                <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <p className="mb-1 text-sm text-gray-500">
                                <span className="font-medium">Click to upload</span>, drag and drop, or <span className="font-medium">paste (Ctrl+V)</span>
                            </p>
                            <p className="text-xs text-gray-500">JPEG, PNG, and other image formats</p>
                            {file && !preview && (
                                <p className="mt-2 text-sm text-green-600 font-medium">
                                    Selected: {file.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Image Preview */}
                {preview && (
                    <div className="mb-4">
                        <h3 className="block text-sm font-medium text-gray-700 mb-2">Image Preview</h3>
                        <div className="border border-gray-300 rounded-md p-2 overflow-hidden">
                            <img
                                src={preview}
                                alt="Preview"
                                className="max-w-full h-auto mx-auto max-h-64"
                            />
                            <p className="mt-1 text-xs text-center text-gray-500">
                                {file?.name} ({Math.round((file?.size || 0) / 1024)} KB)
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="text-red-500 text-sm mt-1">
                        {error}
                    </div>
                )}

                {/* Submit Buttons */}
                <div className="space-y-3">
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        disabled={!file || !language}
                        onClick={(e) => {
                            e.preventDefault();
                            if (file && language) handleSubmit(e as unknown as FormEvent<HTMLFormElement>, false);
                        }}
                    >
                        Extract Words
                    </button>
                    <button
                        type="button"
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors 
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        disabled={!file || !language}
                        onClick={(e) => {
                            e.preventDefault();
                            if (file && language) handleSubmit(e as unknown as FormEvent<HTMLFormElement>, true);
                        }}
                    >
                        Extract Words & Quick Flashcards
                    </button>
                </div>

                {/* Instructions */}
                <div className="mt-4 text-xs text-gray-500">
                    <p>
                        For best results, upload clear images with visible text. Our system will extract words
                        that you can turn into flashcards.
                    </p>

                </div>
            </Form>
        </div>
    );
};

export default ImportImage;
