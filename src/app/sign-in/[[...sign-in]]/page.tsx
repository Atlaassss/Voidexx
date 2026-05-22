import Link from "next/link";
import { env } from "@/lib/env";

export const metadata = { title: "Sign in // VOIDEXX" };

export default async function SignInPage() {
  if (env.clerk.enabled) {
    const { SignIn } = await import("@clerk/nextjs");
    return (
      <AuthShell title="Identify yourself" sub="// access · operator console">
        <SignIn appearance={CLERK_APPEARANCE} />
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Identify yourself" sub="// access · operator console">
      <DemoNotice intent="sign-in" />
    </AuthShell>
  );
}

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#00ff9d",
    colorBackground: "#0a0a0b",
    colorInputBackground: "#101013",
    colorInputText: "#f4f4f8",
    colorText: "#f4f4f8",
    colorTextSecondary: "#8a8a9e",
    colorDanger: "#ff2e3b",
    borderRadius: "0",
    fontFamily: "var(--font-body)",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0 p-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-void-300 bg-void-100/40 hover:border-signal-cyan/60 text-void-900 font-mono uppercase tracking-widest text-xs",
    formButtonPrimary:
      "bg-signal-green text-void-0 hover:bg-signal-green/90 font-mono uppercase tracking-widest text-xs",
    formFieldInput:
      "border border-void-300/70 bg-void-100/40 text-void-900 focus:border-signal-cyan",
    footer: "hidden",
    dividerLine: "bg-void-300/60",
    dividerText: "text-void-700 font-mono text-[10px] uppercase tracking-widest",
    formFieldLabel: "font-mono text-[10px] uppercase tracking-widest text-void-700",
  },
};

function AuthShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Atmospheric panel */}
      <aside className="relative hidden overflow-hidden border-r border-void-300/60 bg-void-50/40 lg:block">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(800px 400px at 30% 30%, rgba(123,43,255,0.18), transparent 60%), radial-gradient(700px 300px at 80% 80%, rgba(0,229,255,0.14), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 noise" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center bg-signal-green text-void-0 font-mono text-[11px] font-bold">
              VX
            </span>
            <span className="font-display text-xl tracking-widest">VOIDEXX</span>
          </Link>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
              // operator manifest
            </div>
            <h1 className="display-crush mt-3 text-6xl leading-[0.85]">
              Your trades<br />
              failed for<br />
              <span className="text-signal-green">a reason.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-void-700">
              Sign in to upload a chart, get a forensic verdict, and start logging
              the post-mortem your performance deserves.
            </p>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-600">
            v0.1.0 · build #00427 · all systems online
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative grid place-items-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-6 w-6 place-items-center bg-signal-green text-void-0 font-mono text-[10px] font-bold">
                VX
              </span>
              <span className="font-display text-lg tracking-widest">VOIDEXX</span>
            </Link>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
            {sub}
          </div>
          <h2 className="display-crush mt-2 text-4xl">{title}</h2>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}

function DemoNotice({ intent }: { intent: "sign-in" | "sign-up" }) {
  return (
    <div className="space-y-4">
      <div className="border border-signal-amber/40 bg-signal-amber/[0.06] p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-signal-amber">
          Demo mode
        </div>
        <p className="mt-2 text-sm text-void-800">
          Clerk auth is not configured in this environment. The app is running
          with a demo session — every visitor maps to the same{" "}
          <span className="editorial text-signal-cyan">kx.haunter</span> profile.
        </p>
        <p className="mt-2 text-sm text-void-700">
          To enable real auth, set{" "}
          <span className="mono text-void-900">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span>{" "}
          and <span className="mono text-void-900">CLERK_SECRET_KEY</span>.
        </p>
      </div>
      <Link href="/dashboard" className="btn-primary w-full justify-center">
        {intent === "sign-in" ? "Enter command center →" : "Continue to demo →"}
      </Link>
      <Link
        href={intent === "sign-in" ? "/sign-up" : "/sign-in"}
        className="block text-center font-mono text-[10px] uppercase tracking-widest2 text-void-700 hover:text-signal-cyan"
      >
        {intent === "sign-in" ? "No account? Sign up →" : "Already have an account? Sign in →"}
      </Link>
    </div>
  );
}
