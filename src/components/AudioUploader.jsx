import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Clock, Brain, FileAudio, Loader2, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AudioUploader = () => {
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateProcessingTime = (durationInSeconds) => {
    // Every minute = 10 seconds processing time
    const processingSeconds = Math.ceil(durationInSeconds / 6);
    return processingSeconds;
  };

  const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Error",
        description: "Please select an audio file only",
        variant: "destructive",
      });
      return;
    }

    // Create audio element to get duration
    const audioElement = document.createElement('audio');
    audioElement.src = URL.createObjectURL(file);
    
    audioElement.addEventListener('loadedmetadata', async () => {
      const duration = audioElement.duration;
      const tokensRequired = Math.ceil(duration); // 1 token per second
      
      // Check user's current tokens from DB
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('tokens')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching tokens:', error);
            return;
          }
          
          const currentTokens = profile?.tokens || 0;
          
          // Check if user has enough tokens
          if (currentTokens < tokensRequired) {
            toast({
              title: "אין מספיק טוקנים",
              description: (
                <div className="space-y-2">
                  <p>אתה צריך {tokensRequired} טוקנים עבור קובץ אודיו של {Math.ceil(duration)} שניות.</p>
                  <p>כרגע יש לך {currentTokens} טוקנים.</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary underline"
                    onClick={() => window.open('https://your-extension-site.com', '_blank')}
                  >
                    רכוש מנוי עם טוקנים <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ),
              variant: "destructive",
            });
            URL.revokeObjectURL(audioElement.src);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }

          const processingTime = calculateProcessingTime(duration);
          const newUpload = {
            id: generateId(),
            file,
            duration,
            tokensRequired,
            processingTime,
            progress: 0,
            status: 'uploading',
            fileName: file.name,
            startTime: Date.now()
          };
          
          setUploadQueue(prev => [...prev, newUpload]);
          startUpload(newUpload);
          URL.revokeObjectURL(audioElement.src);
          
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to check tokens",
          variant: "destructive",
        });
      }
    });

    audioElement.addEventListener('error', () => {
      toast({
        title: "Error",
        description: "Cannot read the audio file",
        variant: "destructive",
      });
      URL.revokeObjectURL(audioElement.src);
    });
  };

  const uploadToServer = async (file) => {
    const formData = new FormData();
    formData.append('audio_file', file);

    const response = await fetch('http://localhost:8000/transcribe/', {
      method: 'POST',
      body: formData,
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  };

  const startUpload = async (uploadItem) => {
    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => prev.map(item => 
          item.id === uploadItem.id 
            ? { 
                ...item, 
                progress: Math.min(item.progress + (100 / (item.processingTime * 10)), 95) 
              }
            : item
        ));
      }, 100);

      // Upload to server
      const result = await uploadToServer(uploadItem.file);
      
      // Deduct tokens on server side after successful transcription
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        const { data: deductResult, error: deductError } = await supabase.functions.invoke('deduct-tokens', {
          body: { tokensToDeduct: uploadItem.tokensRequired },
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        if (deductError) {
          throw new Error('Failed to deduct tokens: ' + deductError.message);
        }
      }
      
      // Clear progress interval and mark as completed
      clearInterval(progressInterval);
      setUploadQueue(prev => prev.map(item => 
        item.id === uploadItem.id 
          ? { ...item, progress: 100, status: 'completed', result }
          : item
      ));

      toast({
        title: "Transcription completed!",
        description: `${uploadItem.fileName} has been transcribed successfully. ${uploadItem.tokensRequired} tokens used.`,
      });

    } catch (error) {
      setUploadQueue(prev => prev.map(item => 
        item.id === uploadItem.id 
          ? { ...item, status: 'error', error: error.message }
          : item
      ));

      toast({
        title: "Upload error",
        description: error.message || "An error occurred while uploading the file",
        variant: "destructive",
      });
    }
  };

  const removeUpload = (id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Loading Queue - Top Section */}
      {uploadQueue.length > 0 && (
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Processing Queue
          </h3>
          {uploadQueue.map((upload) => (
            <div key={upload.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1 mr-2">📁 {upload.fileName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {upload.status === 'completed' ? 'Done' : `${Math.round(upload.progress)}%`}
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
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="progress-bar h-2"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              {upload.status === 'error' && (
                <p className="text-xs text-destructive">{upload.error}</p>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Upload Section */}
      <Card className="p-8 text-center bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 shadow-lg">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center">
              <FileAudio className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Upload Audio File
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Select an audio file for automatic transcription. Multiple files can be processed simultaneously.
            </p>
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            <div className="relative">
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="cursor-pointer h-12 text-center file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            
            <div className="text-xs text-muted-foreground">
              Supported formats: MP3, WAV, M4A, and more
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AudioUploader;