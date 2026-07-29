import PixelBlast from "@/components/PixelBlast";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="relative w-full max-w-full px-4 py-8">
        <div style={{ width: '1080px', height: '1080px', position: 'relative' }}>
          <PixelBlast
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
