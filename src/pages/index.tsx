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

export default function Index() {
  const [qrData, setQrData] = useState(uuidv4());
  const [inputValue, setInputValue] = useState("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      toast("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      setQrData(text);
    } catch (err) {
      console.error("Failed to paste: ", err);
    }
  };

  interface InputChangeEvent {
    target: { value: string };
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> & InputChangeEvent) => {
    const value: string = e.target.value;
    setInputValue(value);
    setQrData(value);
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
            Link QR Code
          </h1>
        </CardHeader>

        <CardContent className="space-y-6">
          <QRTemplate Data={qrData} />

          <div className="space-y-4">
            {/* Current QR Data Display */}
            <div className="flex items-center space-x-2">
              <Input
                value={qrData}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
              >
                <Copy className="size-4" />
              </Button>
            </div>

            {/* Input Field for New Data */}
            <div className="flex flex-wrap gap-2">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter new QR code data..."
                className="flex-1 min-w-[150px]"
              />
              <Button
                onClick={handlePaste}
                variant="outline"
                size="icon"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
              <Button
                className="bg-green-500"
                onClick={() =>
                  setQrData(inputValue || "qwe7812jh3489qjkw90akj")
                }
                variant="ghost"
              >
                Connect
              </Button>
            </div>
          </div>

          {/* Camera Button */}
          <div className="flex justify-center">
            <Button variant="outline">
              <Camera className="h-4 w-4 mr-2" />
              Open Camera to connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
