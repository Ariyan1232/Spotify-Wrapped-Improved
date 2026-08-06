"use client"

import { useSession, signIn, signOut } from "next-auth/react";
import PixelBlast from "@/components/PixelBlast";
import { Dock } from "@/components/unlumen-ui/dock";
import SplitText from "@/components/SplitText";

const items = [
  { icon: "🌐", label: "Browser", href: "/browser" },
  { icon: "📁", label: "Files", href: "/files" },
  { icon: "🎵", label: "Music", href: "/music" },
  { icon: "📷", label: "Photos", href: "/photos" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

const handleAnimationComplete = () => {
  console.log('All letters have animated!');
};

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans">
      <div className="absolute inset-x-0 top-0 z-50 flex justify-center p-4">
        <Dock
          items={items}
          iconSize={48}
          gap={5}
          borderRadius={16}
          className="w-fit bg-black/85 border-black/20 text-white shadow-xl"
        />
      </div>

      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 px-4 text-white">
        <SplitText
          text="Explore Your Music Universe"
          className="text-6xl md:text-7xl font-bold text-center"
          delay={50}
          duration={1.25}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
          onLetterAnimationComplete={handleAnimationComplete}
        />

        {session ? (
          <>
            <p className="text-sm text-white/80">Signed in as {session.user?.email}</p>
            <button
              onClick={() => signOut()}
              className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium hover:bg-white/20 transition"
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("spotify")}
            className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium hover:bg-white/20 transition"
          >
            Sign in with Spotify
          </button>
        )}
      </div>

      <div className="absolute inset-0 z-0">
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
          <PixelBlast
            className="h-full w-full"
            style={{ width: "100%", height: "100%" }}
            variant="square"
            pixelSize={3}
            color="#97cfa6"
            patternScale={2}
            patternDensity={1}
            enableRipples
            rippleSpeed={0.3}
            rippleThickness={0.1}
            rippleIntensityScale={1}
            speed={0.5}
            transparent
            edgeFade={0.5}
          />
        </div>
      </div>
    </div>
  );
}