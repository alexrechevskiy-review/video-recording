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
    <main className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 w-full flex items-center justify-between gap-4">
        <Button
          onClick={handleBack}
          variant="secondary"
          >
          Record another video
        </Button>
        <Button
          variant="outline"
          onClick={handleHistory}
        >
          Your Submissions
        </Button>
      </div>
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-xl font-medium mb-2">Submission Complete!</h3>
        <p className="text-gray-600 mb-4">Your video has been uploaded successfully and will be reviewed soon.</p>
        <Button
          onClick={handleBack}
          variant="secondary"
        >
          Record another video
        </Button>
      </div>
    </main>
  )
}

export default Thanks