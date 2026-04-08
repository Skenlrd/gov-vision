export default function SkeletonLoader({ rows = 5, height = "h-8" }: { rows?: number; height?: string }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`${height} bg-gray-200 rounded-lg`} />
      ))}
    </div>
  )
}