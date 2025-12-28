'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-xl text-gray-600 mb-8">Algo salió mal</p>
        <button
          onClick={reset}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
