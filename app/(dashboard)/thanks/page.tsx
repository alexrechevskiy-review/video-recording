'use client'
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation";

const Thanks = () => {
  const router = useRouter();

  const handleBack = () => {
    router.push("/");
  };

  const handleHistory = () => {
    router.push("/history");
  };
  return (
    <main className="container m-auto p-6 max-w-7xl flex flex-col items-center justify-center min-h-[70vh]">
      <div className="flex flex-col items-center justify-center w-full">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-xl font-medium mb-2 text-center">Submission Complete!</h3>
        <p className="text-gray-600 mb-4 text-center">
          Your video has been uploaded successfully and will be reviewed soon.
        </p>
        <div className="flex gap-4 md:flex-row flex-col justify-center items-center">
          <Button
            variant="outline"
            onClick={handleHistory}
            className="w-48"
          >
            Your Submissions
          </Button>
          <Button
            onClick={handleBack}
            variant="secondary"
            className="w-48"
          >
            Record another video
          </Button>
        </div>
      </div>
    </main>
  )
}

export default Thanks