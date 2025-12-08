import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-700">
        <Spinner size={28} />
        <span>Dashboard laden...</span>
      </div>
    </div>
  );
}


