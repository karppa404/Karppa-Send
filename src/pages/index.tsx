import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import QRTemplate from "@/components/qr-template";
import { useState } from "react";
import { Copy, Clipboard, Camera } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const [sessionId, setSessionId] = useState(uuidv4());
  const [inputValue, setInputValue] = useState("");
  const navigate = useNavigate();

  const qrData = `${window.location.origin}/connect/${sessionId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success("Session ID copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy session ID");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
    } catch (err) {
      console.error("Failed to paste: ", err);
      toast.error("Failed to paste from clipboard");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleConnect = () => {
    if (inputValue.trim()) {
      navigate(`/connect/${inputValue.trim()}`);
    } else {
      toast.error("Please enter a session ID");
    }
  };

  const handleStartSession = () => {
    navigate(`/connect/${sessionId}`);
  };

  const handleNewSession = () => {
    setSessionId(uuidv4());
    toast.success("New session ID generated");
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-6 sm:p-8">
      <img 
        src="https://w.wallhaven.cc/full/n6/wallhaven-n6doxq.jpg" 
        alt="bg" 
        className="absolute inset-0 -z-10 blur-md w-full h-full object-cover" 
      />
      <Card className="w-full max-w-md flex flex-col bg-background/30 backdrop-blur-2xl shadow-2xl">
        <CardHeader>
          <h1 className="text-2xl font-bold w-full text-center">
            Karppa Send
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Secure file sharing via WebRTC
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <QRTemplate Data={qrData} />

          <div className="space-y-4">
            {/* Current Session ID Display */}
            <div className="flex items-center space-x-2">
              <Input
                value={sessionId}
                readOnly
                className="font-mono text-sm"
                placeholder="Session ID"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                title="Copy Session ID"
              >
                <Copy className="size-4" />
              </Button>
            </div>

            {/* Action Buttons for Current Session */}
            <div className="flex gap-2">
              <Button
                onClick={handleStartSession}
                className="flex-1"
                variant="default"
              >
                Start Session
              </Button>
              <Button
                onClick={handleNewSession}
                variant="outline"
              >
                New
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or join existing session
                </span>
              </div>
            </div>

            {/* Input Field for Joining Session */}
            <div className="flex flex-wrap gap-2">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter session ID..."
                className="flex-1 min-w-[150px]"
              />
              <Button
                onClick={handlePaste}
                variant="outline"
                size="icon"
                title="Paste from clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleConnect}
                variant="secondary"
                disabled={!inputValue.trim()}
              >
                Connect
              </Button>
            </div>
          </div>

          {/* Camera Button */}
          <div className="flex justify-center">
            <Button variant="outline" className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Scan QR Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}