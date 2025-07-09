import { useState, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { ENV } from '@/lib/env';

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
  currentImage?: string;
  onRemoveImage?: () => void;
}

export function ImageUploader({ onImageUpload, currentImage, onRemoveImage }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Pinata IPFS using your API keys
      const formData = new FormData();
      formData.append('file', file);

      const PINATA_API_KEY = ENV.PINATA_API_KEY;
      const PINATA_API_SECRET = ENV.PINATA_SECRET;

      if (!PINATA_API_KEY || !PINATA_API_SECRET) {
        throw new Error('Pinata API credentials not found. Please check your environment variables or update client/src/lib/env.ts');
      }

      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET,
        },
      });

      const result = response.data;
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
      onImageUpload(imageUrl);
      
      toast({
        title: 'Image Uploaded',
        description: 'Your image has been uploaded successfully',
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      
      let errorMessage = 'Failed to upload image. Please try again.';
      if (error.message) {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [onImageUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  if (currentImage) {
    return (
      <div className="relative">
        <img
          src={currentImage}
          alt="Campaign"
          className="w-full h-48 object-cover rounded-lg border border-gray-200"
        />
        {onRemoveImage && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={onRemoveImage}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging
          ? 'border-freeflow-500 bg-freeflow-50'
          : 'border-gray-300 hover:border-freeflow-500'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
        name="image-upload"
        disabled={isUploading}
        aria-label="Upload campaign image"
      />
      
      <div className="space-y-2">
        {isUploading ? (
          <Loader2 className="w-12 h-12 text-freeflow-600 mx-auto animate-spin" />
        ) : (
          <Upload className="w-12 h-12 text-gray-400 mx-auto" />
        )}
        
        <div className="text-sm text-gray-600">
          <label
            htmlFor="image-upload"
            className="text-freeflow-600 font-medium hover:text-freeflow-700 cursor-pointer"
          >
            {isUploading ? 'Uploading...' : 'Click to upload'}
          </label>
          <span> or drag and drop</span>
        </div>
        
        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
      </div>
    </div>
  );
}
