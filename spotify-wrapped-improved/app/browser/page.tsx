export default function BrowserPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl shadow-black/20">
        <h1 className="text-4xl font-bold mb-4">Browser</h1>
        <p className="text-lg text-white/80">
          This is the page you reach when clicking the globe icon in the header.
          Add your browser content here.
        </p>
      </div>
    </div>
  );
}
