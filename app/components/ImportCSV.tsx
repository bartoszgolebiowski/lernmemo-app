import { Form } from '@remix-run/react';
import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react';

type Props = {
    onSubmit: (language: string, file: File, quickGame: boolean) => void;
}

const ImportCSV = (props: Props) => {
    const { onSubmit } = props;
    const [language, setLanguage] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setLanguage(e.target.value);
        setError(null);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'text/csv') {
                setError('Please upload a CSV file');
                return;
            }
            setFile(selectedFile);
            setError(null);
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
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type !== 'text/csv') {
                setError('Please upload a CSV file');
                return;
            }
            setFile(droppedFile);
            setError(null);
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>, quickGame: boolean) => {
        e.preventDefault();

        if (!language) {
            setError('Please select a language');
            return;
        }

        if (!file) {
            setError('Please upload a CSV file');
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
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Import CSV File</h2>

            {/* Using regular form instead of Form from remix since this is handled client-side */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor='csvFile'>
                        Upload CSV File
                    </label>
                    <div
                        role='button'
                        tabIndex={0}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors 
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={openFileDialog}

                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            name="csvFile"
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
                                <span className="font-medium">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">CSV files only</p>
                            {file && (
                                <p className="mt-2 text-sm text-green-600 font-medium">
                                    Selected: {file.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="text-red-500 text-sm mt-1">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    onClick={(e) => {
                        e.preventDefault();
                        if (file && language) handleSubmit(e as unknown as FormEvent<HTMLFormElement>, true);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Import File
                </button>
                <button
                    type="submit"
                    onClick={(e) => {
                        e.preventDefault();
                        if (file && language) handleSubmit(e as unknown as FormEvent<HTMLFormElement>, true);
                    }}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors 
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                    Import File & Quick Flashcards
                </button>
            </Form>
        </div>
    );
};

export default ImportCSV;
