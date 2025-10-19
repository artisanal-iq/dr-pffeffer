import OnboardingClient from "./OnboardingClient";

export default function OnboardingPage() {
  return (
    <main className="py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome aboard</h1>
        <p className="text-muted-foreground mt-2">
          Tell us how you like to work so we can personalize your experience.
        </p>
        <div className="mt-8">
          <OnboardingClient />
        </div>
      </div>
    </main>
  );
}
