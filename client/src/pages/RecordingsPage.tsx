import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, FileText, Loader2, Upload } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

export default function RecordingsPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>();
  const [playingId, setPlayingId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const utils = trpc.useUtils();
  const { data: recordings, isLoading } = trpc.audio.list.useQuery({ clientId: selectedClientId });
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 });
  const clients = clientsData?.data ?? [];

  const uploadMutation = trpc.audio.upload.useMutation({
    onSuccess: (data) => {
      utils.audio.list.invalidate();
      toast.success("Gravação salva com sucesso!");
      // Auto-transcribe
      transcribeMutation.mutate({ recordingId: data.id, audioUrl: data.url });
    },
    onError: () => toast.error("Erro ao salvar gravação"),
  });

  const transcribeMutation = trpc.audio.transcribe.useMutation({
    onSuccess: () => {
      utils.audio.list.invalidate();
      toast.success("Transcrição concluída!");
    },
    onError: () => toast.error("Erro na transcrição"),
  });

  // Waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "rgba(15, 15, 30, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw waveform bars (ZapVoice style)
    const barWidth = 3;
    const gap = 2;
    const bars = Math.floor(canvas.width / (barWidth + gap));
    const step = Math.floor(bufferLength / bars);

    for (let i = 0; i < bars; i++) {
      const value = dataArray[i * step] || 128;
      const normalized = (value - 128) / 128;
      const barHeight = Math.abs(normalized) * canvas.height * 0.8 + 2;

      const x = i * (barWidth + gap);
      const y = (canvas.height - barHeight) / 2;

      // Gradient color based on amplitude
      const intensity = Math.abs(normalized);
      const hue = 250 + intensity * 30;
      ctx.fillStyle = `hsla(${hue}, 80%, ${50 + intensity * 20}%, ${0.6 + intensity * 0.4})`;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1.5);
      ctx.fill();
    }

    // Store amplitude data for static waveform
    const avg = dataArray.reduce((sum, v) => sum + Math.abs(v - 128), 0) / bufferLength;
    setAudioData((prev) => [...prev.slice(-200), avg]);

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioContext.close();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadMutation.mutate({
            audioBase64: base64,
            mimeType: "audio/webm",
            clientId: selectedClientId,
          });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setAudioData([]);

      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      drawWaveform();
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      drawWaveform();
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    setIsPaused(!isPaused);
  };

  const playAudio = (url: string, id: number) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingId === id) { setPlayingId(null); return; }
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(id);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const transcriptionStatusLabels: Record<string, string> = { pending: "Pendente", processing: "Processando...", completed: "Concluída", failed: "Falhou" };
  const transcriptionStatusColors: Record<string, string> = { pending: "bg-amber-500/10 text-amber-400", processing: "bg-blue-500/10 text-blue-400", completed: "bg-emerald-500/10 text-emerald-400", failed: "bg-red-500/10 text-red-400" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gravações de Áudio</h1>
        <p className="text-muted-foreground mt-1">Grave e transcreva conversas com clientes</p>
      </div>

      {/* Recorder */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            {/* Client selector */}
            <div className="w-full max-w-xs">
              <Select value={selectedClientId ? String(selectedClientId) : "none"} onValueChange={(v) => setSelectedClientId(v === "none" ? undefined : parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Vincular a um cliente (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Waveform canvas */}
            <div className="w-full rounded-xl bg-background/50 border overflow-hidden" style={{ height: 120 }}>
              <canvas ref={canvasRef} width={800} height={120} className="w-full h-full" />
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono font-bold tracking-wider">
              {formatTime(recordingTime)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <Button onClick={startRecording} size="lg" className="gap-2 rounded-full px-8" disabled={uploadMutation.isPending}>
                  <Mic className="h-5 w-5" /> Gravar
                </Button>
              ) : (
                <>
                  <Button onClick={togglePause} variant="outline" size="lg" className="rounded-full">
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2 rounded-full px-8">
                    <MicOff className="h-5 w-5" /> Parar
                  </Button>
                </>
              )}
            </div>

            {uploadMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando gravação...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recordings list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gravações Anteriores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : recordings && recordings.length > 0 ? (
            <div className="space-y-3">
              {recordings.map((rec) => (
                <div key={rec.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => playAudio(rec.fileUrl, rec.id)}>
                    {playingId === rec.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rec.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{new Date(rec.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {rec.duration && <span className="text-xs text-muted-foreground">{formatTime(rec.duration)}</span>}
                      <Badge variant="outline" className={`text-xs ${transcriptionStatusColors[rec.transcriptionStatus]}`}>
                        {transcriptionStatusLabels[rec.transcriptionStatus]}
                      </Badge>
                    </div>
                    {rec.transcription && (
                      <div className="mt-2 p-2 rounded bg-accent/50 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1"><FileText className="h-3 w-3" /> Transcrição</div>
                        <p className="line-clamp-3">{rec.transcription}</p>
                      </div>
                    )}
                  </div>
                  {rec.transcriptionStatus === "pending" && (
                    <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => transcribeMutation.mutate({ recordingId: rec.id, audioUrl: rec.fileUrl })} disabled={transcribeMutation.isPending}>
                      <FileText className="h-3.5 w-3.5" /> Transcrever
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma gravação encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
