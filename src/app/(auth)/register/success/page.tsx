import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold">Account Created</h1>
        <p className="mb-1 text-muted-foreground">
          Your account has been created successfully!
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          You can now log in with your credentials.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Log In</Link>
        </Button>
      </Card>
    </div>
  );
}
