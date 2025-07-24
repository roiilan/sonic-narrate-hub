import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, File, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const AudioUploader = () => {
  const [uploadQueue, setUploadQueue] = useState([]);
  const [insufficientTokensDialog, setInsufficientTokensDialog] = useState({ open: false, message: '', tokens: 0 });
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateProcessingTime = (durationInSeconds) => {
    return Math.ceil(durationInSeconds / 6);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;

    for (const file of files) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|mpeg)$/i)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported audio format. Please upload MP3, WAV, or M4A files.`,
          variant: "destructive",
        });
        continue;
      }

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      try {
        // Add file to upload queue without checking tokens client-side
        const uploadItem = {
          id: Date.now() + Math.random(),
          file,
          status: 'preparing',
          progress: 0,
          duration: formatDuration(0),
          processingTime: 0,
        };

        setUploadQueue(prev => [...prev, uploadItem]);
        
        // Start upload after a brief delay to show the UI update
        setTimeout(() => startUpload(uploadItem), 100);
        
      } catch (error) {
        console.error('Error during file validation:', error);
        toast({
          title: "Error",
          description: "An error occurred while preparing the upload.",
          variant: "destructive",
        });
      }
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startUpload = async (uploadItem) => {
    try {
      // Update status to processing
      setUploadQueue(prev => 
        prev.map(item => 
          item.id === uploadItem.id 
            ? { ...item, status: 'processing', progress: 10 }
            : item
        )
      );

      const startTime = Date.now();
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => 
          prev.map(item => {
            if (item.id === uploadItem.id && item.progress < 90) {
              const newProgress = Math.min(item.progress + Math.random() * 10, 90);
              const elapsedTime = Date.now() - startTime;
              return {
                ...item,
                progress: newProgress,
                processingTime: Math.floor(elapsedTime / 1000)
              };
            }
            return item;
          })
        );
      }, 1000);

      // Convert file to base64 for Edge Function
      const reader = new FileReader();
      const audioData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(uploadItem.file);
      });

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call transcribe edge function
      const { data: result, error } = await supabase.functions.invoke('transcribe', {
        body: { 
          audioData,
          fileName: uploadItem.file.name
        }
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || 'Transcription failed');
      }

      // Check response code
      if (result.code === 2) {
        // Insufficient tokens
        setInsufficientTokensDialog({
          open: true,
          message: result.description,
          tokens: result.tokens
        });

        // Remove from queue
        setUploadQueue(prev => prev.filter(item => item.id !== uploadItem.id));
        return;
      }

      // Update to completed
      setUploadQueue(prev => 
        prev.map(item => 
          item.id === uploadItem.id 
            ? { 
                ...item, 
                status: 'completed', 
                progress: 100,
                result: result.transcript,
                processingTime: Math.floor((Date.now() - startTime) / 1000)
              }
            : item
        )
      );

      toast({
        title: "Upload successful",
        description: `${uploadItem.file.name} has been processed successfully.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Update to error state
      setUploadQueue(prev => 
        prev.map(item => 
          item.id === uploadItem.id 
            ? { ...item, status: 'error', progress: 0 }
            : item
        )
      );

      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload.",
        variant: "destructive",
      });
    }
  };

  const removeUpload = (id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Processing Queue */}
      {uploadQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Processing Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadQueue.map((upload) => (
              <div key={upload.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{upload.file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {upload.status === 'completed' ? 'Done' : 
                       upload.status === 'error' ? 'Error' : 
                       `${Math.round(upload.progress)}%`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(upload.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <Progress value={upload.progress} className="w-full" />
                
                {upload.status === 'processing' && (
                  <div className="text-xs text-muted-foreground">
                    Processing time: {upload.processingTime}s
                  </div>
                )}
                
                {upload.status === 'error' && (
                  <div className="text-xs text-destructive">
                    Upload failed. Please try again.
                  </div>
                )}
                
                {upload.status === 'completed' && upload.result && (
                  <div className="text-xs text-green-600">
                    Transcription completed successfully!
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Audio File</CardTitle>
          <CardDescription>
            Select an audio file for transcription. Supported formats: MP3, WAV, M4A
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              multiple
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <File className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Click to select audio files</div>
              <div className="text-xs text-muted-foreground">
                Or drag and drop audio files here
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={insufficientTokensDialog.open} onOpenChange={(open) => setInsufficientTokensDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Tokens</AlertDialogTitle>
            <AlertDialogDescription>
              {insufficientTokensDialog.message} You have {insufficientTokensDialog.tokens} tokens remaining.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setInsufficientTokensDialog(prev => ({ ...prev, open: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AudioUploader;