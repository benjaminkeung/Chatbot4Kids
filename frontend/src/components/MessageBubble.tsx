interface ImageParagraph {
  text: string
  image_url: string
}

interface Props {
  role: 'user' | 'assistant'
  text: string
  images?: ImageParagraph[]
}

export default function MessageBubble({ role, text, images }: Props) {
  const isKid = role === 'user'

  if (isKid) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-xs lg:max-w-md rounded-2xl px-4 py-3 bg-gray-900 text-white">
          <p className="text-base leading-relaxed">{text}</p>
        </div>
      </div>
    )
  }

  // Assistant: if we have paragraph+image pairs, render each one
  if (images && images.length > 0) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-xl lg:max-w-2xl rounded-2xl px-4 py-3 bg-white border border-gray-100 text-gray-800 space-y-4">
          {images.map((item, i) => (
            <div key={i}>
              <p className="text-base leading-relaxed">{item.text}</p>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={`illustration ${i + 1}`}
                  className="mt-2 rounded-xl w-full object-cover max-h-64"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Fallback: plain text (safe fallback message or loading state)
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-xs lg:max-w-md rounded-2xl px-4 py-3 bg-white border border-gray-100 text-gray-800">
        <p className="text-base leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
