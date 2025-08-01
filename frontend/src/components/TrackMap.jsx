export default function TrackMap({ event }) {
  if (!event) return null;
  // Use lowercase for file paths if you named your SVGs that way
  const imageUrl = `/tracks/${event.toLowerCase()}.svg`;

  return (
    <div className="mt-4 mb-2 flex justify-center">
      <img src={imageUrl} alt={event + " circuit"} className="h-40 w-auto" />
    </div>
  );
}
