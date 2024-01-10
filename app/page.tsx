import FFmpegClient from "@/components/FFmpegClient";
import NoSSRWrapper from "@/components/NoSSRWrapper";

export default function Home() {
  return (
    <main className="flex flex-col items-center">
      <div className="mt-4 flex items-center">
        <img src="/ffmpeg.wasm.png" alt="ffmpeg.wasm logo" width={64} height={64} className="text-3xl" />
        <p className={`ml-2 font-mono text-3xl font-bold`}>FFmpeg.wasm</p>
      </div>
      <p className="my-4 text-balance text-center">FFmpeg WebAssembly converts files in the browser, locally.</p>
      <NoSSRWrapper>
        <FFmpegClient />
      </NoSSRWrapper>
    </main>
  );
}
