import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { useViewer } from "@/components/ViewerContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROLES = [
  "SDR",
  "Velocity AE",
  "Emerging AE",
  "Majors AE",
  "Strategic AEs",
  "PSM",
  "Renewals",
] as const;

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

export default function RegistrationForm() {
  const { setViewer } = useViewer();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [ascentDay1, setAscentDay1] = useState(getTodayString());
  const { run: registerViewer, loading } = useApi("RegisterViewer");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role || !ascentDay1) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const result = await registerViewer({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: role as typeof ROLES[number],
        ascentDay1,
      });
      if (result?.viewer) {
        setViewer(result.viewer);
        toast.success(result.isNew ? "Welcome! You're all set." : "Welcome back!");
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Registration failed: " + message);
    }
  }, [name, email, role, ascentDay1, registerViewer, setViewer]);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <span className="text-3xl">🏔️</span>
          </div>
          <h2 className="text-2xl font-bold text-primary">Welcome to cAMP Ascent</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your info to begin your training journey through the trails.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@amplitude.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ascentDay1">Day 1 of Ascent</Label>
            <Input
              id="ascentDay1"
              type="date"
              value={ascentDay1}
              onChange={(e) => setAscentDay1(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Defaults to today. Do not click "Start the Ascent" if you are not ready to begin!
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Hitting the trail..." : "Start the Ascent"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
