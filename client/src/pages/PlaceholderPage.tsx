export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA" }} aria-label={title} />
  )
}