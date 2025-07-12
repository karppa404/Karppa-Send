import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
export default function Index() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="max-w-xl w-5/6 md:w-full mx-4 h-2/3 md:h-1/2 sm:mx-0 bg-background/50 backdrop-blur-md shadow-background shadow-2xl">
        <CardHeader >

            <h1 className="text-2xl font-bold">Link QR Code</h1>


        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">Hi, this is a place where you can find all of my stuff.</p>
        </CardContent>

      </Card>
    </div>
  );
}