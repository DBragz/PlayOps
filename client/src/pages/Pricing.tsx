import { Link } from "wouter";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="flex max-w-md flex-col items-center gap-5 text-center">
        <Zap className="h-9 w-9 text-primary" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">PlayOps Pro</h1>
          <p className="text-muted-foreground">
            Pro plans and checkout are coming soon. Your plays remain available in the designer.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" />
            Back to designer
          </Link>
        </Button>
      </section>
    </main>
  );
}
