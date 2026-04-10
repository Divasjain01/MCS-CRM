import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { isSupabaseConfigured } from "@/config/env";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await sendPasswordReset({ email });
      setSubmitted(true);
      toast("Password reset email sent", {
        description: "Check your inbox for a secure reset link.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send reset email.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-8 shadow-sm"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">M Cube Spaces</h1>
              <p className="text-sm text-muted-foreground">Password reset</p>
            </div>
          </div>

          {!isSupabaseConfigured && (
            <Alert className="mb-6">
              <AlertTitle>Supabase setup required</AlertTitle>
              <AlertDescription>
                Add your Supabase environment variables before using password reset.
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold">Reset your password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your work email and we&apos;ll send a secure reset link.
            </p>
          </div>

          {submitted ? (
            <Alert>
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>
                If an account exists for {email}, a reset link is on the way.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@mcubespaces.com"
                    className="pl-10"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTitle>Reset failed</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isSupabaseConfigured}
              >
                {isSubmitting ? "Sending reset link..." : "Send reset link"}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
