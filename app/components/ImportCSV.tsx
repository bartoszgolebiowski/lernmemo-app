import { Form } from '@remix-run/react';
import { useState, useRef, DragEvent, ChangeEvent, FormEvent, useEffect } from 'react';

type Props = {
    onSubmit: (language: string, file: File, quickGame: boolean) => void;
}

type FormErrors = {
    language?: string;
    file?: string;
    general?: string;
}

const ImportCSV = (props: Props) => {
    const { onSubmit } = props;
    const [language, setLanguage] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Clear field-specific errors when the field value changes
    useEffect(() => {
        if (language && errors.language) {
            setErrors(prev => ({ ...prev, language: undefined }));
        }
    }, [language, errors.language]);
    
    useEffect(() => {
        if (file && errors.file) {
            setErrors(prev => ({ ...prev, file: undefined }));
        }
    }, [file, errors.file]);

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setLanguage(e.target.value);
        setTouched(prev => ({ ...prev, language: true }));
    };

    const validateFile = (selectedFile: File): boolean => {
        // Basic check for CSV mime type
        if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
            setErrors(prev => ({ 
                ...prev, 
                file: 'Please upload a CSV file (must have .csv extension or text/csv MIME type)' 
            }));
            return false;
        }
        return true;
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setTouched(prev => ({ ...prev, file: true }));
            
            if (validateFile(selectedFile)) {
                setFile(selectedFile);
            }
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
        setTouched(prev => ({ ...prev, file: true }));

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            
            if (validateFile(droppedFile)) {
                setFile(droppedFile);
            }
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        // Check language field
        if (!language) {
            newErrors.language = 'Please select a target language for your flashcards';
            isValid = false;
        }

        // Check file field
        if (!file) {
            newErrors.file = 'Please upload a CSV file containing your vocabulary';
            isValid = false;
        }

        setErrors(newErrors);
        setTouched({ language: true, file: true });
        
        return isValid;
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>, quickGame: boolean) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (onSubmit && file && language) {
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
                    <label 
                        htmlFor="language" 
                        className={`block text-sm font-medium ${errors.language && touched.language ? 'text-red-700' : 'text-gray-700'} mb-1`}
                    >
                        Select Language *
                    </label>
                    <select
                        id="language"
                        name="language"
                        value={language}
                        onChange={handleLanguageChange}
                        className={`w-full px-3 py-2 border ${
                            errors.language && touched.language 
                                ? 'border-red-500 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-blue-500'
                        } rounded-md focus:outline-none focus:ring-2`}
                    >
                        <option value="">Choose a language</option>
                        <option value="german">German</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="italian">Italian</option>
                    </select>
                    {errors.language && touched.language && (
                        <p className="mt-1 text-sm text-red-600">{errors.language}</p>
                    )}
                </div>

                {/* File Upload with Drag & Drop */}
                <div className="mb-4">
                    <label 
                        className={`block text-sm font-medium ${errors.file && touched.file ? 'text-red-700' : 'text-gray-700'} mb-1`} 
                        htmlFor='csvFile'
                    >
                        Upload CSV File *
                    </label>
                    <div
                        role='button'
                        tabIndex={0}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                            isDragging 
                                ? 'border-blue-500 bg-blue-50' 
                                : errors.file && touched.file
                                    ? 'border-red-300 hover:border-red-400' 
                                    : 'border-gray-300 hover:border-gray-400'
                        }`}
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
                                className={`h-12 w-12 ${errors.file && touched.file ? 'text-red-400' : 'text-gray-400'} mb-3`}
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
                    {errors.file && touched.file && (
                        <p className="mt-1 text-sm text-red-600">{errors.file}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                        Your CSV should have two columns: first column with words in your learning language, 
                        second column with translations in your native language.
                    </p>
                </div>

                {/* General Error Message */}
                {errors.general && (
                    <div className="text-red-500 text-sm p-3 bg-red-50 border border-red-200 rounded-md">
                        {errors.general}
                    </div>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col space-y-3">
                    <button
                        type="submit"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSubmit(e as unknown as FormEvent<HTMLFormElement>, false);
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
                    >
                        Import File
                    </button>
                    <button
                        type="submit"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSubmit(e as unknown as FormEvent<HTMLFormElement>, true);
                        }}
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors 
                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300"
                    >
                        Import File & Quick Flashcards
                    </button>
                </div>
            </Form>
        </div>
    );
};

export default ImportCSV;
