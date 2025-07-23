import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Clock, Brain, FileAudio, Loader2 } from 'lucide-react';

const AudioUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "שגיאה",
        description: "אנא בחר קובץ אודיו בלבד",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create audio element to get duration
    const audioElement = document.createElement('audio');
    audioElement.src = URL.createObjectURL(file);
    
    audioElement.addEventListener('loadedmetadata', () => {
      setAudioDuration(audioElement.duration);
      URL.revokeObjectURL(audioElement.src);
    });

    audioElement.addEventListener('error', () => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לקרוא את קובץ האודיו",
        variant: "destructive",
      });
      URL.revokeObjectURL(audioElement.src);
    });
  };

  const uploadToServer = async (file) => {
    // Simulation function - replace with real implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'File uploaded successfully!' });
      }, 2000);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "שגיאה",
        description: "אנא בחר קובץ אודיו תחילה",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadToServer(selectedFile);
      
      toast({
        title: "הועלה בהצלחה!",
        description: "קובץ האודיו הועלה ויעובד בקרוב",
      });

      // Reset form
      setSelectedFile(null);
      setAudioDuration(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      toast({
        title: "שגיאה בהעלאה",
        description: error.message || "אירעה שגיאה בהעלאת הקובץ",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
            <FileAudio className="h-5 w-5" />
            העלאת קובץ אודיו
          </h2>
          <p className="text-sm text-muted-foreground">
            בחר קובץ אודיו לתמלול אוטומטי
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>

          {selectedFile && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">
                📁 {selectedFile.name}
              </div>
              
              {audioDuration && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>אורך:</span>
                    <span className="font-mono font-medium">
                      {formatDuration(audioDuration)} דקות
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-primary" />
                    <span>הערכת זמן עיבוד:</span>
                    <span className="font-mono font-medium">
                      {calculateProcessingTime(audioDuration)} שניות
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                העלה
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AudioUploader;